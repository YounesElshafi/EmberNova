import argparse
import csv
import concurrent.futures as cf
import hashlib
import json
import re
import shutil
import subprocess
import time
import zipfile
from collections import Counter, defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import fitz
from PIL import Image
import requests
from openpyxl import load_workbook
import xlrd

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'DOWNLOAD_MANIFEST.csv'
RESERVE=2_700_000_000
DEFAULT_BUDGET=525_000_000
SIZES={'A':80_000_000,'B':40_000_000,'C':40_000_000,'D':30_000_000}
MEDIA={'mp4','avi','mpg','mov','ts','wmv','mpeg','m4v'}
IMAGES={'jpg','jpeg','png','tif','tiff','bmp','gif'}
DATA={'xlsx','xls','csv','tsv','xml','json','mat','dat','asc','txt'}
DOC={'pdf','doc','docx','rtf','ppt','pptx'}

class Deferred(Exception): pass
class Restricted(Exception): pass

def read_rows():
    with MANIFEST.open(encoding='utf8',newline='') as f:
        return list(csv.DictReader(f))

def write_rows(path, rows, fields):
    tmp=path.with_suffix('.tmp')
    with tmp.open('w',encoding='utf8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    for attempt in range(6):
        try:
            tmp.replace(path)
            break
        except PermissionError:
            if attempt==5:
                raise
            time.sleep(.25*(attempt+1))

def sha(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f,'sha256').hexdigest()

def utc():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')

def verify(path, kind):
    with path.open('rb') as f: header=f.read(512)
    if not header:
        raise ValueError('Empty response')
    if re.match(rb'\s*<(?:!DOCTYPE html|html\b|Error>)',header,re.I):
        raise ValueError('Server returned an HTML or XML error response')
    if kind=='pdf':
        with fitz.open(path,filetype='pdf') as d:
            if not header.startswith(b'%PDF-') or not d.page_count or d.is_repaired: raise ValueError('Invalid or incomplete PDF')
        return 'pdf_structure'
    if kind in {'zip','ziip','xlsx','docx','pptx'}:
        with zipfile.ZipFile(path) as z:
            if sum(x.file_size for x in z.infolist()) < 600_000_000:
                bad=z.testzip()
                if bad: raise ValueError('Bad ZIP member CRC: '+bad)
                return 'zip_member_crc'
        return 'zip_directory'
    if kind in IMAGES:
        with Image.open(path) as im: im.verify()
        return 'image_structure'
    if kind in MEDIA:
        subprocess.run(['ffprobe','-v','error','-show_streams',str(path)],check=True,capture_output=True,timeout=20)
        return 'media_stream_probe'
    if kind=='xls':
        xlrd.open_workbook(path,on_demand=True).release_resources()
        return 'xls_structure'
    return 'http_payload'

def take(row, ceiling):
    path=ROOT/row['relative_local_path']
    known=int(row['source_size_bytes'] or 0)
    path.parent.mkdir(parents=True,exist_ok=True)
    part=path.with_name(path.name+'.part')
    last=''
    for attempt in range(3):
        try:
            if path.exists():
                if known and known!=path.stat().st_size: raise ValueError('Existing file length differs from PSI')
                check=verify(path,row['file_type'])
                break
            if shutil.disk_usage(ROOT).free < RESERVE+ceiling:
                raise Deferred('Free-space reserve reached on C:')
            with requests.Session() as session:
                url=row['source_url']
                if row['provider']=='PSI':
                    r=session.get(url,timeout=(10,18))
                    if r.status_code in (401,403): raise Restricted(f'PSI download endpoint returned HTTP {r.status_code}')
                    r.raise_for_status()
                    url=r.text.strip().strip('"')
                    if urlparse(url).scheme!='https': raise ValueError('PSI did not return an HTTPS download URL')
                offset=part.stat().st_size if part.exists() and known else 0
                headers={'Accept-Encoding':'identity'}
                if offset and offset<known: headers['Range']=f'bytes={offset}-'
                with session.get(url,timeout=(12,20),stream=True,headers=headers) as r:
                    if r.status_code==403 and row['provider']=='PSI':
                        raise ValueError('PSI supplied an object URL that returned HTTP 403 for GET')
                    r.raise_for_status()
                    append=r.status_code==206 and offset and r.headers.get('Content-Range','').startswith(f'bytes {offset}-')
                    if r.status_code==206 and not append: raise ValueError('Unexpected Content-Range')
                    size=int(r.headers.get('Content-Length') or 0)+(offset if append else 0)
                    if size>ceiling: raise Deferred(f'Response requires {size} bytes, above the remaining file allowance')
                    with part.open('ab' if append else 'wb') as f:
                        transferred=offset if append else 0
                        for chunk in r.iter_content(262144):
                            transferred+=len(chunk)
                            if transferred>ceiling: raise Deferred('Response exceeds the remaining file allowance')
                            f.write(chunk)
                if (known and transferred!=known) or (size and transferred!=size):
                    raise ValueError(f'Length mismatch, got {transferred}, expected {known or size}')
                try:
                    check=verify(part,row['file_type'])
                except Exception:
                    part.unlink(missing_ok=True)
                    raise
                part.replace(path)
                break
        except (Deferred, Restricted) as e:
            part.unlink(missing_ok=True)
            return {'download_status':'deferred_size' if isinstance(e,Deferred) else 'access_restricted','error_message':str(e)}
        except (requests.RequestException,ValueError,OSError,RuntimeError,zipfile.BadZipFile,subprocess.SubprocessError,xlrd.XLRDError) as e:
            status=getattr(getattr(e,'response',None),'status_code',0)
            last=(f'HTTP {status} during transfer' if status else f'{type(e).__name__}: {e}')
            last=re.sub(r'https://\S+', '[transient URL omitted]', last)[:400]
            if status==429:
                retry=getattr(e.response,'headers',{}).get('Retry-After','')
                if retry.isdigit() and int(retry)<=60 and attempt<2:
                    time.sleep(int(retry))
                    continue
                part.unlink(missing_ok=True)
                return {'download_status':'failed','error_message':'HTTP 429 rate limit. Retry after the server permits.'}
            if status in (404,410) or attempt==2:
                part.unlink(missing_ok=True)
                return {'download_status':'unavailable' if status in (404,410) else 'failed','error_message':last}
            time.sleep(1.5*(attempt+1))
    return {'download_status':'verified','size_bytes':path.stat().st_size,'downloaded_timestamp':utc(),'sha256':sha(path),
            'verification':check+';sha256'+(';source_size' if known else ''),'error_message':''}

def waves(rows):
    groups=defaultdict(list)
    core={'PSI-25','PSI-26','PSI-68','PSI-69','PSI-98','PSI-99','PSI-100','PSI-101','PSI-102'}
    for row in rows:
        if row['origin_status']!='original' or row['download_status'] not in {'metadata_only','deferred_size','deferred_scope','failed'}:
            continue
        cat=row['source_category'].lower()
        k=row['file_type']
        pid=row['investigation_id']
        p=row['priority']
        size=int(row['source_size_bytes'] or 0)
        if size>SIZES.get(p,30_000_000):
            row.update(download_status='deferred_size',error_message='Object exceeds current per-file storage allocation')
            continue
        if row['provider']!='PSI':
            wave={'A':1,'B':6,'C':8,'D':7}[p]
            rank=0 if pid in {'LUCI','FM2','KC135-PARTIAL-G','GRC-PARTIAL-G'} or row['provider']=='NASA' else 1
        elif 'metadata' in cat or 'experimental table' in cat:
            wave={'A':0,'B':5,'C':8}[p]
            rank=0 if 'metadata' in cat else 1
        elif p=='A' and k in DOC|DATA:
            wave=2
            rank=0 if ('report' in cat or 'analyzed data' in cat) else 1 if 'science' in cat or k in {'csv','xlsx'} else 2 if 'engineering' in cat else 3
        elif p=='A':
            wave=4
            rank=0 if k in IMAGES|MEDIA else 1
        else:
            wave={'B':6,'C':8}[p]
            rank=0 if ('report' in cat or 'science' in cat) else 1 if 'representative' in cat or k in {'csv','xlsx'} else 2 if k in DOC|IMAGES|MEDIA|DATA else 3
        groups[(wave,pid)].append((rank,size,row['filename'],row))
    limits={0:4,1:6,2:10,4:3,5:4,6:5,7:6,8:6}
    for wave in sorted({w for w,p in groups}):
        queues=[deque(item[3] for item in sorted(groups[k],key=lambda x:x[:3])[:limits[wave]]) for k in groups if k[0]==wave]
        while any(queues):
            for queue in queues:
                if queue:
                    yield queue.popleft()
    for wave in (2,4,6,8):
        queues=[deque(item[3] for item in sorted(groups[k],key=lambda x:x[:3])[limits[wave]:limits[wave]+(16 if k[1] in core else 7)]) for k in groups if k[0]==wave]
        while any(queues):
            for queue in queues:
                if queue:
                    yield queue.popleft()

def download(budget,workers,file_ids=()):
    rows=read_rows()
    remaining=budget-sum(int(r['size_bytes'] or 0) for r in rows if r['origin_status']=='original' and r['download_status']=='verified')
    originals={r['file_id']:r for r in rows if r['origin_status']=='original'}
    if set(file_ids)-originals.keys():
        raise SystemExit('Unknown original file IDs: '+', '.join(sorted(set(file_ids)-originals.keys())))
    if file_ids:
        selected=(originals[i] for i in dict.fromkeys(file_ids) if originals[i]['download_status'] not in {'verified','access_restricted'})
    else:
        selected=iter(waves(rows))
    counts=Counter()
    with cf.ThreadPoolExecutor(max_workers=workers) as pool:
        futures={}
        exhausted=False
        reserve=0
        while futures or not exhausted:
            while len(futures)<workers and not exhausted:
                if remaining-reserve<1000:
                    exhausted=True
                    break
                row=next(selected,None)
                if row is None:
                    exhausted=True
                    break
                need=int(row['source_size_bytes'] or 0)
                if need>remaining-reserve:
                    row.update(download_status='deferred_size',error_message='Current corpus byte budget')
                    continue
                allowance=need or min(52_000_000 if file_ids else 18_000_000,remaining-reserve)
                futures[pool.submit(take,row,allowance)]=(row,allowance)
                reserve+=allowance
                time.sleep(.22)
            if not futures: continue
            completed,_=cf.wait(futures,return_when=cf.FIRST_COMPLETED)
            for task in completed:
                row,allowance=futures.pop(task)
                reserve-=allowance
                try:
                    result=task.result()
                except Exception as exc:
                    result={'download_status':'failed','error_message':type(exc).__name__}
                row.update(result)
                remaining-=int(result.get('size_bytes') or 0)
                counts[row['download_status']]+=1
                if row['download_status']!='verified' or sum(counts.values())%15==0:
                    print(sum(counts.values()),dict(counts),'budget remaining',remaining,row['investigation_id'],row['filename'][:80],row['error_message'],flush=True)
                if sum(counts.values())%15==0:
                    write_rows(MANIFEST,rows,list(rows[0]))
    for row in rows:
        if row['download_status']=='metadata_only':
            row.update(download_status='deferred_scope',error_message='Outside the ranked local acquisition selection for this pass')
    write_rows(MANIFEST,rows,list(rows[0]))
    print('Complete',counts, 'remaining',remaining,flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--budget-bytes',type=int,default=DEFAULT_BUDGET)
    p.add_argument('--workers',type=int,default=5,choices=range(1,7))
    p.add_argument('--file-id',action='append',default=[],help='Select a specific original file ID. Repeat to select multiple files.')
    args=p.parse_args()
    download(args.budget_bytes,args.workers,args.file_id)




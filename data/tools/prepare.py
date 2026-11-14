import csv
import hashlib
import io
import json
import re
import subprocess
import shutil
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
from xml.etree import ElementTree

import fitz
import xlrd
from openpyxl import load_workbook
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'DOWNLOAD_MANIFEST.csv'
INDEX=ROOT/'indexes'
INT=re.compile(r'[+-]?\d+\Z')
FLOAT=re.compile(r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\Z')
UNIT=re.compile(r'^(?:cm/s|mm/s|m/s|cm|mm|m|mg/min|mg|kg|ppm|vol\s*%|%\s*by vol|%|s|sec|min|minutes?|atm|mmHg|kPa|Pa|°?C|K|W|mole fraction)$',re.I)
FLAGS=re.compile(r'(?im)^\s*((?:fig(?:ure)?\.?|table)\s+[A-Z]?\d+(?:[.\-]\d+)*(?:[a-z])?)\b')
HEADINGS=re.compile(r'(?im)^\s*(?:(?:\d+(?:\.\d+)*[.\s]+)?(?:abstract|introduction|methods|materials and methods|experimental(?: setup| methods)?|results(?: and discussion)?|discussion|conclusions?|summary|references|appendix(?:\s+[a-z])?))\s*$')
METADATA_CATEGORY='Investigation Metadata Files'

def csv_read(path):
    with path.open(encoding='utf8',newline='') as stream: return list(csv.DictReader(stream))

def csv_write(path, rows, fields):
    tmp=path.with_suffix('.tmp')
    with tmp.open('w',encoding='utf8',newline='') as stream:
        w=csv.DictWriter(stream,fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    tmp.replace(path)

def json_write(path, data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2,default=str)+'\n',encoding='utf8')

def ndjson(path, rows):
    with path.open('w',encoding='utf8',newline='\n') as f:
        for r in rows: f.write(json.dumps(r,ensure_ascii=False,default=str)+'\n')

def decode(data):
    for encoding in ('utf-8-sig','cp1252','latin1'):
        try: return data.decode(encoding),encoding
        except UnicodeDecodeError: continue
    raise ValueError('No usable encoding')

def digest(path):
    with path.open('rb') as f: return hashlib.file_digest(f,'sha256').hexdigest()

def unit(label):
    for u in reversed(re.findall(r'\(([^()]*)\)|;\s*([^;]+)$',label)):
        value=next((x.strip() for x in u if x), '')
        if UNIT.fullmatch(value): return value
    m=re.search(r'%\s*by\s+vol\b',label,re.I)
    return m[0] if m else None

def kind(value):
    if isinstance(value,bool): return 'boolean'
    if isinstance(value,int): return 'integer'
    if isinstance(value,float): return 'numeric'
    if isinstance(value,str):
        token=value.strip()
        if INT.fullmatch(token): return 'integer'
        if FLOAT.fullmatch(token): return 'numeric'
        return 'text'
    return type(value).__name__

def compact_table(table,name,header_assumption,verified_header):
    it=iter(table)
    first=next(it,None)
    if first is None: return dict(name=name,row_count=0,columns=[])
    header=[str(x) if x is not None else '' for x in first]
    types=[Counter() for _ in header]
    blanks=[0 for _ in header]
    sentinels=[Counter() for _ in header]
    rows=ragged=0
    for row in it:
        rows+=1
        ragged+=len(row)!=len(header)
        for i in range(len(header)):
            v=row[i] if i<len(row) else None
            if v is None or isinstance(v,str) and not v.strip(): blanks[i]+=1
            else:
                types[i][kind(v)]+=1
                if isinstance(v,str) and v.strip().lower() in {'na','n/a','nan','null','unknown','-','--'}: sentinels[i][v.strip()]+=1
    cols=[dict(index=i+1,label_original=n,header_unit=unit(n),type_counts=dict(types[i]),blank_count=blanks[i],possible_missing_markers=dict(sentinels[i])) for i,n in enumerate(header)]
    return dict(name=name,header_assumption=header_assumption,header_verified=verified_header,row_count=rows,ragged_row_count=ragged,columns=cols)

def tables(path, extension, row):
    if extension=='dat':
        body,encoding=decode(path.read_bytes())
        lines=[line.strip() for line in body.splitlines() if line.strip()]
        data=[line.split() for line in lines]
        if not data:
            raise ValueError('Empty DAT file')
        header_record=None
        source_title=None
        if len(data)>1 and len(data[0])>1 and all(INT.fullmatch(token) for token in data[0]) and len(data[1])==1:
            header_record=data.pop(0)
        elif len(data)>1 and any(not FLOAT.fullmatch(token) for token in data[0]) and len(data[1])==1:
            source_title=lines[0]
            data.pop(0)
        specials={'-infinity','infinity','+infinity','nan'}
        if not all(len(line)==len(data[0]) and all(FLOAT.fullmatch(token) or token.lower() in specials for token in line) for line in data):
            raise ValueError('Unrecognized DAT numeric record layout')
        header=[f'Column {n+1} (source unlabeled)' for n in range(len(data[0]))]
        if source_title:
            header=[source_title]
        nonfinite=Counter(token for line in data for token in line if token.lower() in specials)
        return {'method':'whitespace numeric tokens','encoding':encoding,'source_header_record':header_record,
                'source_title':source_title,'nonfinite_tokens':dict(nonfinite),
                'sheets':[compact_table([header,*data],path.name,'source layout profiled without a measurement schema',False)]}
    if extension in {'csv','tsv'}:
        body,encoding=decode(path.read_bytes())
        if '\x00' in body: raise ValueError('NUL bytes in purported text table')
        if extension=='tsv': delimiter='\t'
        else:
            try: delimiter=csv.Sniffer().sniff(body[:16000],delimiters=',;\t').delimiter
            except csv.Error: delimiter=','
        stream=io.StringIO(body,newline='')
        explicit='experimental table' in row['source_category'].lower()
        source_rows=csv.reader(stream,delimiter=delimiter)
        return {'method':'csv.reader','encoding':encoding,'delimiter':delimiter,
            'sheets':[compact_table(source_rows,path.name,'first record',explicit)]}
    if extension=='xlsx':
        w=load_workbook(path,read_only=True,data_only=True,keep_links=False)
        try:
            return {'method':'openpyxl cached cell values','sheets':[compact_table(s.iter_rows(values_only=True),s.title,'first worksheet row',False) for s in w.worksheets]}
        finally: w.close()
    w=xlrd.open_workbook(path,on_demand=True)
    try:
        return {'method':'xlrd cell values','sheets':[compact_table((s.row_values(i) for i in range(s.nrows)),s.name,'first worksheet row',False) for s in w.sheets()]}
    finally: w.release_resources()

def extract_pdf(path):
    with fitz.open(path) as pdf:
        toc=defaultdict(list)
        for level,title,page in pdf.get_toc(): toc[page].append(dict(level=level,title=title))
        for i,p in enumerate(pdf,1):
            body=p.get_text(sort=True)
            yield dict(page_number=i,page_label=p.get_label() or None,text=body,
                       headings=toc[i]+[dict(level=None,title=x) for x in HEADINGS.findall(body)],
                       figure_table_references=list(dict.fromkeys(FLAGS.findall(body))),
                       quality='embedded_text' if body.strip() else 'no_embedded_text')

def extract_docx(path):
    ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    with zipfile.ZipFile(path) as z:
        root=ElementTree.fromstring(z.read('word/document.xml'))
        for i,p in enumerate(root.findall('.//w:p',ns),1):
            body=''.join(x.text or '' for x in p.findall('.//w:t',ns))
            if body.strip():
                style=p.find('w:pPr/w:pStyle',ns)
                yield dict(paragraph_number=i,text=body,
                           style=style.get('{'+ns['w']+'}val') if style is not None else None,
                           figure_table_references=list(dict.fromkeys(FLAGS.findall(body))))

def extract_pptx(path):
    ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
    with zipfile.ZipFile(path) as z:
        slides=[(int(m[1]),name) for name in z.namelist() if (m:=re.fullmatch(r'ppt/slides/slide(\d+)\.xml',name))]
        for i,name in sorted(slides):
            root=ElementTree.fromstring(z.read(name))
            body='\n'.join(x.text or '' for x in root.findall('.//a:t',ns))
            yield dict(slide_part_number=i,text=body,figure_table_references=list(dict.fromkeys(FLAGS.findall(body))))

def get_video(path):
    cmd=['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,avg_frame_rate,r_frame_rate,duration:format=duration,format_name','-of','json',str(path)]
    result=subprocess.run(cmd,check=True,capture_output=True,timeout=30)
    value=json.loads(result.stdout)
    return dict(stream=(value.get('streams') or [{}])[0],container=value.get('format',{}))

def origin(row):
    return {k:row[k] for k in ('investigation_id','file_id','filename','relative_local_path','source_url','source_record_url','doi','source_version','file_version','sha256','source_key')}

def derived_row(source,path,kind):
    result=dict.fromkeys(source,'') | {k:source[k] for k in ('investigation_id','related_investigation_ids','source_url','source_record_url','persistent_identifier','doi','source_version','file_version','priority','source_key','source_category','provider')}
    result.update(file_id=source['file_id']+'::'+kind,filename=path.name,relative_local_path=path.relative_to(ROOT).as_posix(),
                  file_type=path.suffix.lstrip('.'),size_bytes=path.stat().st_size,origin_status='processed',
                  download_status='verified',sha256=digest(path),verification='derived_parse;sha256',parent_file_id=source['file_id'])
    return result

def main():
    prior=csv_read(MANIFEST)
    profiles={r['parent_file_id']:r for r in prior if r['origin_status']=='processed' and r['file_id'].endswith('::table_profile')}
    rows=[r for r in prior if r['origin_status']=='original']
    fields=list(rows[0])
    if 'parent_file_id' not in fields: fields.append('parent_file_id')
    derived=[]
    table_index=[]
    media_index=[]
    doc_index=[]
    archive_index=[]
    errors=[]
    captions_path=INDEX/'MEDIA_CAPTIONS.json'
    captions=json.loads(captions_path.read_bytes()) if captions_path.exists() else {}
    originals=[r for r in rows if r['download_status']=='verified']
    hash_groups=defaultdict(list)
    for row in originals:
        path=ROOT/row['relative_local_path']
        kind_=row['file_type']
        parent=path
        while parent.parent!=ROOT and parent.parent.name not in {'investigations','reference_materials','challenge_resources'}:
            parent=parent.parent
        base=parent/'processed' if parent.is_dir() else path.parent/'processed'
        if 'raw' not in path.relative_to(ROOT).parts and 'investigations' not in path.relative_to(ROOT).parts:
            base=ROOT/path.relative_to(ROOT).parts[0]/'processed'
        key=row['file_id']
        o=origin(row)
        hash_groups[row['sha256']].append(o)
        try:
            if kind_ in {'pdf','docx','pptx'}:
                method,parts=(('PyMuPDF embedded text',list(extract_pdf(path))) if kind_=='pdf' else
                              ('OOXML paragraph text',list(extract_docx(path))) if kind_=='docx' else
                              ('OOXML slide text',list(extract_pptx(path))))
                file=base/'text'/(key+'.json')
                json_write(file,{'source':o,'method':method,'limitation':'No OCR or inferred layout. Use the original for figures, tables, visual headings and mathematical typography.','parts':parts})
                derived.append(derived_row(row,file,'text'))
                doc_index.append(o|{'method':method,'parts':len(parts),'empty_parts':sum(not p['text'].strip() for p in parts),'derived_path':file.relative_to(ROOT).as_posix()})
            elif (kind_ in {'csv','tsv','xlsx','xls'} or kind_=='dat' and row['investigation_id']=='PSI-115') and path.stat().st_size<=25_000_000:
                file=base/'tables'/(key+'.json')
                cached=profiles.get(key)
                old=json.loads(file.read_bytes()) if cached and file.exists() and digest(file)==cached['sha256'] else None
                if old and old['source']==o:
                    profile=old['profile']
                else:
                    profile=tables(path,kind_,row)
                    json_write(file,{'source':o,'measurement_conventions':'Header units are literal labels. Blank cells and possible sentinel strings are recorded without imputation. Workbook first rows are provisional headers.','profile':profile})
                derived.append(derived_row(row,file,'table_profile'))
                table_index.append(o|{'profile_path':file.relative_to(ROOT).as_posix(),'sheets':len(profile['sheets']),
                                      'total_profiled_data_rows':sum(s['row_count'] for s in profile['sheets'])})
            elif kind_ in {'jpg','jpeg','png','tif','tiff','gif','bmp'}:
                with Image.open(path) as im: item={'width':im.width,'height':im.height,'mode':im.mode,'image_format':im.format}
                media_index.append(o|{'media_type':'image','test_id':None,'caption':None}|item|captions.get(key,{}))
            elif kind_ in {'mp4','avi','mpg','mov','ts','wmv','mpeg','m4v'}:
                detail=get_video(path)
                item=o|{'media_type':'video','test_id':None,'caption':None}|detail|captions.get(key,{})
                media_index.append(item)
                duration=detail['stream'].get('duration') or detail['container'].get('duration')
                if duration and duration!='N/A' and float(duration)>.2 and path.stat().st_size<45_000_000 and shutil.which('ffmpeg'):
                    at=round(float(duration)*.5,3)
                    preview=base/'media_previews'/(key+'.jpg')
                    preview.parent.mkdir(parents=True,exist_ok=True)
                    result=subprocess.run(['ffmpeg','-v','error','-y','-ss',str(at),'-i',str(path),'-frames:v','1','-vf','scale=min(640\\,iw):-2',str(preview)],capture_output=True,timeout=40)
                    if result.returncode:
                        preview.unlink(missing_ok=True)
                        at=0.0
                        subprocess.run(['ffmpeg','-v','error','-y','-i',str(path),'-frames:v','1','-vf','scale=min(640\\,iw):-2',str(preview)],check=True,capture_output=True,timeout=40)
                    if preview.exists():
                        with Image.open(preview) as image: image.verify()
                        item.update(preview_path=preview.relative_to(ROOT).as_posix(),preview_requested_seconds=at)
                        derived.append(derived_row(row,preview,'video_preview'))
            elif kind_ in {'zip','ziip'}:
                with zipfile.ZipFile(path) as z:
                    members=[dict(archive_member=x.filename,size_bytes=x.file_size,compressed_bytes=x.compress_size,crc32=f'{x.CRC:08x}') for x in z.infolist()]
                    archive_index.append(o|{'member_count':len(members),'members':members})
                    if row['source_category']==METADATA_CATEGORY:
                        for index,x in enumerate(z.infolist(),1):
                            if x.is_dir() or x.file_size>2_000_000 or Path(x.filename).suffix.lower() not in {'.txt','.csv','.tsv','.json','.xml'}: continue
                            data=z.read(x)
                            dest=base/'archive_metadata'/key/f'{index:03}_{re.sub(r"[^a-zA-Z0-9_. -]", "_", Path(x.filename).name)[:125]}'
                            dest.parent.mkdir(parents=True,exist_ok=True)
                            dest.write_bytes(data)
                            derived.append(derived_row(row,dest,f'archive_member_{index}'))
                            members[index-1]['extracted_path']=dest.relative_to(ROOT).as_posix()
            elif kind_ in {'doc','ppt','rtf'}:
                errors.append(o|{'reason':'Legacy binary or RTF text extraction not performed'})
        except Exception as exc:
            errors.append(o|{'reason':f'{type(exc).__name__}: {exc}'})
    for filename,records in [('DOCUMENT_TEXT.jsonl',doc_index),('TABULAR_PROFILES.jsonl',table_index),('LOCAL_MEDIA.jsonl',media_index),('ARCHIVE_MEMBERS.jsonl',archive_index),('DUPLICATE_CONTENT.jsonl',({'sha256':h,'files':g} for h,g in hash_groups.items() if len(g)>1)),('PROCESSING_LIMITATIONS.jsonl',errors)]:
        ndjson(INDEX/filename,records)
    write=rows+derived
    csv_write(MANIFEST,write,fields)
    media_types={'jpg','jpeg','png','tif','tiff','gif','bmp','nef','eps','mp4','avi','mpg','mov','ts','wmv','mpeg','m4v'}
    csv_write(INDEX/'MEDIA_INVENTORY.csv',[r for r in rows if r['file_type'] in media_types],fields)
    deferred=[r for r in rows if r['download_status']!='verified']
    csv_write(INDEX/'DEFERRED_DOWNLOADS.csv',deferred,fields)
    print(dict(originals=len(originals),derived=len(derived),documents=len(doc_index),tables=len(table_index),images=sum(m['media_type']=='image' for m in media_index),videos=sum(m['media_type']=='video' for m in media_index),archives=len(archive_index),processing_limitations=len(errors)))
if __name__=='__main__': main()









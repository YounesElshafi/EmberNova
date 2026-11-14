import csv
import hashlib
import json
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[1]

def read_csv(path):
    with path.open(encoding='utf8',newline='') as f:
        return list(csv.DictReader(f))

def main():
    catalog=read_csv(ROOT/'SOURCE_CATALOG.csv')
    manifest=read_csv(ROOT/'DOWNLOAD_MANIFEST.csv')
    deferred=read_csv(ROOT/'indexes'/'DEFERRED_DOWNLOADS.csv')
    errors=[]
    source_ids={r['source_id'] for r in catalog}
    files={r['file_id']:r for r in manifest}
    if len(files)!=len(manifest):
        errors.append('Duplicate manifest file IDs')
    if len(source_ids)!=len(catalog):
        errors.append('Duplicate catalog source IDs')
    investigations={r['source_id'] for r in catalog if r['source_type'].endswith('_investigation')}
    for row in catalog:
        if row['source_id'] not in investigations: continue
        p=ROOT/row['metadata_path']
        data=json.loads(p.read_bytes())
        if data.get('source_id')!=row['source_id']: errors.append(f'Investigation ID mismatch {p}')
        if data.get('source_type')!=row['source_type']: errors.append(f'Source type mismatch {p}')
    expected=set()
    rows_with_originals=set()
    statuses=Counter()
    file_types=Counter()
    providers=Counter()
    bytes_=0
    processed=0
    paths=set()
    for row in manifest:
        id=row['file_id']
        local=Path(row['relative_local_path'])
        if local.is_absolute() or local.drive or '..' in local.parts:
            errors.append(f'Invalid local path {id}')
            continue
        p=ROOT/local
        relative=local.as_posix().casefold()
        if relative in paths: errors.append(f'Nonunique local path {id}')
        paths.add(relative)
        if row['investigation_id'] not in source_ids: errors.append(f'Missing source ID {id}')
        if urlsplit(row['source_url']).scheme!='https': errors.append(f'Invalid source URL {id}')
        if row['origin_status']=='original':
            statuses[row['download_status']]+=1
        if row['download_status']!='verified':
            if p.is_file(): errors.append(f'Untracked local payload {id}')
            if not row['error_message']: errors.append(f'Missing disposition reason {id}')
            continue
        resolved=p.resolve()
        if not resolved.is_relative_to(ROOT.resolve()): errors.append(f'Path outside data root {id}')
        expected.add(resolved)
        if not p.is_file():
            errors.append(f'Missing local payload {id}')
            continue
        if p.stat().st_size!=int(row['size_bytes'] or 0):
            errors.append(f'Local byte count mismatch {id}')
        if row['source_size_bytes'] and p.stat().st_size!=int(row['source_size_bytes']):
            errors.append(f'Source byte count mismatch {id}')
        with p.open('rb') as f:
            if hashlib.file_digest(f,'sha256').hexdigest()!=row['sha256']: errors.append(f'SHA-256 mismatch {id}')
        if row['origin_status']=='original':
            bytes_+=p.stat().st_size
            file_types[row['file_type']]+=1
            providers[row['provider']]+=1
            rows_with_originals.update({row['investigation_id'],*row['related_investigation_ids'].split(';')} & investigations)
        else:
            processed+=1
            parent=files.get(row['parent_file_id'])
            if not parent or parent['download_status']!='verified' or parent['origin_status']!='original':
                errors.append(f'Missing original for derivative {id}')
    expected_deferred={r['file_id'] for r in manifest if r['origin_status']=='original' and r['download_status']!='verified'}
    if {r['file_id'] for r in deferred}!=expected_deferred:
        errors.append('Deferred index differs from manifest')
    if [r for r in manifest if r['download_status']=='metadata_only']:
        errors.append('Inventory rows lack final disposition')
    for folder in ('investigations','challenge_resources','reference_materials'):
        for p in (ROOT/folder).rglob('*'):
            if p.is_file() and p.resolve() not in expected and p.name not in {'metadata.json','RESOURCE_LINKS.csv'}:
                errors.append(f'Orphan or partial payload {p.relative_to(ROOT)}')
    git=subprocess.run(['git','-C',str(ROOT.parent),'status','--short','--untracked-files=no'],capture_output=True,text=True)
    if git.returncode or git.stdout.strip():
        errors.append(f'Unexpected tracked Git state: {git.stdout.strip() or git.stderr.strip()}')
    report=dict(audited_utc=datetime.now(timezone.utc).isoformat(timespec='seconds'),
        project_root=str(ROOT.parent), catalog_rows=len(catalog), investigations=len(investigations),
        investigations_with_originals=len(rows_with_originals), investigation_ids_with_originals=sorted(rows_with_originals),
        psi_investigations=sum(r['source_type']=='psi_investigation' for r in catalog),
        originals_by_status=dict(statuses), verified_original_bytes=bytes_, verified_original_types=dict(file_types),
        verified_originals_by_provider=dict(providers), verified_derivatives=processed, errors=errors)
    (ROOT/'logs'/'VALIDATION.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
    print(json.dumps(report,indent=2))
    return bool(errors)
if __name__=='__main__': raise SystemExit(main())


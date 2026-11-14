import csv,json,shutil
from collections import Counter,defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def csv_rows(name):
    with (ROOT/name).open(encoding='utf8',newline='') as f:
        return list(csv.DictReader(f))

def jsonl(name):
    return [json.loads(line) for line in (ROOT/'indexes'/name).read_text(encoding='utf8').splitlines() if line]

def main():
    audit=json.loads((ROOT/'logs'/'VALIDATION.json').read_bytes())
    if audit['errors']:
        raise SystemExit('Run tools/audit.py and resolve the reported errors first.')
    catalog=csv_rows('SOURCE_CATALOG.csv')
    manifest=csv_rows('DOWNLOAD_MANIFEST.csv')
    originals=[r for r in manifest if r['origin_status']=='original' and r['download_status']=='verified']
    media=jsonl('LOCAL_MEDIA.jsonl')
    tables=jsonl('TABULAR_PROFILES.jsonl')
    archive_images=sum(Path(m['archive_member']).suffix.lower() in {'.jpg','.jpeg','.png','.tif','.tiff','.gif','.bmp','.nef','.eps'} for a in jsonl('ARCHIVE_MEMBERS.jsonl') for m in a['members'])
    docs=jsonl('DOCUMENT_TEXT.jsonl')
    dupes=jsonl('DUPLICATE_CONTENT.jsonl')
    limits=jsonl('PROCESSING_LIMITATIONS.jsonl')
    by_investigation=defaultdict(Counter)
    for r in originals:
        by_investigation[r['investigation_id']][r['provider']]+=1
    size=audit['verified_original_bytes']
    n_cataloged=sum(int(r['inventoried_bytes'] or 0) for r in catalog if r['source_type']=='psi_investigation')
    psi_count=sum(r['provider']=='PSI' and r['origin_status']=='original' for r in manifest)
    lines=[
        '# Corpus summary','',
        'Snapshot November 13, 2026. See [validation results](logs/VALIDATION.json) and [acquisition notes](logs/ACQUISITION_NOTES.txt).','',
        '| Metric | Count |','| --- | ---: |',
        f"| Investigations discovered | {audit['investigations']} |",
        f"| PSI investigations in scope | {audit['psi_investigations']} |",
        f"| Investigations with at least one verified original or associated report | {audit['investigations_with_originals']} |",
        f"| Unique PSI file records | {psi_count:,} |",
        f"| Total PSI inventory | {n_cataloged:,} bytes ({n_cataloged/1e12:.2f} TB) |",
        f"| Verified downloaded originals | {len(originals):,} |",
        f"| Verified original size | {size:,} bytes ({size/1e6:.1f} MB) |",
        f"| Verified locally generated derivatives | {audit['verified_derivatives']} |",
        f"| Documents indexed for text | {len(docs)} |",
        f"| Tabular files profiled | {len(tables)} |",
        f"| Local images | {sum(r['media_type']=='image' for r in media)} |",
        f"| Local videos | {sum(r['media_type']=='video' for r in media)} |",
        f"| Image members in local archives | {archive_images} |",
        f"| Identical local byte groups | {len(dupes)} |",
        f"| Processing limitations logged | {len(limits)} |",'',
        '## Original file disposition','',
        '| Status | Count |','| --- | ---: |',
    ]
    lines.extend(f'| {key} | {value:,} |' for key,value in Counter(audit['originals_by_status']).most_common())
    lines.extend(['','## Original file types','','| Type | Count |','| --- | ---: |'])
    lines.extend(f'| {key} | {value:,} |' for key,value in Counter(audit['verified_original_types']).most_common())
    lines.extend(['','## Investigation coverage','','[Investigation coverage CSV](indexes/INVESTIGATION_COVERAGE.csv) shows local and listed categories per investigation, including image members in local archives.','','Counts below use the primary association on the file row. Shared publications can also support the secondary investigation listed on the manifest.','','| ID | Investigation | Primary originals |','| --- | --- | ---: |'])
    lines.extend(f"| {r['source_id']} | {r['title'].replace('|','/')} | {sum(by_investigation[r['source_id']].values())} |"
        for r in catalog if r['source_type'].endswith('_investigation'))
    lines.extend(['','## Numerical and visual material','',
        '- The BASS and BASS-II tables preserve source sample and test identifiers. BASS-II includes instrument gas measurements. BASS as-run and planned test matrices are indexed as separate originals where available.',
        '- Saffire experiment tables preserve sample and camera identifiers. Locally acquired Saffire sensor and telemetry files contain experiment readings. Consult the original workbooks for worksheet conventions.',
        '- SAME and SAME-R include experiment-condition tables and selected numerical workbooks. FLEX contains a test-level extinction table. FLEX-2 includes design conditions and radiometer readings where verified.',
        '- ACME, CFI, DAFT/DAFT-2, SPICE, SLICE, and related investigation payloads can be located by their accession and verified file state.',
        '- The media index identifies local experiment and representative images and clips. NASA editorial media can have an edited time scale or a caption/filename mismatch. The source caption and attribution remain part of provenance.',
        '- NTRS publishes LUCI and KC-135 measured results from simulated partial gravity. A standalone LUCI run-data release and a lunar-surface FM² dataset were not located. The KC-135 study includes simulated Martian gravity. See [LUCI results](https://ntrs.nasa.gov/citations/20250010653) and [KC-135 results](https://ntrs.nasa.gov/citations/20010059376).',
        '','## Outstanding acquisition','',
        '- [Deferred downloads](indexes/DEFERRED_DOWNLOADS.csv) preserves the status, listed size, precise file identifier, and stable source route for each nonlocal file. Large raw video, image sequences, instrument streams, and archives account for much of the remaining volume.',
        '- Some PSI legacy objects return HTTP 404 after resolving through the public site. Examples include the BASS final report, selected SAME XML files, and some Saffire I telemetry workbooks. The manifest records the individual affected files.',
        '- The project drive cannot hold the full collection. This pass used storage reserves and a ranked per-investigation selection. NASA handles large selected ZIP requests through email. No email request was submitted. See [PSI download policy](https://science.nasa.gov/uncategorized/new-file-download-process-for-large-requestspsi-new-file-download-process/).',
        '- Saffire IV–VI public reports and media are available. The Glenn payload operations site marks its data and console logs as authorized access. No public PSI accession for these three flights appeared in the search snapshot. See [Glenn Saffire payload operations](https://gipoc.grc.nasa.gov/wp/other-iss/saffire/).',
        '- Raw source objects may appear more than once in a PSI file tree. Inventory de-duplicates matching investigation, file ID, revision, and key, with the original file-tree response retained. Some local files also share a checksum and are documented in the duplicate index.',
        '- Format validation covers structure, readable representative samples, and SHA-256. It does not certify individual scientific measurements. Several workbooks need explicit header and unit mapping, and scanned PDF content needs OCR if required.',
        f'- Available project-drive space at summary generation was {shutil.disk_usage(ROOT).free/1e9:.2f} GB.',''])
    (ROOT/'CORPUS_SUMMARY.md').write_text('\n'.join(lines),encoding='utf8')
if __name__=='__main__': main()


import csv,json
from pathlib import Path
from collections import Counter,defaultdict
ROOT=Path(__file__).resolve().parents[1]

def rows(file):
    with (ROOT/file).open(encoding='utf8',newline='') as stream:
        return list(csv.DictReader(stream))

def category(r):
    extension=r['file_type']
    label=r['source_category'].lower()
    if 'metadata' in label: return 'metadata'
    if extension in {'jpg','jpeg','png','tif','tiff','gif','bmp','nef','eps'}: return 'images'
    if extension in {'mp4','mov','avi','mpg','mpeg','ts','wmv','m4v'}: return 'videos'
    if extension in {'pdf','docx','doc','pptx','ppt','rtf'}: return 'documents'
    if extension in {'zip','ziip','rar','7z','gz'}: return 'archives'
    if 'experimental table' in label: return 'experiment_tables'
    if extension in {'csv','xlsx','xls','tsv','dat','txt','xml','mat','pxp','asc','mdipsug','log'}: return 'data_files'
    return 'other'

def main():
    catalog=rows('SOURCE_CATALOG.csv')
    manifest=[r for r in rows('DOWNLOAD_MANIFEST.csv') if r['origin_status']=='original']
    inventory=defaultdict(Counter)
    local=defaultdict(Counter)
    archive_media=defaultdict(Counter)

    for row in manifest:
        kind=category(row)
        for id in filter(None,{row['investigation_id'],*row['related_investigation_ids'].split(';')}):
            inventory[id][kind]+=1
            if row['download_status']=='verified': local[id][kind]+=1
    with (ROOT/'indexes'/'ARCHIVE_MEMBERS.jsonl').open(encoding='utf8') as stream:
        for line in stream:
            archive=json.loads(line)
            for item in archive['members']:
                ext=Path(item['archive_member']).suffix.lower().lstrip('.')
                kind=category({'file_type':ext,'source_category':''})
                if kind in {'images','videos'}:
                    archive_media[archive['investigation_id']][kind]+=1
    kinds=['documents','experiment_tables','data_files','images','videos','archives','metadata','other']
    output=[]
    for r in catalog:
        if not r['source_type'].endswith('_investigation'): continue
        id=r['source_id']
        counts={f'{label}_{kind}':count[id][kind] for kind in kinds for label,count in [('local',local),('listed',inventory)]}
        missing=[kind for kind in kinds if inventory[id][kind] and not local[id][kind] and not archive_media[id][kind]]
        output.append({'investigation_id':id,'title':r['title'],'priority':r['priority'],**counts,
                       'image_members_in_local_archives':archive_media[id]['images'],
                       'video_members_in_local_archives':archive_media[id]['videos'],
                       'listed_categories_with_no_local_sample':';'.join(missing),
                       'availability_notes':r['availability_notes']})
    with (ROOT/'indexes'/'INVESTIGATION_COVERAGE.csv').open('w',encoding='utf8',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=list(output[0]))
        writer.writeheader()
        writer.writerows(output)
    print('Investigation coverage',len(output),'rows')
    print('Investigations with local standalone and archived media',sum(bool(r['local_images'] or r['local_videos'] or r['image_members_in_local_archives'] or r['video_members_in_local_archives']) for r in output))
if __name__=='__main__': main()


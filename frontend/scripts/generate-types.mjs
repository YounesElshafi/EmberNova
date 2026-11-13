import {compileFromFile} from 'json-schema-to-typescript';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('src/api/generated',{recursive:true});
for(const [file,name] of [['artifact','Artifact'],['evidence','Evidence'],['sse_events','Events']]){
  const types=await compileFromFile(`../docs/architecture/contracts/${file}.schema.json`,{bannerComment:'/* Generated from canonical architecture JSON Schema. Do not edit. SI-assisted build. */'});
  await writeFile(`src/api/generated/${name}.ts`,types);
}

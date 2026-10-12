import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {collect,publicSnapshot} from '../server/collector.mjs';
const exec=promisify(execFile);
const root=new URL('../data/',import.meta.url);await mkdir(root,{recursive:true});
let prior=null;try{prior=JSON.parse(await readFile(new URL('verified-source-data.json',root),'utf8'))}catch{}
const data=await collect({prior,bootstrap:true,fetchText:async url=>{const {stdout}=await exec('curl',['--silent','--show-error','--fail','--location','--max-time','25',url],{maxBuffer:4*1024*1024});return stdout}});
await writeFile(new URL('verified-source-data.json',root),JSON.stringify(data));
const view=publicSnapshot(data);await writeFile(new URL('verified-public-snapshot.json',root),JSON.stringify(view,null,2));
console.log(JSON.stringify({collectedAt:data.collectedAt,documents:data.documents.length,scored:data.documents.filter(d=>d.score!=null).length,coverage:view.coverage,score:view.score,eventDate:view.eventDate,rate:data.rate,calendar:data.calendar,memberScores:view.members.map(m=>({id:m.id,score:m.score,date:m.latestDate})),failures:data.sourceStatus.filter(s=>s.status==='error'),warnings:data.warnings},null,2));

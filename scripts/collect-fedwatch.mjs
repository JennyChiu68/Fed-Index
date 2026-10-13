// Local reproducible collector; production uses the same parser and request flow.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {collectFedWatch} from '../server/fedwatch.mjs';
const exec=promisify(execFile),dir=await fs.mkdtemp(path.join(os.tmpdir(),'fedwatch-public-'));let count=0;
try{
 const snapshot=await collectFedWatch({timeoutMs:90000,meetingLimit:6,fetchImpl:async(url,options)=>{
  const n=count++,headers=path.join(dir,`${n}.headers`),body=path.join(dir,`${n}.html`);
  const args=['--silent','--show-error','--http1.1','--max-time','8','--dump-header',headers,'--output',body];
  for(const [k,v] of Object.entries(options.headers))args.push('--header',`${k}: ${v}`);
  if(options.body){const post=path.join(dir,`${n}.post`);await fs.writeFile(post,options.body);args.push('--data-binary','@'+post)}
  args.push(url);await exec('curl',args,{signal:options.signal});
  const blocks=(await fs.readFile(headers,'utf8')).trim().split(/\r?\n\r?\n/);const block=blocks.filter(b=>/^HTTP\//.test(b)).at(-1);if(!block)throw Error('http_headers_missing');
  const lines=block.split(/\r?\n/),status=Number(lines.shift().split(' ')[1]),h=new Headers();
  for(const l of lines){const i=l.indexOf(':');if(i>0)h.append(l.slice(0,i),l.slice(i+1).trim())}
  return new Response(await fs.readFile(body),{status,headers:h});
 }});
 await fs.writeFile(new URL('../data/verified-fedwatch-snapshot.json',import.meta.url),JSON.stringify(snapshot,null,2)+'\n');
 console.log(JSON.stringify({meetings:(snapshot.meetings||[snapshot]).map(d=>({date:d.meetingDate,cut:d.cut,hold:d.hold,hike:d.hike,asOf:d.asOf})),errors:snapshot.meetingErrors,checkedAt:snapshot.checkedAt,requests:count}));
}finally{await fs.rm(dir,{recursive:true,force:true})}

import seed from '../data/verified-fedwatch-snapshot.json';
import {collectFedWatch,CME_SOURCE} from './fedwatch.mjs';
const TTL=300000;
const REQUEST_VERSION='public-session-2';
let memory=null,inflight=null;
async function load(DB){if(memory)return memory;if(DB){try{const r=await DB.prepare('SELECT data FROM source_cache WHERE key = ?').bind('fedwatch').first();if(r)memory=JSON.parse(r.data)}catch{}}return memory||{data:seed,attemptedAt:null,error:null}}
async function refresh(DB,prior,expectedMeeting){
 const attemptedAt=new Date().toISOString();let next;
 try{next={data:await collectFedWatch({expectedMeeting}),attemptedAt,error:null,requestVersion:REQUEST_VERSION}}
 catch(e){next={...prior,attemptedAt,error:String(e.message).slice(0,100),requestVersion:REQUEST_VERSION}}
 memory=next;
 if(DB)await DB.prepare('INSERT INTO source_cache (key, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at').bind('fedwatch',JSON.stringify(next),attemptedAt).run();
 return next;
}
export async function getFedWatch({DB,ctx,wait=false,expectedMeeting=null}){
 let cached=await load(DB);
 if(cached.requestVersion!==REQUEST_VERSION||!cached.attemptedAt||Date.now()-Date.parse(cached.attemptedAt)>TTL){
  if(!inflight)inflight=refresh(DB,cached,expectedMeeting).finally(()=>{inflight=null});
  if(wait){try{cached=await inflight}catch{}}
  else ctx.waitUntil(inflight.catch(()=>{}));
 }
 const data=cached.data;const usable=data&&data.meetingDate>=new Date().toISOString().slice(0,10)&&(!expectedMeeting||data.meetingDate===expectedMeeting);
 if(!usable)return {source:CME_SOURCE,status:'unavailable',error:cached.error||'cme_meeting_not_current',attemptedAt:cached.attemptedAt,refreshing:Boolean(inflight)};
 return {...data,status:cached.error?'cached':Date.now()-Date.parse(data.asOf)>1800000?'older':'ok',error:cached.error,attemptedAt:cached.attemptedAt,refreshing:Boolean(inflight)};
}

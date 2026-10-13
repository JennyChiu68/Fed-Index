import seed from '../data/verified-fedwatch-snapshot.json';
import {collectFedWatch,CME_SOURCE} from './fedwatch.mjs';
import {selectFedWatchData} from './cache-selection.mjs';
const TTL=300000;
const REQUEST_VERSION='public-six-meetings-3';
let memory=null,inflight=null;
const meetingRows=data=>data?.meetings?.length?data.meetings:data?.meetingDate?[data]:[];
async function load(DB){if(memory)return memory;let cached=null;if(DB){try{const r=await DB.prepare('SELECT data FROM source_cache WHERE key = ?').bind('fedwatch').first();if(r)cached=JSON.parse(r.data)}catch{}}memory=selectFedWatchData(seed,cached);if(DB&&cached&&Date.parse(seed.checkedAt)>Date.parse(cached.data?.checkedAt))await DB.prepare('INSERT INTO source_cache (key, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at').bind('fedwatch',JSON.stringify(memory),memory.attemptedAt).run();return memory;}
async function refresh(DB,prior,expectedMeeting){
 const attemptedAt=new Date().toISOString();let next;
 try{
  const data=await collectFedWatch({expectedMeeting,meetingLimit:6});
  const previous=new Map(meetingRows(prior.data).map(d=>[d.meetingDate,d]));
  const fresh=new Map(data.meetings.map(d=>[d.meetingDate,d]));
  const errors=new Map(data.meetingErrors.map(e=>[e.date,e.error]));
  data.meetings=data.availableMeetings.map(date=>fresh.get(date)||(previous.has(date)?{...previous.get(date),refreshError:errors.get(date)||'cme_meeting_unavailable'}:null)).filter(Boolean);
  next={data,attemptedAt,error:null,requestVersion:REQUEST_VERSION};
 }catch(e){next={...prior,attemptedAt,error:String(e.message).slice(0,100),requestVersion:REQUEST_VERSION}}
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
 const today=new Date().toISOString().slice(0,10);
 const view=d=>{const error=cached.error||d.refreshError||null;return {...d,status:error?'cached':Date.now()-Date.parse(d.asOf)>1800000?'older':'ok',error,attemptedAt:cached.attemptedAt,refreshing:Boolean(inflight)}};
 const meetings=meetingRows(cached.data).filter(d=>d.meetingDate>=today).map(view);
 const availableMeetings=(cached.data?.availableMeetings||meetings.map(d=>d.meetingDate)).filter(date=>date>=today);
 const nearest=meetings[0];
 if(!nearest||expectedMeeting&&nearest.meetingDate!==expectedMeeting)return {source:CME_SOURCE,status:'unavailable',error:cached.error||'cme_meeting_not_current',attemptedAt:cached.attemptedAt,refreshing:Boolean(inflight),meetings:[],availableMeetings:[]};
 return {...nearest,meetings,availableMeetings,meetingErrors:cached.data.meetingErrors||[]};
}

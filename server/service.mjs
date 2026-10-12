import seed from '../data/verified-source-data.json';
import {collect,publicSnapshot} from './collector.mjs';
import {ALLOWED_HOSTS} from './sources.mjs';
import {getFedWatch} from './fedwatch-cache.mjs';
const TTL=5*60*1000;
let memory=null,inflight=null,lastRefreshError=null;
async function officialFetch(url,deadline=Date.now()+23000){
 const u=new URL(url);if(u.protocol!=='https:'||!ALLOWED_HOSTS.has(u.hostname))throw Error('source_not_allowed');
 let lastError;
 for(let attempt=0;attempt<2;attempt++){
  const remaining=deadline-Date.now();if(remaining<500)throw Error('refresh_budget_exhausted');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),Math.min(6500,remaining));
  try{
   const r=await fetch(url,{signal:controller.signal,headers:{'accept':'text/html,application/json,application/rss+xml','user-agent':'FedPulse/1.0 official-public-data research monitor'}});
   if(!r.ok){const error=Error('source_http_'+r.status);if(r.status<500)throw error;lastError=error;}
   else {const content=await r.text();if(content.length>4*1024*1024)throw Error('source_body_too_large');return content;}
  }catch(e){lastError=e;if(String(e.message).startsWith('source_http_4'))throw e;}
  finally{clearTimeout(timer)}
  if(attempt===0)await new Promise(resolve=>setTimeout(resolve,400));
 }
 throw lastError;
}
async function load(DB){if(memory)return memory;if(DB){try{const row=await DB.prepare('SELECT data FROM source_cache WHERE key = ?').bind('official').first();if(row)memory=JSON.parse(row.data)}catch{}}return memory||seed;}
async function refresh(DB,prior){
 const deadline=Date.now()+23000;const data=await collect({fetchText:url=>officialFetch(url,deadline),prior});const snapshot=publicSnapshot(data);
 // Critical identity failures do not become a new valid reading.
 if(data.roster.checkedAt!==data.collectedAt){data.warnings.unshift('官方委员名单本次未通过核验，暂显示最近核实数据。');}
 if(DB){await DB.batch([
  DB.prepare('INSERT INTO source_cache (key, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at').bind('official',JSON.stringify(data),data.collectedAt),
  DB.prepare('INSERT INTO index_observations (date, score, coverage, event_date, method, checked_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(date) DO UPDATE SET score=excluded.score,coverage=excluded.coverage,event_date=excluded.event_date,method=excluded.method,checked_at=excluded.checked_at').bind(data.collectedAt.slice(0,10),snapshot.score,snapshot.coverage.covered,snapshot.eventDate,snapshot.method,data.collectedAt)
 ]);}
 memory=data;lastRefreshError=null;return data;
}
export async function handlePulse(request,env,ctx){
 if(request.method!=='GET')return Response.json({error:'method_not_allowed'},{status:405});
 const DB=env.DB;const prior=await load(DB);const age=Date.now()-Date.parse(prior.collectedAt);let data=prior;
 const waitForSources=new URL(request.url).searchParams.get('wait')==='1';
 const cmeTask=getFedWatch({DB,ctx,wait:waitForSources,expectedMeeting:prior.calendar?.next?.end});
 if(age>TTL){
  if(!inflight)inflight=refresh(DB,prior).catch(e=>{lastRefreshError=String(e.message);throw e}).finally(()=>{inflight=null});
  // Respond from verified stored data while refreshing official sources in the background.
  // First-time callers can explicitly wait, bounded by source timeouts, for deployment validation.
 const wait=waitForSources;
  if(wait){try{data=await inflight}catch(e){data={...prior,warnings:[...(prior.warnings||[]),'本次抓取失败，显示最近已核实数据。'],refreshError:String(e.message)}}}
  else ctx.waitUntil(inflight.catch(()=>{}));
 }
 const snapshot=publicSnapshot(data);snapshot.cacheAgeSeconds=Math.floor((Date.now()-Date.parse(data.collectedAt))/1000);snapshot.refreshing=Boolean(inflight);snapshot.storage=DB?'persistent':'seed_only';snapshot.stale=snapshot.cacheAgeSeconds>1800||Boolean(lastRefreshError);if(lastRefreshError)snapshot.warnings=[...(snapshot.warnings||[]),'最近一次来源核查失败：'+lastRefreshError];
 snapshot.probabilities=await cmeTask;
 // Keep the CME timestamp and failure state independent of the Fed text refresh.
 snapshot.refreshing=snapshot.refreshing||snapshot.probabilities.refreshing;
 return Response.json(snapshot,{headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
}

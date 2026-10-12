import seed from '../data/verified-source-data.json';
import {collect,publicSnapshot} from './collector.mjs';
import {ALLOWED_HOSTS} from './sources.mjs';
const TTL=5*60*1000;
let memory=null,inflight=null,lastRefreshError=null;
async function officialFetch(url){
 const u=new URL(url);if(u.protocol!=='https:'||!ALLOWED_HOSTS.has(u.hostname))throw Error('source_not_allowed');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18000);
 try{const r=await fetch(url,{signal:controller.signal,headers:{'accept':'text/html,application/json,application/rss+xml','user-agent':'FedPulse/1.0 official-public-data research monitor'},cf:{cacheTtl:300,cacheEverything:true}});if(!r.ok)throw Error(`source_http_${r.status}`);const content=await r.text();if(content.length>4*1024*1024)throw Error('source_body_too_large');return content;}finally{clearTimeout(timer)}
}
async function load(DB){if(memory)return memory;if(DB){try{const row=await DB.prepare('SELECT data FROM source_cache WHERE key = ?').bind('official').first();if(row)memory=JSON.parse(row.data)}catch{}}return memory||seed;}
async function refresh(DB,prior){
 const data=await collect({fetchText:officialFetch,prior});const snapshot=publicSnapshot(data);
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
 if(age>TTL){
  if(!inflight)inflight=refresh(DB,prior).catch(e=>{lastRefreshError=String(e.message);throw e}).finally(()=>{inflight=null});
  // Respond from verified stored data while refreshing official sources in the background.
  // First-time callers can explicitly wait, bounded by source timeouts, for deployment validation.
  const wait=new URL(request.url).searchParams.get('wait')==='1';
  if(wait){try{data=await inflight}catch(e){data={...prior,warnings:[...(prior.warnings||[]),'本次抓取失败，显示最近已核实数据。'],refreshError:String(e.message)}}}
  else ctx.waitUntil(inflight.catch(()=>{}));
 }
 const snapshot=publicSnapshot(data);snapshot.cacheAgeSeconds=Math.floor((Date.now()-Date.parse(data.collectedAt))/1000);snapshot.refreshing=Boolean(inflight);snapshot.storage=DB?'persistent':'seed_only';snapshot.stale=snapshot.cacheAgeSeconds>1800||Boolean(lastRefreshError);if(lastRefreshError)snapshot.warnings=[...(snapshot.warnings||[]),'最近一次来源核查失败：'+lastRefreshError];
 return Response.json(snapshot,{headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
}

// Public view embedded by CME FedWatch; no paid API or user credentials.
export const CME_SOURCE='https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html';
export const CME_TOOL='https://cmegroup-tools.quikstrike.net/User/QuikStrikeTools.aspx?company=&company=&companyType=&companyType=&jobRole=&jobRole=&userId=&userId=lwolf&viewitemid=IntegratedFedWatchTool';
const HOST='cmegroup-tools.quikstrike.net';
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const decode=s=>s.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"');
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function dateParts(s){const m=/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(s);const month=m?MONTHS.indexOf(m[2]):-1;if(!m||month<0)throw Error('cme_date_missing');return [+m[3],month,+m[1]]}
function isoDate(s){const [y,m,d]=dateParts(s);const date=new Date(Date.UTC(y,m,d));if(date.getUTCDate()!==d)throw Error('cme_invalid_date');return date.toISOString().slice(0,10)}
function attributes(tag){return Object.fromEntries([...tag.matchAll(/([\w:$-]+)\s*=\s*(["'])(.*?)\2/gs)].map(m=>[m[1].toLowerCase(),decode(m[3])]))}
export function parseMeetingChoices(html,now=new Date()){
 const choices=[];
 for(const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
  const a=attributes(match[1]);if(!/_lvMeetings_/.test(a.id||''))continue;
  const target=/__doPostBack\('([\w$]+)'/.exec(a.href||'')?.[1];
  const label=clean(match[2]),m=/^(\d{1,2})\s+([A-Za-z]{3})\s?(\d{2}|\d{4})$/.exec(label);
  if(!target||!m)throw Error('cme_meeting_control_changed');
  const date=isoDate(`${m[1]} ${m[2]} ${m[3].length===2?'20'+m[3]:m[3]}`);
  if(date>=now.toISOString().slice(0,10))choices.push({date,target});
 }
 if(new Set(choices.map(c=>c.date)).size!==choices.length)throw Error('cme_duplicate_meeting');
 return choices.sort((a,b)=>a.date.localeCompare(b.date));
}
export function meetingPostback(html,pageURL,target){
 if(!/^[\w$]+$/.test(target))throw Error('cme_invalid_control');
 const form=/<form\b[^>]*>/i.exec(html)?.[0],action=form?attributes(form).action:null;
 if(!action)throw Error('cme_form_missing');
 const url=new URL(action,pageURL);if(url.protocol!=='https:'||url.hostname!==HOST)throw Error('cme_redirect_not_allowed');
 const fields=new URLSearchParams();
 for(const tag of html.matchAll(/<input\b[^>]*>/gi)){const a=attributes(tag[0]);if(a.type?.toLowerCase()==='hidden'&&a.name)fields.set(a.name,a.value||'')}
 if(!fields.has('__VIEWSTATE'))throw Error('cme_form_state_missing');
 fields.set('__EVENTTARGET',target);fields.set('__EVENTARGUMENT','');
 return {url:url.href,method:'POST',body:fields.toString(),headers:{'content-type':'application/x-www-form-urlencoded'}};
}
function chicagoTime(date,time){const [y,m,d]=dateParts(date);const [hh,mm,ss]=time.split(':').map(Number);if(hh>23||mm>59||ss>59)throw Error('cme_invalid_time');const civil=Date.UTC(y,m,d,hh,mm,ss);let utc=civil;const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});for(let i=0;i<3;i++){const p=Object.fromEntries(fmt.formatToParts(new Date(utc)).map(x=>[x.type,x.value]));utc+=civil-Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)}return new Date(utc).toISOString()}
export function parseFedWatch(html,{now=new Date(),expectedMeeting=null}={}){
 if(!/IntegratedFedWatchTool/.test(html))throw Error('cme_tool_missing');
 const info=/<th[^>]*>Meeting Date<\/th>[\s\S]*?<\/tr>\s*<tr[^>]*>([\s\S]*?)<\/tr>/i.exec(html);
 const meetingDate=isoDate(clean(/<td\b[^>]*>([\s\S]*?)<\/td>/i.exec(info?.[1]||'')?.[1]||''));
 if(meetingDate<now.toISOString().slice(0,10))throw Error('cme_meeting_expired');
 if(expectedMeeting&&meetingDate!==expectedMeeting)throw Error('cme_fomc_date_mismatch');
 const summary=/<th[^>]*>Ease<\/th>\s*<th[^>]*>No Change<\/th>\s*<th[^>]*>Hike<\/th>\s*<\/tr>\s*<tr[^>]*>([\s\S]*?)<\/tr>/i.exec(html);
 const values=[...(summary?.[1]||'').matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
 if(values.length!==3||values.some(v=>!/^\d+(?:\.\d+)?\s*%$/.test(v)))throw Error('cme_summary_missing');
 const [cut,hold,hike]=values.map(v=>parseFloat(v));
 const marker=html.search(/<th\b[^>]*>Target Rate \(bps\)<\/th>/i);if(marker<0)throw Error('cme_outcomes_missing');
 const table=html.slice(marker,html.indexOf('</table>',marker));const outcomes=[];
 for(const row of table.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[2].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
  const range=/^(\d+)-(\d+)(?:\s+\(Current\))?$/.exec(cells[0]||'');if(!range)continue;
  if(!cells[1])continue; // Never use historical columns when Now is empty.
  if(!/^\d+(?:\.\d+)?%$/.test(cells[1]))throw Error('cme_probability_invalid');
  outcomes.push({lowerBps:+range[1],upperBps:+range[2],probability:parseFloat(cells[1]),current:/\(Current\)/.test(cells[0]),hidden:/\bhide\b/.test(row[1])});
 }
 const current=outcomes.filter(o=>o.current);if(current.length!==1)throw Error('cme_current_range_missing');
 if(new Set(outcomes.map(o=>o.lowerBps)).size!==outcomes.length)throw Error('cme_duplicate_range');
 if(outcomes.some(o=>o.upperBps-o.lowerBps!==25||o.probability<0||o.probability>100))throw Error('cme_range_invalid');
 const total=outcomes.reduce((a,o)=>a+o.probability,0);if(Math.abs(total-100)>.3||Math.abs(cut+hold+hike-100)>.2)throw Error('cme_probability_sum_invalid');
 const sum=fn=>outcomes.filter(fn).reduce((a,o)=>a+o.probability,0);
 if(Math.abs(sum(o=>o.lowerBps<current[0].lowerBps)-cut)>.3||Math.abs(current[0].probability-hold)>.3||Math.abs(sum(o=>o.lowerBps>current[0].lowerBps)-hike)>.3)throw Error('cme_summary_distribution_mismatch');
 const stamp=/Data as of\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(\d{2}:\d{2}:\d{2})\s+CT/.exec(clean(table));if(!stamp)throw Error('cme_timestamp_missing');
 const asOf=chicagoTime(stamp[1],stamp[2]);if(Date.parse(asOf)>now.getTime()+300000)throw Error('cme_future_timestamp');
 return {source:CME_SOURCE,provider:'CME FedWatch',meetingDate,asOf,asOfLabel:`${stamp[1]} ${stamp[2]} CT`,checkedAt:now.toISOString(),currentRange:{lowerBps:current[0].lowerBps,upperBps:current[0].upperBps},cut,hold,hike,outcomes,method:'public_fedwatch_current_table'};
}
export async function collectFedWatch({fetchImpl=fetch,now=new Date(),expectedMeeting=null,timeoutMs=23000,meetingLimit=1}={}){
 const cookies=new Map(),deadline=Date.now()+timeoutMs;
 const get=async(start,options={})=>{
  let url=new URL(start),method=options.method||'GET',body=options.body;
  for(let hop=0;hop<7;hop++){
   if(url.protocol!=='https:'||url.hostname!==HOST)throw Error('cme_redirect_not_allowed');
   const remaining=deadline-Date.now();if(remaining<250)throw Error('cme_fetch_timeout');
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.min(8000,remaining));
   try{
    const r=await fetchImpl(url.href,{method,body,redirect:'manual',signal:controller.signal,referrer:CME_SOURCE,referrerPolicy:'unsafe-url',headers:{accept:'text/html',referer:CME_SOURCE,'user-agent':'FedPulse/1.0 (CME FedWatch public table)',...(options.headers||{}),...(cookies.size?{cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')}:{})}});
    const set=r.headers.getSetCookie?.()||[r.headers.get('set-cookie')||''];
    for(const line of set)for(const cookie of line.split(/,(?=\s*[^;,\s]+=)/)){const pair=cookie.split(';')[0],i=pair.indexOf('=');if(i>0)cookies.set(pair.slice(0,i).trim(),pair.slice(i+1))}
    if(r.status>=300&&r.status<400){const location=r.headers.get('location');if(!location)throw Error('cme_redirect_missing');await r.body?.cancel();url=new URL(location,url);if(r.status===303||method==='POST'&&(r.status===301||r.status===302)){method='GET';body=undefined}if(/\/Error\/ErrorPage\.aspx/i.test(url.pathname)){const message=url.searchParams.get('MSG')||'';throw Error(/referrer/i.test(message)?'cme_denied_referrer':/session/i.test(message)?'cme_denied_session':'cme_access_failed')}continue}
    if(!r.ok)throw Error('cme_http_'+r.status);const html=await r.text();if(html.length>2*1024*1024)throw Error('cme_body_too_large');if(/Access to QuikStrike has been denied|There was a problem loading this content/.test(html))throw Error('cme_access_failed');return {html,url:url.href};
   }finally{clearTimeout(timer)}
  }
  throw Error('cme_redirect_limit');
 };
 const initial=await get(CME_TOOL);let result=initial;
 if(!/Target Rate \(bps\)/.test(initial.html)){
 // The public tool's mobile_redirect() changes the form URL to QuikStrikeView.
 const action=/<form\b[^>]*action=["']([^"']+)/i.exec(initial.html)?.[1];
 if(!action||!action.includes('QuikStrikeTools.aspx'))throw Error('cme_view_structure_changed');
 const view=new URL(decode(action),initial.url);view.pathname=view.pathname.replace('QuikStrikeTools.aspx','QuikStrikeView.aspx');
 result=await get(view.href);
 }
 const nearest=parseFedWatch(result.html,{now,expectedMeeting});
 if(meetingLimit===1)return nearest;
 const choices=parseMeetingChoices(result.html,now).slice(0,Math.min(6,meetingLimit));
 if(!choices.length||choices[0].date!==nearest.meetingDate)throw Error('cme_meeting_list_mismatch');
 const meetings=[nearest],meetingErrors=[];
 // The tool keeps selected dates in session state. Use each returned form in order.
 for(const choice of choices.slice(1)){
  try{const form=meetingPostback(result.html,result.url,choice.target);const selected=await get(form.url,form);const parsed=parseFedWatch(selected.html,{now,expectedMeeting:choice.date});meetings.push(parsed);result=selected}
  catch(e){meetingErrors.push({date:choice.date,error:String(e.message).slice(0,100)})}
 }
 return {...nearest,meetings,availableMeetings:choices.map(c=>c.date),meetingErrors};
}

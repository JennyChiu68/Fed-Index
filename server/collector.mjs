import {MEMBERS,INDEXES,DIRECT,FOMC_URL,CALENDAR_URL,RATE_URL,ALLOWED_HOSTS} from './sources.mjs';
import {scoreText,compose,DAY,dayUTC} from './analysis.mjs';
export function decode(s=''){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&(amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|rdquo|ldquo|ndash|mdash|uuml);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',ndash:'–',mdash:'—',uuml:'ü'}[n]));}
export function text(s=''){return decode(s.replace(/<(script|style|nav|footer|sup)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim()}
export function links(html,base){return [...html.matchAll(/<(?:a|mnt-link)\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:a|mnt-link)>/gi)].map(m=>{try{return {url:new URL(decode(m[1]),base).href.split('#')[0].split('?')[0],title:text(m[2]),at:m.index}}catch{return null}}).filter(Boolean)}
function meta(html,name){const re=new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${name}["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>`,'i');return decode(re.exec(html)?.[1]||'')}
export function extractDate(html,url,hint){
 const metadata=meta(html,'article:published_time')||meta(html,'citation_publication_date')||meta(html,'DC.date')||meta(html,'date')||/"datePublished"\s*:\s*"([^"]+)"/.exec(html)?.[1]||'';
 if(/^20\d\d[-/]\d\d[-/]\d\d/.test(metadata))return metadata.slice(0,10).replaceAll('/','-');
 let m=/(20\d\d)(\d{2})(\d{2})/.exec(new URL(url).pathname);if(m)return `${m[1]}-${m[2]}-${m[3]}`;
 m=/(?:wil|lkl|\/)(\d{2})(\d{2})(\d{2})(?:[a-z]|\D|$)/.exec(new URL(url).pathname);if(m)return `20${m[1]}-${m[2]}-${m[3]}`;
 const main=html.slice(Math.max(0,html.search(/<h1\b|<time\b|class=["'][^"']*date/i)));
 m=/<time\b[^>]*datetime=["'](\d{4}-\d{2}-\d{2})/.exec(main);if(m)return m[1];
 const t=text(main.slice(0,22000));
 let short=/itemprop=["']datePublished["'][^>]*>([^<]+)/i.exec(html)?.[1];
 const sm=/([0-9]{1,2})\s+([A-Za-z]{3})\s+[’']([0-9]{2})/.exec(short||'');
 if(sm){const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];return '20'+sm[3]+'-'+String(months.indexOf(sm[2].toLowerCase())+1).padStart(2,'0')+'-'+sm[1].padStart(2,'0');}
 m=/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan\.?|Feb\.?|Mar\.?|Apr\.?|Jun\.?|Jul\.?|Aug\.?|Sep\.?|Sept\.?|Oct\.?|Nov\.?|Dec\.?)\s+(\d{1,2}),?\s+(20\d\d)\b/i.exec(t);
 if(m){const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];return `${m[3]}-${String(months.indexOf(m[1].slice(0,3).toLowerCase())+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`;}
 m=/\b(\d{1,2})\/(\d{1,2})\/(\d{2}|20\d\d)\b/.exec(t);if(m)return `${m[3].length===2?'20'+m[3]:m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
 return hint||null;
}
export function extractDocument(html,candidate){
 if(!/<html|<!doctype/i.test(html))throw Error('not_html');
 let body=html.replace(/<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const cut=body.search(/<h1\b|<div[^>]*id=["']article|<div[^>]*id=["']content|<main\b/i);if(cut>=0)body=body.slice(cut);
 const footer=body.search(/<footer\b|id=["']back-top|class=["'][^"']*(?:related-content|site-footer|global-footer)/i);if(footer>=0)body=body.slice(0,footer);
 const paragraphs=[...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>text(m[1])).filter(p=>p.length>40&&!/^(?:Share|Last Update|About the Fed|By continuing|Subscribe|The views expressed)/i.test(p));
 const title=text(/<h3\b[^>]*class=['"]title['"][^>]*>([\s\S]*?)<\/h3>/i.exec(html)?.[1]||/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]||candidate.title||meta(html,'og:title'));
 const date=extractDate(html,candidate.url,candidate.date);
 if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date)))throw Error('publication_date_missing');
 const m=MEMBERS.find(m=>m.id===candidate.member)||MEMBERS.find(m=>m.bank===candidate.bank&&new RegExp(`\\b${m.id}\\b`,'i').test(paragraphs.slice(0,3).join(' ')+' '+text(body.slice(0,6000))+' '+title));
 if(!m)throw Error('official_author_unverified');
 if(m.bank!=='board'&&!new RegExp('\\b'+m.id+'\\b','i').test(text(body.slice(0,55000))+' '+meta(html,'citation_author')+' '+meta(html,'author')))throw Error('official_author_unverified');
 if(paragraphs.join(' ').length<300)throw Error('transcript_unavailable');
 const analysis=scoreText(paragraphs);
 return {id:candidate.url,url:candidate.url,member:m.id,bank:m.bank,date,title,sourceHost:new URL(candidate.url).hostname,paragraphs,...analysis};
}
export function discover(html,source,year,now){
 const pattern=new RegExp(source.pattern.replaceAll('YEAR',String(year)),'i');const limit=dayUTC(new Date(now-180*DAY));
 const found=links(html,source.url.replace('YEAR',year)).filter(l=>pattern.test(new URL(l.url).pathname)&&!l.url.endsWith('.pdf'));
 const out=[];
 for(const l of found){
  let member=source.id==='board'?MEMBERS.find(m=>new URL(l.url).pathname.includes('/'+m.id)):MEMBERS.find(m=>m.bank===source.id);
  if(!member)continue;
  if(source.id==='minneapolis'&&!/kashkari|dissent|qa|q-and-a/i.test(l.url+' '+l.title))continue;
  if(source.id==='philadelphia'&&/\/(?:monetary-policy|speeches-anna-paulson)\/?$/.test(l.url))continue;
  const context=html.slice(Math.max(0,l.at-400),l.at+3500);
  const date=extractDate(context,l.url,null);
  if(date&&date<limit)continue;
  if(date&&date>dayUTC(now))continue;
  out.push({...l,member:member.id,bank:source.id,date});
 }
 if(source.id==='atlanta'){
  for(const match of html.matchAll(/var feed_[^=]+\s*=\s*(\[[\s\S]*?\]);/g)){
   try{for(const item of JSON.parse(match[1])){const url=item.Url||item.URL||item.Link||item.ItemUrl||item.PageUrl;const date=item.Date?.slice(0,10);if(url&&date>=limit&&date<=dayUTC(now))out.push({url:new URL(url,source.url).href,title:item.Title,member:'venable',bank:'atlanta',date})}}catch{}
  }
 }
 return [...new Map(out.map(x=>[x.url,x])).values()].slice(0,source.id==='board'?45:12);
}
export function parseRoster(html,now){
 const section=/((?:20\d\d) Committee Members)[\s\S]*?(?=Alternate Members)/i.exec(text(html));
 if(!section)throw Error('fomc_roster_structure_changed');
 const year=Number(section[1].slice(0,4));if(year!==now.getUTCFullYear())throw Error('fomc_roster_year_mismatch');
 const voters=MEMBERS.filter(m=>new RegExp(`\\b${m.id}\\b`,'i').test(section[0])).map(m=>m.id);
 if(voters.length!==12)throw Error('fomc_voter_count_not_12');
 const members=MEMBERS.map(m=>({...m,voter:voters.includes(m.id),identitySource:m.bank==='board'?`https://www.federalreserve.gov/aboutthefed/bios/board/${m.id}.htm`:INDEXES.find(s=>s.id===m.bank).url,identityVerifiedAt:now.toISOString()}));
 return {year,members,source:FOMC_URL,checkedAt:now.toISOString()};
}
export function parsePolicy(html,url){const paragraphs=[...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>text(m[1])).filter(p=>/Committee|Voting|federal funds/.test(p));return {url,date:extractDate(html,url),title:'FOMC 政策声明',excerpt:paragraphs.find(p=>/target range/.test(p))?.split(/\s+/).slice(0,22).join(' ')+'…',summary:paragraphs.find(p=>/target range/.test(p))||'',voteText:paragraphs.find(p=>/Voting for/.test(p))||''};}
export function parseCalendar(html,now){
 const year=now.getUTCFullYear();const section=html.slice(html.indexOf(`${year} FOMC Meetings`));
 const data=section.slice(0,section.indexOf(`${year-1} FOMC Meetings`)>0?section.indexOf(`${year-1} FOMC Meetings`):undefined);
 const textValue=text(data);const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const meetings=[];for(const m of textValue.matchAll(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*[-–]\s*(\d{1,2})/g)){const month=String(months.indexOf(m[1])+1).padStart(2,'0');meetings.push({start:`${year}-${month}-${m[2].padStart(2,'0')}`,end:`${year}-${month}-${m[3].padStart(2,'0')}`})}
 return {source:CALENDAR_URL,next:meetings.find(m=>m.end>=dayUTC(now))||null,meetings};
}
async function parallel(items,fn,limit=6){const values=Array(items.length);let i=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{for(;;){const n=i++;if(n>=items.length)return;values[n]=await fn(items[n],n)}}));return values}
export async function collect({fetchText,prior=null,now=new Date(),bootstrap=false}){
 const warnings=[],statuses=[];
 const safe=async(url,id)=>{try{const result=await fetchText(url);statuses.push({id,url,status:'ok',checkedAt:now.toISOString()});return result}catch(e){statuses.push({id,url,status:'error',checkedAt:now.toISOString(),error:String(e.message).slice(0,100)});return null}};
 const year=now.getUTCFullYear();
 const entries=INDEXES.map(s=>({...s,url:s.url.replace('YEAR',year)}));
 const [fomcHtml,calendarHtml,rateRaw]=await Promise.all([safe(FOMC_URL,'fomc'),safe(CALENDAR_URL,'calendar'),safe(RATE_URL,'effr')]);
 const results=await parallel(entries,async s=>({source:s,html:await safe(s.url,s.id)}));
 let roster;try{if(fomcHtml)roster=parseRoster(fomcHtml,now)}catch(e){warnings.push(e.message)}
 if(!roster)throw Error('official_roster_unavailable_or_changed');
 const documents=new Map((prior?.documents||[]).filter(d=>Date.parse(d.date)>=now-180*DAY).map(d=>[d.url,{...d,...scoreText(d.paragraphs)}]));
 let candidates=results.flatMap(({source,html})=>html?discover(html,source,year,now):[]).concat(DIRECT.filter(d=>d.date>=dayUTC(new Date(now-180*DAY))));
 candidates=[...new Map(candidates.map(x=>[x.url,x])).values()].filter(d=>ALLOWED_HOSTS.has(new URL(d.url).hostname));
 // Re-read newest documents for source corrections. Older verified documents are immutable until explicit backfill.
 const newOnes=candidates.filter(d=>!documents.has(d.url)||Date.parse(documents.get(d.url).date)>now-14*DAY);
 await parallel(newOnes,async candidate=>{const html=await safe(candidate.url,'document');if(!html)return;try{const doc=extractDocument(html,candidate);if(doc.date>dayUTC(now))throw Error('future_document');if(Date.parse(doc.date)<now-180*DAY)return;documents.set(doc.url,{...doc,fetchedAt:now.toISOString()})}catch(e){warnings.push(`${candidate.url}: ${e.message}`)}});
 let rate=prior?.rate||null;try{if(rateRaw){const rows=JSON.parse(rateRaw).refRates;if(!Array.isArray(rows)||!rows.length||!Number.isFinite(rows[0].percentRate))throw Error('invalid_rate_schema');if(rows[0].effectiveDate>dayUTC(now))throw Error('future_rate');rate={...rows[0],source:RATE_URL,checkedAt:now.toISOString(),history:rows.map(r=>({date:r.effectiveDate,rate:r.percentRate}))}}}catch(e){warnings.push(e.message)}
 let policy=prior?.policy||null;let calendar=prior?.calendar||null;
 if(fomcHtml){const latest=links(fomcHtml,FOMC_URL).find(l=>l.title==='Recent Statement');if(latest){const h=await safe(latest.url,'statement');if(h)policy=parsePolicy(h,latest.url)}}
 if(calendarHtml)calendar=parseCalendar(calendarHtml,now);
 const output={documents:[...documents.values()].sort((a,b)=>b.date.localeCompare(a.date)),roster,rate,policy,calendar,sourceStatus:statuses,warnings,collectedAt:now.toISOString()};
 return output;
}
export function publicSnapshot(data,now=new Date()){
 const result=compose(data.documents,data.roster,now);const {documents,...sources}=data;
 const strip=d=>{const {paragraphs,...rest}=d;return rest};
 return {...result,...sources,roster:undefined,signals:result.signals.map(strip),changes:result.changes.map(strip),sourceStatus:data.sourceStatus.filter(s=>s.id!=='document'),warnings:data.warnings,checkedAt:data.collectedAt,serverTime:now.toISOString(),dataKind:'official_sources_derived_index',refreshSeconds:300,probabilities:null};
}

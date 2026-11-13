import {MEMBERS,METHOD_VERSION} from './sources.mjs';
import calibrations from '../data/speech-calibrations.json' with {type:'json'};
const reviews=new Map(calibrations.documents.map(d=>[d.url,d]));
export const DAY=86400000;
export function dayUTC(value){return new Date(value).toISOString().slice(0,10)}
export function calculationDay(value){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))}
export const minimumCoverage=roster=>Math.max(1,Math.ceil(roster.members.length/2));
export function stanceOf(score){if(score==null)return '暂无评分';return score<25?'鸽派':score<45?'偏鸽派':score<=55?'中性':score<75?'偏鹰派':'鹰派'}
const sentenceSegmenter=new Intl.Segmenter('en',{granularity:'sentence'});
const rules=[
 ['明确支持收紧',3,/\bI\b[^.!?]{0,45}(?:preferred|prefer|support|supported|favor|favored|would rather|would have supported)[^.!?]{0,45}(?:raise|raising|hike|tighten|increase)[^.!?]{0,50}(?:rate|policy|target range)|(?:risks? to inflation)[^.!?]{0,30}outweigh[^.!?]{0,40}(?:employment|labor)/i],
 ['支持进一步加息',3,/(?:\bI\b|\bwe\b)[^.!?]{0,100}(?:anticipate|expect|believe|support|see|think)[^.!?]{0,100}(?:additional|further|more|another)[^.!?]{0,35}(?:hikes?|rate increases?|tightening)/i],
 ['政策需要收紧',3,/(?:policy|rates?|restriction)[^.!?]{0,70}(?:needs? to be|should be|must be|will need to be)[^.!?]{0,35}(?:more restrictive|higher|tighten)|(?:need|necessary|appropriate)[^.!?]{0,40}(?:raise|increase)[^.!?]{0,20}(?:rates?|target range)|further (?:monetary policy )?firming[^.!?]{0,35}(?:will|may|might|could)[^.!?]{0,20}(?:necessary|required)|further removal of (?:monetary )?policy accommodation[^.!?]{0,35}(?:will|may|might|could)[^.!?]{0,20}(?:necessary|required)|(?:tighter|more restrictive) (?:monetary )?policy[^.!?]{0,25}(?:will|may|might|could)[^.!?]{0,20}(?:necessary|required)/i],
 ['维持限制性政策',1.5,/(?:policy|stance)[^.!?]{0,40}(?:remain|stay|maintain|keep)[^.!?]{0,30}restrictive|maintain[^.!?]{0,30}restrictive[^.!?]{0,30}(?:policy|stance)|(?:policy|stance) (?:needs? to be|should be|must be) (?:(?:somewhat|sufficiently) )?restrictive/i],
 ['通胀压力仍高',1,/(?:inflation|price pressures?)[^.!?]{0,45}(?:too high|too elevated|remains? elevated|persistent|tilted to the upside|upside risks)|(?:upside risks)[^.!?]{0,40}inflation|inflation[^.!?]{0,25}(?:stalled|not making sufficient progress)/i],
 ['支持降低利率',-3,/(?:\bI\b|\bwe\b)[^.!?]{0,100}(?:anticipate|expect|believe|support|see|think)[^.!?]{0,80}(?:rate cuts?|cutting rates|lowering rates|reducing rates|lower rates)|(?:need|appropriate|should|must)[^.!?]{0,35}(?:cut|lower|reduce)[^.!?]{0,25}(?:interest rates?|policy rate|target range)/i],
 ['减少政策限制',-2,/(?:reduce|lower|lessen|remove)[^.!?]{0,30}(?:policy restraint|restriction|restrictiveness)|(?:less restrictive|easing of monetary policy)/i],
 ['就业下行风险',-1,/(?:downside risks?|risks?)[^.!?]{0,40}(?:employment|labor market)[^.!?]{0,25}(?:risen|increased|rising)|(?:employment|labor market)[^.!?]{0,35}(?:weakening|deteriorating|downside risks)|(?:unemployment)[^.!?]{0,25}(?:rising|risen|increasing)/i]
];
// Additional explicit constructions found during the complete recall review.
for(const [index,pattern] of [[1,/target range[^.!?]{0,25}needs? to rise (?:an )?(?:additional|further)/i],[2,/(?:policy|stance)[^.!?]{0,50}(?:will need to|needs? to|should|must) (?:move to|become) (?:a )?(?:more )?restrictive/i],[4,/(?:stubbornly|persistently) elevated inflation/i]])rules[index][2]=new RegExp(rules[index][2].source+'|'+pattern.source,'i');
export function policyContext(paragraphs){
 const t=paragraphs.join(' ');
 return /\bI (?:support|favor|prefer)[^.!?]{0,40}(?:holding|keeping|maintaining)[^.!?]{0,45}(?:rate|target range)[^.!?]{0,30}(?:unchanged|current)|\bI (?:do not|don't) (?:believe|think|expect)[^.!?]{0,55}(?:further|additional) (?:rate increases|rate hikes)[^.!?]{0,25}necessary|inflation[^.!?]{0,60}on track to return[^.!?]{0,30}(?:target|goal)/i.test(t);
}
// Research-grade deterministic text measurement, not an official score or a rate forecast.
// Historical narration, hypothetical policy examples, and negated phrases are excluded.
export function scoreText(paragraphs){
 const evidence=[];const labels=new Set(),seenSentences=new Set();let hawk=0,dove=0;
 for(const paragraph of paragraphs){
  if(/\b(?:suppose|let['’]s assume|for example|for instance|hypothetical)\b/i.test(paragraph))continue;
  const sentences=[...sentenceSegmenter.segment(paragraph)].map(part=>part.segment);
  for(let sentence of sentences){
   sentence=sentence.trim();if(sentence.length<30)continue;
   const sentenceKey=sentence.replace(/\s+/g,' ').toLowerCase();
   if(seenSentences.has(sentenceKey))continue;
   seenSentences.add(sentenceKey);
   if(/\b(?:last year|in 2025|back in|during the pandemic|in the past)\b/i.test(sentence))continue;
   if(/(?:majority of (?:FOMC|Committee) participants|median (?:FOMC )?participant|projections[^.!?]{0,80}(?:participants|Committee))/i.test(sentence)&&!/(?:\bI (?:expect|believe|prefer|support|think)|my own (?:forecast|projection))/i.test(sentence))continue;
   for(const [label,weight,pattern] of rules){
    const match=pattern.exec(sentence);if(!match)continue;
    if(label==='明确支持收紧'&&/\b(?:supported|preferred|favored|would have supported)\b/i.test(sentence)&&/\b(?:January|February|March|April|May|June|July|August|September|October|November|December|last[^.!?]{0,20}meeting|last week)\b/i.test(sentence))continue;
    if(label==='通胀压力仍高'&&/\binflation (?:was|remained|had been)\b/i.test(sentence))continue;
    const prefix=sentence.slice(Math.max(0,match.index-32),match.index);
    if(/\b(?:not|never|no longer|unlikely to|do not)\b/i.test(prefix)||/\b(?:do not|does not|not support|not expect|not believe|no need|not necessary)\b/i.test(match[0]))continue;
    let magnitude=Math.abs(weight);
    if(/\b(?:if|could|might|may|depending|conditional)\b/i.test(sentence))magnitude*=.5;
    // Each rule contributes at most twice per speech to limit repetition bias.
    const occurrence=evidence.filter(e=>e.label===label).length;
    if(occurrence>=2)continue;
    if(weight>0)hawk+=magnitude;else dove+=magnitude;
    labels.add(label);evidence.push({label,direction:weight>0?'hawk':'dove',strength:magnitude,text:sentence});
   }
  }
 }
 if(!evidence.length)return {score:null,rawScore:null,evidence:[],labels:[],method:METHOD_VERSION,status:policyContext(paragraphs)?'policy_no_direction':'insufficient_policy_evidence',policyRelevant:policyContext(paragraphs)?true:null};
 const raw=(hawk-dove)/(hawk+dove+3);
 const strongest=evidence.slice().sort((a,b)=>b.strength-a.strength)[0];
 return {score:Math.round(50*(1+raw)),rawScore:raw,labels:[...labels],evidence:evidence.map(({text,...e})=>({...e,excerpt:text.split(/\s+/).slice(0,22).join(' ')+(text.split(/\s+/).length>22?'…':'')})),excerpt:strongest.text.split(/\s+/).slice(0,22).join(' ')+(strongest.text.split(/\s+/).length>22?'…':''),method:METHOD_VERSION,status:'scored'};
}
// A reviewed decision applies only to the exact source, speaker and activity date.
// Changed/new source text returns to the automatic rules and is explicitly unreviewed.
export function scoreDocument(document){
 const fallback=()=>({...scoreText(document.paragraphs),excerptZh:null,reviewedAt:null,reviewVersion:null,sourceTextKind:null,reviewStatus:reviews.has(document.url)?'source_changed':'unreviewed'});
 const review=reviews.get(document.url);
 if(!review)return fallback();
 if(document.member!==review.member||document.date!==review.date||JSON.stringify(document.paragraphs)!==review.sourceParagraphs)return fallback();
 const evidence=review.evidence;
 const hawk=evidence.filter(e=>e.direction==='hawk').reduce((n,e)=>n+e.strength,0);
 const dove=evidence.filter(e=>e.direction==='dove').reduce((n,e)=>n+e.strength,0);
 const raw=evidence.length?(hawk-dove)/(hawk+dove+3):null;
 const excerpt=text=>text.split(/\s+/).slice(0,22).join(' ')+(text.split(/\s+/).length>22?'…':'');
 return {score:raw==null?null:Math.round(50*(1+raw)),rawScore:raw,labels:[...new Set(evidence.map(e=>e.label))],
 evidence:evidence.map(({text,reason,...e})=>({...e,excerpt:excerpt(text)})),excerpt:evidence.length?excerpt(evidence.slice().sort((a,b)=>b.strength-a.strength)[0].text):null,
 excerptZh:review.summary,method:METHOD_VERSION,status:raw==null?'insufficient_policy_evidence':'scored',reviewStatus:'reviewed',sourceTextKind:review.sourceTextKind,reviewedAt:calibrations.reviewedAt,reviewVersion:calibrations.version};
}
export function aggregate(documents,roster,asOf,{memberFilter=null}={}){
 const t=Date.parse(asOf+'T23:59:59Z');
 const members=roster.members.map(m=>{
  const docs=documents.filter(d=>d.member===m.id&&d.rawScore!=null&&Date.parse(d.date)<=t&&t-Date.parse(d.date)<=90*DAY);
  const weights=docs.map(d=>Math.exp(-(t-Date.parse(d.date))/DAY/30));
  const total=weights.reduce((a,b)=>a+b,0);const raw=total?docs.reduce((n,d,i)=>n+d.rawScore*weights[i],0)/total:null;
  const latest=docs.slice().sort((a,b)=>b.date.localeCompare(a.date))[0];
  return {...m,rawScore:raw,score:raw==null?null:Math.round(50*(1+raw)),documents:docs.length,latestDate:latest?.date||null,latestUrl:latest?.url||null,ageDays:latest?Math.floor((t-Date.parse(latest.date))/DAY):null};
 });
 const covered=members.filter(m=>m.rawScore!=null&&(!memberFilter||m.id===memberFilter));
 const denom=covered.reduce((n,m)=>n+m.weight*(m.voter?1.25:1),0);
 const raw=denom?covered.reduce((n,m)=>n+m.rawScore*m.weight*(m.voter?1.25:1),0)/denom:null;
 const score=raw==null?null:Math.round(50*(1+raw));
 return {score,rawScore:raw,members,covered:covered.length,total:members.length,voterCovered:covered.filter(m=>m.voter).length,voterTotal:members.filter(m=>m.voter).length};
}
export function compose(documents,roster,now=new Date()){
 const end=calculationDay(now);const required=minimumCoverage(roster);const valid=documents.filter(d=>d.date<=end&&d.rawScore!=null).sort((a,b)=>a.date.localeCompare(b.date)||a.url.localeCompare(b.url));
 const eventDates=[...new Set(valid.map(d=>d.date))];const history=[];
 const expiryDates=valid.map(d=>dayUTC(new Date(Date.parse(d.date)+90*DAY))).filter(date=>date<=end);
 const calculationDates=[...new Set([...eventDates,...expiryDates,end])].sort();
 for(const date of calculationDates){const a=aggregate(valid,roster,date);history.push({date,score:a.covered>=required?a.score:null,covered:a.covered,kind:'reconstructed',pointType:eventDates.includes(date)?'text':'calculation',method:METHOD_VERSION});}
 const latestDate=eventDates.at(-1)||null;const current=aggregate(valid,roster,end);
 if(current.covered<required){current.score=null;current.rawScore=null;}
 const prev=history.filter(p=>p.date<latestDate&&p.score!=null&&eventDates.includes(p.date)).at(-1)||null;const weekCut=dayUTC(new Date(Date.parse(end)-7*DAY));const week=aggregate(valid,roster,weekCut);
 const previousDate=prev?.date||null;
 const before=previousDate?aggregate(valid,roster,previousDate):null;
 const changes=before&&latestDate&&current.score!=null?reconstructChanges(valid,roster,{date:end,eventDate:latestDate,beforeDate:previousDate}):[];
 const signals=valid.filter(d=>Date.parse(end+'T23:59:59Z')-Date.parse(d.date)<=90*DAY).slice().reverse().map(d=>{const change=changes.find(x=>x.url===d.url);return {...d,impact:change?.impact??null,impactType:change?.impactType||null}});
 const activeMembers=current.members.map(m=>({...m,status:m.score==null?'missing':m.ageDays>30?'aged':'fresh'}));
 return {score:current.score,previous:prev?.score??null,week:week.covered>=required?week.score:null,change:prev&&current.score!=null?current.score-prev.score:null,weekChange:week.covered>=required&&current.score!=null?current.score-week.score:null,indexDate:end,eventDate:latestDate,previousDate,history,signals,changes,members:activeMembers,coverage:{covered:current.covered,total:current.total,voterCovered:current.voterCovered,voterTotal:current.voterTotal},method:METHOD_VERSION,minimumCoverage:required,attributionMode:'sequential_reconstruction',attributionOrder:'event_date_then_source_url',windowDays:90,rosterYear:roster.year,rosterCheckedAt:roster.checkedAt,rosterSource:roster.source,historyNote:'根据当前委员名单与当前模型回算；不是当时实时发布的指数。'};
}

export function reconstructChanges(documents,roster,{date,eventDate=date,beforeDate=dayUTC(new Date(Date.parse(date)-DAY))}){
 const required=minimumCoverage(roster),eligible=documents.filter(d=>d.rawScore!=null&&d.date<=date);
 const current=aggregate(eligible,roster,date),before=aggregate(eligible,roster,beforeDate);
 if(current.covered<required)return [];
 const added=eligible.filter(d=>d.date===eventDate).sort((a,b)=>a.url.localeCompare(b.url));
 const running=eligible.filter(d=>d.date!==eventDate);let previous=aggregate(running,roster,date);const changes=[];
 for(const doc of added){running.push(doc);const after=aggregate(running,roster,date);const impact=previous.covered>=required&&after.covered>=required?Math.round((after.rawScore-previous.rawScore)*500)/10:null;changes.push({...doc,impact,impactType:'sequential_reconstruction'});previous=after;}
 if(before.covered>=required){const total=current.score-before.score,sum=changes.reduce((n,d)=>n+(d.impact||0),0);changes.push({id:'calculation',member:null,date,title:'时间、样本变化及计算差额',impact:Math.round((total-sum)*10)/10,calculation:true,url:null,labels:[],excerpt:null});}
 return changes;
}
export function reconstructDay(documents,roster,date){
 const current=aggregate(documents,roster,date),beforeDate=dayUTC(new Date(Date.parse(date)-DAY)),before=aggregate(documents,roster,beforeDate),required=minimumCoverage(roster);
 return {date,score:current.covered>=required?current.score:null,previousDate:beforeDate,previous:before.covered>=required?before.score:null,change:current.covered>=required&&before.covered>=required?current.score-before.score:null,covered:current.covered,required,total:current.total,changes:reconstructChanges(documents,roster,{date}),method:METHOD_VERSION,kind:'reconstructed',note:'按当前观察名单与评分规则回算，非当时发布记录；同日发言按来源链接固定排序。'};
}

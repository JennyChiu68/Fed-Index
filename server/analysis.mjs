import {MEMBERS,METHOD_VERSION} from './sources.mjs';
export const DAY=86400000;
export function dayUTC(value){return new Date(value).toISOString().slice(0,10)}
export function stanceOf(score){if(score==null)return '暂无评分';return score<20?'明显鸽派':score<45?'偏鸽派':score<=55?'中性':score<=80?'偏鹰派':'明显鹰派'}
const rules=[
 ['明确支持收紧',3,/\bI\b[^.!?]{0,45}(?:preferred|prefer|support|supported|favor|favored|would rather|would have supported)[^.!?]{0,45}(?:raise|raising|hike|tighten|increase)[^.!?]{0,50}(?:rate|policy|target range)|(?:risks? to inflation)[^.!?]{0,30}outweigh[^.!?]{0,40}(?:employment|labor)/i],
 ['支持进一步加息',3,/(?:\bI\b|\bwe\b)[^.!?]{0,100}(?:anticipate|expect|believe|support|see|think)[^.!?]{0,100}(?:additional|further|more|another)[^.!?]{0,35}(?:hikes?|rate increases?|tightening)/i],
 ['政策需要收紧',3,/(?:policy|rates?|restriction)[^.!?]{0,70}(?:needs? to be|should be|must be|will need to be)[^.!?]{0,35}(?:more restrictive|higher|tighten)|(?:need|necessary|appropriate)[^.!?]{0,40}(?:raise|increase)[^.!?]{0,20}(?:rates?|target range)/i],
 ['维持限制性政策',1.5,/(?:policy|stance)[^.!?]{0,40}(?:remain|stay|maintain|keep)[^.!?]{0,30}restrictive|maintain[^.!?]{0,30}restrictive[^.!?]{0,30}(?:policy|stance)/i],
 ['通胀压力仍高',1,/(?:inflation|price pressures?)[^.!?]{0,45}(?:too high|too elevated|remains? elevated|persistent|tilted to the upside|upside risks)|(?:upside risks)[^.!?]{0,40}inflation|inflation[^.!?]{0,25}(?:stalled|not making sufficient progress)/i],
 ['支持降低利率',-3,/(?:\bI\b|\bwe\b)[^.!?]{0,100}(?:anticipate|expect|believe|support|see|think)[^.!?]{0,80}(?:rate cuts?|cutting rates|lowering rates|reducing rates|lower rates)|(?:need|appropriate|should|must)[^.!?]{0,35}(?:cut|lower|reduce)[^.!?]{0,25}(?:interest rates?|policy rate|target range)/i],
 ['减少政策限制',-2,/(?:reduce|lower|lessen|remove)[^.!?]{0,30}(?:policy restraint|restriction|restrictiveness)|(?:less restrictive|easing of monetary policy)/i],
 ['就业下行风险',-1,/(?:downside risks?|risks?)[^.!?]{0,40}(?:employment|labor market)[^.!?]{0,25}(?:risen|increased|rising)|(?:employment|labor market)[^.!?]{0,35}(?:weakening|deteriorating|downside risks)|(?:unemployment)[^.!?]{0,25}(?:rising|risen|increasing)/i]
];
// Research-grade deterministic text measurement, not an official score or a rate forecast.
// Historical narration, hypothetical policy examples, and negated phrases are excluded.
export function scoreText(paragraphs){
 const evidence=[];const labels=new Set();let hawk=0,dove=0;
 for(const paragraph of paragraphs){
  if(/\b(?:suppose|let['’]s assume|for example|for instance|hypothetical)\b/i.test(paragraph))continue;
  const sentences=paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];
  for(let sentence of sentences){
   sentence=sentence.trim();if(sentence.length<30)continue;
   if(/\b(?:last year|in 2025|back in|during the pandemic|in the past)\b/i.test(sentence))continue;
   for(const [label,weight,pattern] of rules){
    const match=pattern.exec(sentence);if(!match)continue;
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
 if(!evidence.length)return {score:null,rawScore:null,evidence:[],labels:[],method:METHOD_VERSION,status:'insufficient_policy_evidence'};
 const raw=(hawk-dove)/(hawk+dove+3);
 const strongest=evidence.slice().sort((a,b)=>b.strength-a.strength)[0];
 return {score:Math.round(50*(1+raw)),rawScore:raw,labels:[...labels],evidence:evidence.map(({text,...e})=>({...e,excerpt:text.split(/\s+/).slice(0,22).join(' ')+(text.split(/\s+/).length>22?'…':'')})),excerpt:strongest.text.split(/\s+/).slice(0,22).join(' ')+(strongest.text.split(/\s+/).length>22?'…':''),method:METHOD_VERSION,status:'scored'};
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
 const end=dayUTC(now);const valid=documents.filter(d=>d.date<=end&&d.rawScore!=null).sort((a,b)=>a.date.localeCompare(b.date)||a.url.localeCompare(b.url));
 const eventDates=[...new Set(valid.map(d=>d.date))];const history=[];
 for(const date of eventDates){const a=aggregate(valid,roster,date);if(a.covered>=3)history.push({date,score:a.score,covered:a.covered,kind:'reconstructed',method:METHOD_VERSION});}
 const latestDate=history.at(-1)?.date||null;const current=latestDate?aggregate(valid,roster,latestDate):aggregate([],roster,end);
 const prev=history.at(-2)||null;const weekCut=dayUTC(new Date(Date.parse(end)-7*DAY));const week=history.filter(p=>p.date<=weekCut).at(-1)||null;
 const previousDate=prev?.date||null;
 const before=previousDate?aggregate(valid,roster,previousDate):null;
 const changes=[];
 if(before&&latestDate){
  // Leave-one-out marginal effects for new documents on the latest event date.
  // Include a residual for decay/coverage/non-additivity/rounding; never invent per-speech contributions.
  const added=valid.filter(d=>d.date===latestDate);const prior=valid.filter(d=>d.date<latestDate);
  const baseline=aggregate(prior,roster,latestDate);
  for(const doc of added){const minus=aggregate(valid.filter(d=>d.url!==doc.url),roster,latestDate);const impact=current.score!=null&&minus.score!=null?Math.round((current.rawScore-minus.rawScore)*500)/10:null;changes.push({...doc,impact,impactType:'leave_one_out'});}
  const combined=current.score-before.score;const sum=changes.reduce((n,d)=>n+(d.impact||0),0);
  changes.push({id:'calculation',member:null,date:latestDate,title:'时间权重、覆盖与非线性残差',impact:Math.round((combined-sum)*10)/10,calculation:true,url:null,labels:[],excerpt:null});
 }
 const signals=valid.slice().reverse().slice(0,24).map(d=>{const change=changes.find(x=>x.url===d.url);return {...d,impact:change?.impact??null,impactType:change?.impactType||null}});
 const activeMembers=current.members.map(m=>({...m,status:m.score==null?'missing':m.ageDays>30?'aged':'fresh'}));
 return {score:current.score,previous:prev?.score??null,week:week?.score??null,change:prev?current.score-prev.score:null,weekChange:week?current.score-week.score:null,eventDate:latestDate,previousDate,history,signals,changes,members:activeMembers,coverage:{covered:current.covered,total:current.total,voterCovered:current.voterCovered,voterTotal:current.voterTotal},method:METHOD_VERSION,windowDays:90,rosterYear:roster.year,rosterCheckedAt:roster.checkedAt,rosterSource:roster.source,historyNote:'根据当前委员名单与当前模型回算；不是当时实时发布的指数。'};
}

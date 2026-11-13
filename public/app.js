import {stanceOf,sourceHealth,attributionRows,probabilityTimestamp} from '/client-utils.js';
const $=s=>document.querySelector(s);
const main=$('#main'),dialog=$('#sheet');
let historyRequest=0;
let snapshot=null,state={period:30,memberFilter:'all',expanded:false,signalLimit:3,signalFilter:'all',meetingDate:null,camp:'all'},lastFocus,refreshBusy=false,gaugeHasEntered=false;
const icon=name=>name==='info'?'<img class="icon question-icon" src="/assets/plus-question-icon.png" alt="">':`<img class="icon" src="/assets/${({arrow:'chevron-right',down:'chevron-down',download:'download',search:'search',refresh:'refresh'})[name]||'chevron-right'}.svg" alt="">`;
main.innerHTML='<div class="content"><div class="empty-state">正在读取已核实的官方数据…</div></div>';
const portraits=await fetch('/assets/portraits/sources.json',{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
const portrait=m=>portraits[m.id]?`<img src="${escaped(portraits[m.id].path)}" alt="${escaped(m.zh)}" loading="lazy">`:escaped(m.zh.split('·').at(-1).slice(0,2));
// Display translations preserve the source titles in the data and source links.
const policyTitleTranslations={
  "Remarks on the U.S. Economy and Monetary Policy": "美国经济与货币政策讲话",
  "Economic Outlook": "经济展望",
  "The Economic Outlook and Some Thoughts on Labor Market Dynamism": "经济展望与劳动力市场活力",
  "The U.S. Economy and Considerations for Monetary Policy": "美国经济与货币政策考量",
  "Economic and monetary policy outlook": "经济与货币政策展望",
  "Remarks to Davidson College students": "面向戴维森学院学生的讲话",

  "Perspectives on the Economy and the Banking Landscape": "经济与银行业形势观察",
  "Trimming the Sails: Communicating My Reaction Function": "调整风帆：阐释我的货币政策反应机制",
  "Moderated Q&A at Bloomberg’s The Future of Fixed Income Event": "彭博“固定收益的未来”活动现场问答",
  "The Signaling Value of the Summary of Economic Projections": "经济预测摘要的信号价值",
  "The U.S. Economy and Monetary Policy": "美国经济与货币政策",
  "The Dual Mandate in Rural America": "美联储双重使命与美国农村地区",
  "Unwavering Dedication": "始终不渝的奉献",
  "Economic Conditions and Monetary Policy": "经济形势与货币政策",
  "An Update on AI and the Economy": "人工智能与经济的最新进展",
  "Opening Remarks": "开幕致辞",
  "Why Hike?": "为何加息？",
  "OMFIF Event: Monetary Policy in an Uncertain World": "官方货币与金融机构论坛活动：不确定世界中的货币政策",
  "The Strategic Imperative of Instant Payments for Community Banks": "社区银行发展即时支付的战略必要性",
  "The Economic Outlook and Some Comments on My Policy Communication": "经济展望及对本人政策沟通的几点说明",
  "Unlocking Opportunities for Workers and Entrepreneurs with a Criminal Record": "为有犯罪记录的劳动者和创业者拓展机会",
  "In Our Time": "我们的时代",
  "Perspectives on the Economy from Susan M. Collins": "苏珊·柯林斯对经济形势的看法",
  "The Mysterious U.S. Economy": "难以捉摸的美国经济",
  "Chocolate Factories, Small Towns, and Monetary Policy: Blending Data with the Grassroots": "巧克力工厂、小城镇与货币政策：将数据与基层观察相结合",
  "Keynote Remarks by Mary C. Daly at the ESRI International Conference in Tokyo": "玛丽·戴利在东京 ESRI 国际会议上的主题讲话",
  "Outlook for the U.S. and Alaskan Economies": "美国及阿拉斯加州经济展望",
  "Monetary Policy Perspective: Keeping an Open Mind": "货币政策观察：保持开放心态",
  "Agriculture, the Economy, and the Kansas City Fed": "农业、经济与堪萨斯城联储",
  "Statement on My FOMC Dissent": "关于本人在联邦公开市场委员会投票中持异议的声明"
};
const policyExcerptTranslations={
  "https://www.stlouisfed.org/from-the-president/remarks/2026/remarks-on-us-economy-and-monetary-policy-somc": "他认为政策仍具宽松性，很可能仍需进一步收紧，以确保通胀及时回到2%。",
  "https://www.philadelphiafed.org/the-economy/monetary-policy/261110-81st-annual-field-meeting-capstone-speech": "她认为，为使通胀回到2%，货币政策仍需保持一定限制性。",
  "https://www.federalreserve.gov/newsevents/speech/waller20261110a.htm": "通胀仍然过高，他认为需要尽早进一步收紧货币政策，以推动通胀回到2%。",
  "https://www.federalreserve.gov/newsevents/speech/bowman20261110a.htm": "她预计部分推升通胀的因素明年会减弱，但目前通胀比预想更顽固。",
  "https://www.dallasfed.org/news/speeches/logan/2026/lkl261110": "她认为需要尽快收紧政策，以适当平衡通胀与就业风险。",
  "https://www.dallasfed.org/news/speeches/logan/2026/lkl261030": "通胀仍偏高、劳动力市场保持平衡，美联储只实现了双重目标中的一个。",

  "Perspectives on the Economy and the Banking Landscape": "她表示，目前预计“在年底前进一步小幅加息将是适当的。”",
  "Trimming the Sails: Communicating My Reaction Function": "如果通胀持续高于我的预测，或通胀心态根深蒂固，可能需要将船头转向……",
  "Moderated Q&A at Bloomberg’s The Future of Fixed Income Event": "穆萨莱姆指出，通胀仍处于高位，持续的需求压力和负面供给冲击正在推高通胀。",
  "The Signaling Value of the Summary of Economic Projections": "9月会议提交的预测显示，绝大多数联邦公开市场委员会参与者认为，提高……将是适当的。",
  "The U.S. Economy and Monetary Policy": "然而，通胀过高，且已连续五年多超过美联储2%的目标。",
  "The Dual Mandate in Rural America": "无论身处农村还是城市，事实都是：通胀过高的状况已经持续太久……",
  "Unwavering Dedication": "通胀率为3.7%，无疑仍然过高。",
  "Economic Conditions and Monetary Policy": "目前可以明确的是，通胀过高。",
  "An Update on AI and the Economy": "此次上调是为了应对持续过高、时间过长的通胀。",
  "Opening Remarks": "这就是我支持在上周会议上将联邦基金利率上调25个基点的原因。",
  "Why Hike?": "通胀风险超过了实现充分就业所面临的风险。",
  "OMFIF Event: Monetary Policy in an Uncertain World": "一旦推高通胀的供给冲击持续存在，主张“忽略其暂时影响”的部分逻辑就不再成立。",
  "The Strategic Imperative of Instant Payments for Community Banks": "联邦公开市场委员会收紧政策，是为了应对持续过高、时间过长的通胀。",
  "The Economic Outlook and Some Comments on My Policy Communication": "如果8月公布的新数据显示，这种改善只是昙花一现，那么提高政策利率可能是适当的……",
  "Unlocking Opportunities for Workers and Entrepreneurs with a Criminal Record": "但通胀仍然过高，而且这种状况已持续五年多。",
  "In Our Time": "当通胀过高，或就业岗位突然变得不再稳固时，承受后果的是辛勤工作的美国民众。",
  "Perspectives on the Economy from Susan M. Collins": "但由于通胀仍然过高，我依然尤其关注双重使命中的物价稳定目标。",
  "The Mysterious U.S. Economy": "美联储是否需要进一步加息，还是通胀已处于回落至目标的路径上？",
  "Chocolate Factories, Small Towns, and Monetary Policy: Blending Data with the Grassroots": "通胀过高，且已连续五年多高于联邦公开市场委员会2%的目标。",
  "Keynote Remarks by Mary C. Daly at the ESRI International Conference in Tokyo": "这将表明，通胀在某种程度上已扩散、变得更加持久，并影响了潜在通胀率……",
  "Outlook for the U.S. and Alaskan Economies": "首先考虑我们使命中的物价稳定目标，我的判断很简单：通胀过高。",
  "Monetary Policy Perspective: Keeping an Open Mind": "即使供给冲击消退，且没有新的冲击，这些信息也表明，政策可能需要更具限制性，才能实现……",
  "Agriculture, the Economy, and the Kansas City Fed": "观察经济形势时，我的关注重点始终是仍然过高的通胀。",
  "Statement on My FOMC Dissent": "我反对联邦公开市场委员会本周的政策行动，因为我倾向于上调联邦基金利率目标区间……"
};
const signalExcerpt=d=>d.calculation?'时间、样本变化及计算差额':d.excerptZh||policyExcerptTranslations[d.url]||policyExcerptTranslations[d.title]||signalTitle(d);
const signalTitle=d=>d.titleZh||policyTitleTranslations[d.title]||d.title;
const sign=x=>x>0?`+${x}`:`${x===0?'±0':x}`;
const cls=x=>x>0?'up':x<0?'down':'flat';
const active=(a,b)=>a===b?'active':'';
const escaped=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function gauge(d){
 const animate=d.score!=null&&!gaugeHasEntered;
 if(d.score!=null)gaugeHasEntered=true;
 const cx=120,cy=132,r=87;
 const point=(score,radius)=>{const a=Math.PI-score/100*Math.PI;return [cx+Math.cos(a)*radius,cy-Math.sin(a)*radius];};
 const arc=(start,end,radius=r)=>{const a=point(start,radius),b=point(end,radius);return `M${a.join(' ')} A${radius} ${radius} 0 0 1 ${b.join(' ')}`;};
 const angle=Math.PI-(d.score??50)/100*Math.PI,ux=Math.cos(angle),uy=-Math.sin(angle);
 const tip=[cx+ux*65,cy+uy*65],left=[cx-uy*6,cy+ux*6],right=[cx+uy*6,cy-ux*6];
 return `<div class="compact-gauge"><svg viewBox="0 0 240 152" role="img" aria-label="鹰鸽指数 ${d.score??'暂无评分'}，${d.label}"><defs><linearGradient id="dial-spectrum" gradientUnits="userSpaceOnUse" x1="26" y1="0" x2="214" y2="0"><stop offset="0" stop-color="#59dece"/><stop offset=".35" stop-color="#b9f67e"/><stop offset=".62" stop-color="#f6df55"/><stop offset="1" stop-color="#ff6841"/></linearGradient><linearGradient id="dial-wash" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d9f3fd"/><stop offset="1" stop-color="#f8fcff"/></linearGradient><linearGradient id="dial-needle" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#23c9f8"/><stop offset="1" stop-color="#09b9e8"/></linearGradient><filter id="dial-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.2"/></filter></defs><path d="M59 132 A61 61 0 0 1 181 132 Z" fill="url(#dial-wash)"/>${[[0,24],[27,73],[76,100]].map(([a,b])=>`<path d="${arc(a,b)}" fill="none" stroke="url(#dial-spectrum)" stroke-width="14"/>`).join('')}${Array.from({length:41},(_,i)=>{const v=i*2.5,major=i%4===0,a=point(v,major?65:68),b=point(v,major?71:71);return `<path d="M${a.join(' ')} L${b.join(' ')}" stroke="#8fddf5" stroke-width="${major?1.8:1}" opacity="${major?.95:.65}"/>`;}).join('')}${d.score==null?'':`<g class="dial-pointer ${animate?'dial-enter':''}" style="--dial-start:${-d.score*1.8}deg"><g fill="#14c4f2" opacity=".4" filter="url(#dial-glow)"><path d="M${left.join(' ')} L${tip.join(' ')} L${right.join(' ')} Z"/><circle cx="120" cy="132" r="13"/></g><path d="M${left.join(' ')} L${tip.join(' ')} L${right.join(' ')} Z" fill="url(#dial-needle)" stroke="#22c7f1" stroke-linejoin="round" stroke-width="2"/><circle cx="120" cy="132" r="11" fill="#fff" stroke="#0fbee9" stroke-width="5"/></g>`}<g font-family="PingFang SC,sans-serif" font-size="12" font-weight="600"><text x="120" y="32" text-anchor="middle" fill="#f4c72b">中性</text><text x="20" y="100" text-anchor="middle" fill="#32bf9f" transform="rotate(-67 20 100)">鸽派</text><text x="220" y="100" text-anchor="middle" fill="#ff7738" transform="rotate(67 220 100)">鹰派</text></g></svg></div>`;
}
const colors=s=>s==null||s>=45&&s<=55?{color:'#8793a4',soft:'#eff2f7'}:s<45?{color:'#389b88',soft:'#eaf6f1'}:{color:'#df8752',soft:'#fff1e5'};
const num=n=>n==null?'—':Number(n).toFixed(Number.isInteger(n)?0:1);
const shortDate=s=>s?s.slice(5,10).replace('-','.'): '—';
const fullDate=s=>s?(s.includes('T')?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s)).replaceAll('/','.'):s.slice(0,10).replaceAll('-','.')):'—';
const chineseDate=s=>new Date(s).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'long',day:'numeric'});
const memberFor=id=>snapshot.members.find(m=>m.id===id);
const sourceLink=(url,label)=>url?`<a class="inline-link" href="${escaped(url)}" target="_blank" rel="noopener noreferrer">${escaped(label)} ↗</a>`:'—';
const decisionLabel=d=>d.action==='hold'?'维持利率':`${d.action==='hike'?'加息':'降息'}${d.changeBps==null?'':` ${d.changeBps}bp`}`;
const voteLabel=v=>`${v.supported?'支持':'反对'}本次${decisionLabel(v)}`;
function decisionSummary(){
 const d=snapshot.decision;if(!d)return '';
 const tone=d.action==='hike'?'hike':d.action==='cut'?'cut':'hold';
 const date=new Date(d.date).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'long',day:'numeric'});
 const action=d.action==='hold'?'利率维持不变':decisionLabel(d).replace(' ','');
 return `<button class="decision-baseline decision-review decision-review--${tone}" data-open="decision" aria-label="上次美联储利率决议投票结果回顾"><span><b>上次美联储利率决议投票结果回顾</b><small>${date}，${action}</small></span><span aria-hidden="true">${icon('arrow')}</span></button>`;
}
function coverageSheet(){const c=snapshot.coverage;showSheet('委员证据覆盖',`<div class="detail-grid"><div>政策证据覆盖<strong>${c.evidenceCovered??c.covered} / ${c.total}</strong></div><div>个人文本评分<strong>${c.covered} / ${c.total}</strong></div><div>实名投票记录<strong>${c.voteCovered??0} / ${c.voterTotal}</strong></div><div>投票委员文本<strong>${c.voterCovered} / ${c.voterTotal}</strong></div></div><p class="sheet-body">政策证据包括有效个人文本或最新会议实名投票。同一个人只计一次。投票记录说明对该次决议的支持或反对，不转成个人鹰鸽分数。</p><div class="signals-list">${snapshot.members.filter(m=>m.score==null).map(m=>`<div class="research-row"><b>${m.zh}</b><p>当前样本无可评分个人文本${m.voteEvidence?` · ${fullDate(m.voteEvidence.date)} · ${voteLabel(m.voteEvidence)}`:''}</p>${m.voteEvidence?sourceLink(m.voteEvidence.url,'官方实名投票'):''}</div>`).join('')}</div>`);}
function policyContextCards(){
 const cards=[snapshot.policy&&{...snapshot.policy,label:'本次政策声明',dateLabel:fullDate(snapshot.policy.date)},snapshot.latestMinutes&&{...snapshot.latestMinutes,label:'最新已发布会议纪要',dateLabel:`会议 ${fullDate(snapshot.latestMinutes.context?.meetingStart||snapshot.latestMinutes.meetingDate)}${snapshot.latestMinutes.context?.meetingStart?'—'+fullDate(snapshot.latestMinutes.meetingDate):''}${snapshot.latestMinutes.releaseDate?' · '+fullDate(snapshot.latestMinutes.releaseDate)+' 发布':''}`}].filter(Boolean);
 return cards.map(c=>`<section class="policy-context-card"><h3>${escaped(c.label)}</h3><p class="sheet-caption">${escaped(c.dateLabel)}</p>${c.context?.points?.length?`<ul>${c.context.points.map(t=>`<li>${escaped(t)}</li>`).join('')}</ul>`:'<p class="sheet-body">暂无已核实要点</p>'}<p class="sheet-caption">${sourceLink(c.url,'查看官方原文')}${c.context?.summaryKind==='official_original_excerpt'?' · 原文摘录':''}</p></section>`).join('');
}
function decisionSheet(){
 const d=snapshot.decision;if(!d)return;
 const voters=(ids,count)=>!ids.length&&count>0?'<p class="empty-state">暂无完整实名记录</p>':ids.map(id=>memberFor(id)).filter(Boolean).map(m=>`<div class="decision-voter"><span class="decision-voter-portrait"><span class="avatar">${portrait(m)}</span></span><span>${escaped(m.zh)}</span></div>`).join('');
 showSheet(`${chineseDate(d.date)}美联储利率决议投票结果`,`<p class="decision-result">最终结果：${decisionLabel(d).replace(' ','')}</p><div class="decision-vote-columns"><section class="vote-panel vote-panel--support" aria-label="支持委员"><div class="vote-total vote-total--support"><span>支持</span><strong>${d.supportCount}<small>票</small></strong></div><div class="decision-voters">${voters(d.votedFor||[],d.supportCount)}</div></section><section class="vote-panel vote-panel--against" aria-label="反对委员"><div class="vote-total vote-total--against"><span>反对</span><strong>${d.dissentCount}<small>票</small></strong></div><div class="decision-voters">${voters(d.votedAgainst||[],d.dissentCount)}</div></section></div>${policyContextCards()}`);
 dialog.classList.add('decision-sheet');
}
function rowsForPeriod(){
 const end=snapshot.indexDate||(snapshot.serverTime||new Date().toISOString()).slice(0,10);const endTime=Date.parse(end);const points=[];
 for(let i=state.period-1;i>=0;i--){const date=new Date(endTime-i*86400000).toISOString().slice(0,10);const observation=snapshot.history.filter(p=>p.date<=date).at(-1);const source=snapshot.history.filter(p=>p.date<=date&&p.pointType==='text').at(-1);points.push({date,score:observation?.score??null,covered:observation?.covered??0,sourceDate:source?.date??null,calculationDate:observation?.date??null,pointType:observation?.pointType??null})}
 return points;
}
function chart(){
 const points=rowsForPeriod();
 // Keep the range preview on the same 0–100 scale as the main plot.
 let path='',previous=null;
 points.forEach((p,i)=>{if(p.score==null){previous=null;return;}const x=6+i/Math.max(1,points.length-1)*988,y=30-p.score/100*26;path+=previous==null?`M${x},${y}`:`H${x}V${y}`;previous=p;});
 return `<div class="chart-card"><svg class="range-preview" viewBox="0 0 1000 34" preserveAspectRatio="none" aria-hidden="true"><path d="${path}" fill="none" stroke="#aebacb" stroke-width="1" vector-effect="non-scaling-stroke"/></svg><div id="trend-chart" role="img" aria-label="${state.period}天指数历史走势"></div><img class="chart-watermark" src="/assets/jinshi-data-logo.svg" alt=""></div>`;
}
function memberMap(pool){
 const bands=[{key:'dove',label:'鸽派',min:0,max:24},{key:'dove-soft',label:'偏鸽',min:25,max:44},{key:'neutral',label:'中性',min:45,max:55},{key:'hawk-soft',label:'偏鹰',min:56,max:74},{key:'hawk',label:'鹰派',min:75,max:100}];
 const scored=pool.filter(m=>m.score!=null).sort((a,b)=>b.weight-a.weight||Number(b.voter)-Number(a.voter)||b.score-a.score||a.id.localeCompare(b.id));
 const band=bands.find(b=>b.key===state.camp),selected=band?scored.filter(m=>m.score>=band.min&&m.score<=band.max):scored;
 const rows=state.expanded?selected:selected.slice(0,6);
 return `<div class="camp-band-tabs" role="group" aria-label="按鹰鸽阵营筛选">${bands.map(b=>{const count=scored.filter(m=>m.score>=b.min&&m.score<=b.max).length;return `<button class="camp-band ${b.key} ${active(b.key,state.camp)}" data-camp="${b.key}" aria-pressed="${b.key===state.camp}" title="${b.min}–${b.max}分"><span>${b.label}</span><strong>${count}<small>人</small></strong></button>`}).join('')}</div><div class="member-list-caption"><span>${band?band.label:'全部阵营'} · ${selected.length}人有评分</span>${band?'<button data-camp="all">查看全部</button>':''}</div><div class="member-card-grid">${rows.length?rows.map(m=>`<button class="member-card" data-member="${m.id}" aria-label="查看${escaped(m.zh)}的官方讲话"><span class="member-card-top"><span class="avatar">${portrait(m)}</span><span class="member-card-copy"><b>${escaped(m.zh)}</b><small>${escaped(m.role)}${m.voter?' · 票委':''}</small></span></span><span class="member-card-reading"><strong>${num(m.score)}</strong><span style="color:${colors(m.score).color}">${stanceOf(m.score)}</span></span><span class="member-card-date"><time datetime="${escaped(m.latestDate)}">${shortDate(m.latestDate)} 发言</time>${m.ageDays>30?'<em>较早</em>':''}</span></button>`).join(''):'<p class="empty-state">暂无该阵营的已评分委员</p>'}</div>${selected.length>6?`<button class="expand-members" data-expand="members" aria-expanded="${state.expanded}">${state.expanded?'收起名单':`展开其余 ${selected.length-6} 人`}</button>`:''}${pool.some(m=>m.score==null)?`<div class="unscored"><span>未评分 ${pool.filter(m=>m.score==null).length}人</span>${pool.filter(m=>m.score==null).map(m=>`<button class="unscored-member" data-member="${m.id}" aria-label="查看${escaped(m.zh)}的资料状态"><span class="avatar">${portrait(m)}</span><span>${escaped(m.zh)}</span></button>`).join('')}</div>`:''}`;
}
function committee(){
 const pool=state.memberFilter==='voters'?snapshot.members.filter(m=>m.voter):snapshot.members;
 return `<section id="committee-section" aria-labelledby="committee-heading"><div class="section-heading"><h2 id="committee-heading">美联储鹰鸽阵营</h2><time class="section-update" datetime="${escaped(snapshot.checkedAt)}">${new Date(snapshot.checkedAt).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).replaceAll('/','-')}更新</time></div><div class="committee-filter"><span>${state.memberFilter==='voters'?'投票委员':'全部委员'} · ${pool.length}人</span><button id="voters-only" role="switch" aria-checked="${state.memberFilter==='voters'}" aria-label="仅看投票委员"><span class="voter-filter-label"><i class="voter-legend" aria-hidden="true">票</i>仅看投票委员</span><i class="switch-track"><i></i></i></button></div>${memberMap(pool)}</section>`;
}
function probabilityData(){const bundle=snapshot.probabilities;if(!bundle||bundle.status==='unavailable')return null;const dates=bundle.availableMeetings||[];const meetings=bundle.meetings?.length?bundle.meetings:[bundle];return meetings.find(m=>m.meetingDate===state.meetingDate)||meetings.find(m=>m.meetingDate===(dates[0]||bundle.meetingDate))||meetings[0]||null;}
function probabilityOutcomes(p){
 const rows=(p.outcomes||[]).filter(o=>o.probability>0).sort((a,b)=>a.lowerBps-b.lowerBps);
 if(!rows.length)return '';
 return `<div class="rate-outcomes"><div class="rate-outcome-heading"><span>该次决议后的目标利率区间</span><span>概率</span></div>${rows.map(o=>{const change=o.lowerBps-p.currentRange.lowerBps;return `<div class="rate-outcome-row"><div><span class="rate-outcome-range">${(o.lowerBps/100).toFixed(2)}–${(o.upperBps/100).toFixed(2)}%</span><span class="rate-outcome-change ${change>0?'rate-outcome-change--hike':''}">${change===0?'与当前相同':`累计${change>0?'加息':'降息'} ${Math.abs(change)}bp`}</span></div><strong>${o.probability.toFixed(1)}<small>%</small></strong></div>`}).join('')}</div>`;
}
function probabilities(){
 const p=probabilityData();
 if(!p)return `<section class="fedwatch-section" aria-labelledby="fedwatch-heading"><div class="section-heading"><h2 id="fedwatch-heading">利率决议预期</h2></div><div class="probability-content"><div class="empty-state">CME 概率表暂时不可用</div></div></section>`;
 const options=[{key:'hike',label:'累计加息',color:'#df9265'},{key:'hold',label:'维持当前',color:'#a8aeb7'},{key:'cut',label:'累计降息',color:'#69bda6'}].sort((a,b)=>p[b.key]-p[a.key]);
 const time=probabilityTimestamp(p);
 return `<section class="fedwatch-section" aria-labelledby="fedwatch-heading"><div class="section-heading"><h2 id="fedwatch-heading">利率决议预期</h2><time class="section-update" datetime="${escaped(p.asOf)}" title="北京时间，CME报价时间" aria-label="CME报价时间 ${escaped(time)} 北京时间">${escaped(time)}</time></div><div class="probability-content fedwatch-card"><div class="rate-context"><span>当前目标利率区间</span><b>${(p.currentRange.lowerBps/100).toFixed(2)}–${(p.currentRange.upperBps/100).toFixed(2)}<small>%</small></b></div><div class="probability-toolbar"><span>届时相对当前利率</span><button class="meeting-selector" data-open="meetings" aria-label="选择FOMC会议日期" aria-haspopup="dialog"><span>${chineseDate(p.meetingDate)}</span><i class="date-caret" aria-hidden="true"></i></button></div><div class="probability-layout"><div id="probability-pie" role="img" aria-label="${fullDate(p.meetingDate)}会议概率：${options.map(o=>`${o.label} ${p[o.key].toFixed(1)}%`).join('，')}"></div><div class="probability-values">${options.map(o=>`<div class="probability-value"><span><i style="background:${o.color}"></i>${o.label}</span><strong>${p[o.key].toFixed(1)}<small>%</small></strong></div>`).join('')}</div></div>${probabilityOutcomes(p)}</div></section>`;
}
function bindProbability(){const el=$('#probability-pie'),p=probabilityData();if(!el||!p||!window.echarts)return;probabilityInstance=echarts.init(el,null,{renderer:'svg'});probabilityInstance.setOption({animation:false,color:['#69bda6','#a8aeb7','#df9265'],tooltip:{trigger:'item',confine:true,textStyle:{fontSize:12},formatter:'{b}：{c}%'},series:[{type:'pie',radius:'80%',center:['50%','50%'],label:{show:false},labelLine:{show:false},itemStyle:{borderWidth:2,borderColor:'#fff'},data:[{name:'累计降息',value:p.cut},{name:'维持当前',value:p.hold},{name:'累计加息',value:p.hike}]}]});}

const hasIndexImpact=d=>Number.isFinite(d.impact)&&d.impact!==0;
function signalRows(rows,{impact=false,heading=false,interactive=true}={}){if(impact)rows=rows.filter(hasIndexImpact);if(!rows.length)return `<div class="empty-state">${impact?'暂无指数变化归因':'暂无可评分政策文本'}</div>`;return rows.map((d,i)=>{const m=memberFor(d.member);return `<${interactive?'button':'div'} class="signal" ${!interactive?'':d.calculation?'data-open="attribution-help"':`data-document="${escaped(d.id)}"`} aria-label="${interactive?'查看':''}${m?.zh||(d.calculation?'计算调整':'官方讲话')}：${escaped(signalTitle(d))}"><span class="signal-date-row"><time class="signal-time" datetime="${escaped(d.date)}">${fullDate(d.date)}</time>${impact&&heading&&i===0?'<span class="impact-column-label">对指数影响</span>':''}</span><span class="avatar ${d.score<45?'teal':''}">${m?portrait(m):d.calculation?'Σ':'F'}</span><span class="signal-main"><span class="signal-name">${m?.zh||(d.calculation?'计算调整':'官方讲话')} <span class="signal-meta">${m?.voter?'投票委员':''}</span></span><span class="signal-title">${escaped(impact?signalExcerpt(d):signalTitle(d))}</span></span><span class="impact" style="color:${impact?(d.impact==null?'#999':d.impact>0?'#d54941':d.impact<0?'#389b88':'#999'):colors(d.score).color}">${impact?(d.impact==null?'—':`${d.impact>0?'+':''}${num(d.impact)}<em class="impact-unit">点</em>`):d.score}${impact?'':'<small>单篇评分</small>'}</span></${interactive?'button':'div'}>`}).join('')}
const orderedSignals=()=>attributionRows(snapshot);
function latestSignals(){
 const rows=orderedSignals().filter(hasIndexImpact);
 return `<section class="policy-signals" id="latest-signals-section" aria-labelledby="latest-signals-heading"><div class="section-heading attribution-heading"><h2 id="latest-signals-heading">指数变化归因</h2><button class="index-help" data-open="attribution-help" aria-label="指数变化归因是什么" aria-haspopup="dialog">${icon('info')}</button></div><div class="signals-list">${signalRows(rows.slice(0,state.signalLimit),{impact:true,heading:true,interactive:true})}</div>${rows.length>state.signalLimit?`<button class="expand-members" id="load-more-signals">查看更多归因</button>`:''}</section>`;
}
function loadMoreSignals(){
 const rows=orderedSignals().filter(hasIndexImpact),start=state.signalLimit;
 state.signalLimit=Math.min(rows.length,start+3);
 $('#latest-signals-section .signals-list')?.insertAdjacentHTML('beforeend',signalRows(rows.slice(start,state.signalLimit),{impact:true,interactive:true}));
 if(state.signalLimit>=rows.length)$('#load-more-signals')?.remove();
}

let trendInstance,probabilityInstance;
function render(){if(!snapshot)return;const s=snapshot,c=colors(s.score);const scroll=window.scrollY;
 if(trendInstance){trendInstance.dispose();trendInstance=null;}
 if(probabilityInstance){probabilityInstance.dispose();probabilityInstance=null;}
 main.innerHTML=`<div class="content page-enter"><section class="topic-hero"><div class="topic-copy"><div class="topic-title"><h1>美联储鹰鸽指数</h1><button class="index-help" data-open="method" aria-label="指数如何计算" aria-haspopup="dialog">${icon('info')}</button></div><div class="breadcrumb"><span>金十数据</span>${icon('arrow')}<button data-open="search">美联储 ${icon('search')}</button></div><div class="data-date"><span>核查 ${fullDate(s.checkedAt)} · 最新发言 ${shortDate(s.eventDate)}</span></div><button class="data-health ${sourceHealth(s).state}" data-open="sources">${sourceHealth(s).label}</button></div><img class="hero-art" src="/assets/fed-hawk-dove.jpg" alt="雄鹰、白鸽与美联储利率仪表盘"></section>
 <section class="summary dashboard-summary overview-stacked" id="overview" aria-labelledby="policy-index-heading">${gauge({score:s.score,label:stanceOf(s.score),...c})}<div class="index-reading"><h2 id="policy-index-heading">${new Date(s.indexDate||s.eventDate).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'long',day:'numeric'})}美联储鹰鸽指数</h2><strong>${num(s.score)}</strong><span class="stance index-stance" style="color:${c.color};background:${c.soft}">${stanceOf(s.score)}</span></div>${s.score==null?'<p class="coverage-shortfall">个人文本覆盖不足，暂不显示综合分。</p>':''}<div class="overview-changes"><div class="stat"><span class="label">较上次变化${s.previousDate?`（${escaped(s.previousDate.slice(5))}）`:''}</span><strong class="${cls(s.change)}">${s.change==null?'—':sign(s.change)}<small>点</small></strong></div><div class="stat"><span class="label">近7日变化</span><strong class="${cls(s.weekChange)}">${s.weekChange==null?'—':sign(s.weekChange)}<small>点</small></strong></div></div></section>
 <section class="trend-section"><div class="section-heading trend-toolbar"><h2>指数走势（回算）</h2><div class="period-tabs" role="group" aria-label="走势时间范围">${[7,30,90].map(n=>`<button data-period="${n}" class="${active(n,state.period)}" aria-pressed="${n===state.period}">${n}天</button>`).join('')}</div></div>${chart()}<button class="history-entry" data-open="history">查看回算记录与每日归因 ${icon('arrow')}</button></section>${decisionSummary()}<div class="section-divider" aria-hidden="true"></div>${probabilities()}<div class="section-divider" aria-hidden="true"></div>${committee()}<div class="section-divider" aria-hidden="true"></div>${latestSignals()}
 <p class="footnote">数据来源：美联储、纽约联储、CME FedWatch</p></div>`;
 bindChart();bindProbability();window.scrollTo(0,scroll);
}

window.getFedAIPageData=()=>snapshot?{
 页面:'美联储鹰鸽指数',数据类型:snapshot.dataKind,快照:snapshot.previewSnapshot===true,
 更新时间:snapshot.checkedAt,数据状态:{状态:sourceHealth(snapshot).state,请求失败统计:snapshot.sourceHealth},指数日期:snapshot.indexDate||snapshot.eventDate,最近有效发言:snapshot.eventDate,指数:snapshot.score,指数立场:stanceOf(snapshot.score),
 较上次变化:snapshot.change,较上次日期:snapshot.previousDate,近7日变化:snapshot.weekChange,指数覆盖:snapshot.coverage,指数归因:snapshot.changes,
 当前筛选:{阵营:state.camp,指数范围:'全部观察名单，筛选仅影响委员列表',走势天数:state.period,仅看票委:state.memberFilter==='voters',会议日期:probabilityData()?.meetingDate},
 指数方法:{模型:snapshot.method,窗口天数:snapshot.windowDays,量表:'0–100，45–55中性',历史口径:snapshot.historyNote,逐篇语义复核:snapshot.calibration,归因:'按日期和来源链接的固定顺序逐篇加入后重算的贡献；计算调整补齐时间、样本及取整差额。属于回算，非当时实时发布流水。'},
 历史走势:rowsForPeriod(),当前利率决议概率:probabilityData(),上次决议:snapshot.decision,最新声明:snapshot.policy,最新会议纪要:snapshot.latestMinutes,
 委员:snapshot.members,政策文本:snapshot.signals.map(d=>({...d,中文标题:signalTitle(d),中文摘要:signalExcerpt(d)}))
}:null;

function showSheet(title,body){historyRequest++;dialog.classList.remove('picker-sheet','member-sheet','decision-sheet','method-sheet');if(!dialog.open)lastFocus=document.activeElement;$('#sheet-title').textContent=title;$('#sheet-content').innerHTML=body;if(!dialog.open)dialog.showModal()}
function closeSheet(){historyRequest++;dialog.close();if(lastFocus?.isConnected)lastFocus.focus()}
function helpSheet(title,body){showSheet(title,body+'<button class="help-confirm" data-dismiss="sheet">我知道了</button>')}
function methodSheet(){
 const required=snapshot.minimumCoverage??Math.ceil(snapshot.coverage.total/2);
 helpSheet('美联储鹰鸽指数如何计算',`<p class="sheet-description">以近90天有效个人政策文本测算，0–100分，45–55分为中性。当前覆盖 ${snapshot.coverage.covered}/${snapshot.coverage.total} 人；不足 ${required} 人时不显示综合分。缺失、仅有活动预告或未表达方向的内容均不补成50分。</p><details class="method-details"><summary>评分与权重</summary><p>0–24鸽派，25–44偏鸽，45–55中性，56–74偏鹰，75–100鹰派。</p><p>明确加息或降息主张的基础强度为3，减少限制为2，维持限制性政策为1.5，通胀上行或就业下行风险为1；有条件的主张减半。每类最多两条独立证据，同义复述不重复计分。单篇分数为50×[1＋(鹰向强度－鸽向强度)/(两者强度之和＋3)]，不是加息概率。</p><p>先在同一官员的发言之间使用30天时间常数加权，再汇总官员分数。主席权重2，理事会副主席与纽约联储主席1.5，监管副主席及其他官员1；投票委员再乘1.25。兼任只取最高职务权重。</p><p>时间权重调整的是同一人各篇发言的相对影响，不会把仅有一篇的旧观点自动降到中性；超过90天退出。声明和纪要用于集体政策背景，不拆成个人分数。</p><p>当前 ${snapshot.calibration?.total??0} 篇计分文本中，${snapshot.calibration?.reviewed??0} 篇经过AI辅助语义复核。历史和同日归因按当前名单、规则及固定顺序回算，非当时发布记录；尚未进行预测能力验证。</p></details>`);
 dialog.classList.add('method-sheet');
}
function sourcesSheet(){showSheet('官方来源与核查状态',`<p class="sheet-description">本次检查：${new Date(snapshot.checkedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})} 北京时间。</p><div class="page-card"><h2>委员与投票权</h2><p>${sourceLink(snapshot.rosterSource,'美联储 FOMC 官方名单')}</p><p>${snapshot.rosterYear} 年 · ${snapshot.coverage.voterTotal} 位投票成员。当前观察名单共 ${snapshot.coverage.total} 人；职务为已核定配置，票权由FOMC名单核对。投票名单核查日期 ${fullDate(snapshot.rosterCheckedAt)}。</p></div><div class="page-card">${snapshot.sourceStatus.map(s=>`<a class="research-row" href="${escaped(s.url)}" target="_blank" rel="noopener noreferrer"><div class="row"><b>${escaped(new URL(s.url).hostname)} ↗</b><span style="color:${s.status==='ok'?'#389b88':'#c38b53'}">${s.status==='ok'?'检查成功':'请求失败，待重试'}</span></div><p>${escaped(s.id==='effr'?'纽约联储官方 EFFR API':s.id==='fomc'?'FOMC 名单':s.id==='calendar'?'FOMC 会议日历':s.id==='statement'?'FOMC 政策声明':(s.id==='minutes'||s.id==='latest-minutes')?'FOMC 会议纪要与实名投票':s.id==='document'?'发言原文':'官方讲话与活动目录')}</p></a>`).join('')}</div>`)}
function documentSheet(id){const d=[...snapshot.signals,...Object.values(snapshot.memberSignals||{}).flat()].find(d=>d.id===id);if(!d)return;const m=memberFor(d.member);showSheet(m?.zh||'政策沟通',`<div class="row"><span class="stance" style="color:${colors(d.score).color};background:${colors(d.score).soft}">${stanceOf(d.score)}</span><span class="legend">${fullDate(d.date)}</span></div><h3 style="margin-top:17px;line-height:1.7">${escaped(signalTitle(d))}</h3><p class="sheet-caption">${d.sourceTextKind==='official_summary'?'官方摘要摘录':'官方原文摘录'}</p><div class="sheet-quote">${escaped(d.excerpt||'')}</div><p class="sheet-caption">${sourceLink(d.url,d.sourceTextKind==='official_summary'?'查看官方摘要':'查看完整官方文本')}</p><div class="detail-grid"><div>单篇文本评分<strong>${num(d.score)} / 100</strong></div><div>最近事件回算贡献<strong>${d.impact==null?'—':(d.impact>0?'+':'')+num(d.impact)+' 点'}</strong></div></div><h3>${d.reviewStatus==='reviewed'?'逐篇复核后的评分依据':'自动识别的评分依据'}</h3><p class="sheet-body">${escaped(signalExcerpt(d))}</p><p class="sheet-body" style="margin-top:8px">${d.labels.map(escaped).join('；')}</p>`)}
function memberSheet(id){
 const m=memberFor(id);if(!m)return;const rows=(snapshot.memberSignals?.[id]||snapshot.signals.filter(d=>d.member===id)).map(d=>({...d,impact:d.impact??snapshot.signals.find(x=>x.id===d.id)?.impact??null})),tone=colors(m.score),vote=m.voteEvidence;
 const recent=rows.length?[...rows].sort((a,b)=>b.date.localeCompare(a.date)).map((d,i)=>`<button class="member-text-record" data-document="${escaped(d.id)}" aria-label="查看${escaped(signalTitle(d))}"><span class="member-text-date-row"><time datetime="${escaped(d.date)}">${fullDate(d.date)}</time>${i===0?'<span class="member-text-score-label">单次鹰鸽评分</span>':''}</span><span class="member-text-main"><span class="member-text-title">${escaped(signalExcerpt(d))}</span></span><span class="member-text-score" style="color:${colors(d.score).color}">${num(d.score)}</span></button>`).join(''):'<div class="empty-state">暂无已评分发言</div>';
 const other=snapshot.memberOtherTexts?.[id]||[];const otherRows=other.length?`<details class="method-details"><summary>已收录、未计分资料（${other.length}）</summary>${other.map(d=>`<div class="research-row"><b>${escaped(signalTitle(d))}</b><p>${fullDate(d.date)} · ${d.documentKind==='event_notice'?'活动预告，暂无可评分实录':d.status==='policy_no_direction'?'有政策内容，未明确可量化方向':'未提取到足够方向证据'}</p>${sourceLink(d.url,'查看官方资料')}</div>`).join('')}</details>`:'';
 showSheet(m.zh,`<div class="member-summary"><div class="member-summary-score"><span>90天鹰鸽评分</span><div><strong style="color:${tone.color}">${num(m.score)}</strong><span class="member-summary-badge" style="color:${tone.color};background:${tone.soft}">${m.score==null?'未评分':stanceOf(m.score)}</span></div></div><div class="member-summary-vote"><span>${vote?`上次投票(${escaped(vote.date)})`:'上次投票'}</span><div>${vote?`<span class="member-summary-badge ${vote.supported?'vote-support':'vote-against'}">${vote.supported?'支持':'反对'}</span><strong>${voteLabel(vote).replace('支持','').replace('反对','').replace('本次','').replace(/\s/g,'')}</strong>`:'<span>暂无投票记录</span>'}</div></div></div><p class="member-evidence-date">${m.latestDate?'最近有效发言 '+fullDate(m.latestDate)+(m.ageDays>30?' · 较早资料':''):'暂无有效个人方向评分；缺少文字稿、仅有预告或未明确方向时保留为空。'}</p><div class="section-heading"><h2>最新发言</h2></div><div class="member-text-list">${recent}</div>${otherRows}`);
 dialog.classList.add('member-sheet');
 $('#sheet-title').innerHTML=`<span class="member-title"><span class="avatar">${portrait(m)}</span><span class="member-title-copy"><span>${escaped(m.zh)}</span><span class="member-identity">${escaped(m.role)} · ${m.voter?'投票委员':'非投票委员'}</span></span></span>`;
}
function signalsSheet(){const rows=snapshot.signals.filter(s=>state.signalFilter==='all'||(state.signalFilter==='hawk'?s.score>55:s.score<45));showSheet('最新政策信号',`<div class="filter-row">${[['all','全部'],['hawk','偏鹰文本'],['dove','偏鸽文本']].map(([k,n])=>`<button data-signal-filter="${k}" class="${active(k,state.signalFilter)}" aria-pressed="${k===state.signalFilter}">${n}</button>`).join('')}</div><div class="signals-list">${signalRows(rows)}</div>`)}
function historySheet(){const rows=rowsForPeriod().slice().reverse();showSheet('历史读数 · 回算',`<p class="sheet-description">按当前观察名单与规则回算，非当时发布记录。点击日期查看当天变化。</p><div class="history-table"><div class="history-row history-head"><span>日期</span><span>指数</span><span>覆盖</span><span>详情</span></div>${rows.map(r=>`<button class="history-row" data-history-date="${escaped(r.date)}"><span>${shortDate(r.date)}</span><strong>${num(r.score)}</strong><strong>${r.covered}</strong><span>归因 ›</span></button>`).join('')}</div><button class="download" id="download">${icon('download')}导出回算 CSV</button>`)}
async function historyDaySheet(date){
 showSheet(fullDate(date)+' · 每日回算','<p class="empty-state">正在读取当天数据…</p>');const token=historyRequest;
 try{const r=await fetch('/api/pulse?history_date='+encodeURIComponent(date),{cache:'no-store'});if(!r.ok)throw Error('history unavailable');const d=await r.json();if(token!==historyRequest||!dialog.open)return;
 showSheet(fullDate(date)+' · 每日回算',`<div class="detail-grid"><div>当日指数<strong>${num(d.score)}</strong></div><div>较前一日<strong>${d.change==null?'—':sign(d.change)}${d.change==null?'':' 点'}</strong></div></div><p class="sheet-caption">覆盖 ${d.covered}/${d.total} 人${d.score==null?' · 个人文本覆盖不足':''}；按当前规则回算。</p><div class="historical-changes">${d.changes.length?d.changes.map(x=>`<div class="historical-change"><div><b>${escaped(x.calculation?'计算调整':memberFor(x.member)?.zh||'政策发言')}</b><strong>${x.impact==null?'—':(x.impact>0?'+':'')+num(x.impact)+' 点'}</strong></div><p>${escaped(x.calculation?'时间、样本变化及取整差额':signalExcerpt(x))}</p>${x.url?sourceLink(x.url,'官方原文'):''}</div>`).join(''):'<p class="empty-state">当日无新增可评分发言或可比较的有效读数。</p>'}</div><button class="download" data-open="history">返回日期列表</button>`);
 }catch{if(token===historyRequest&&dialog.open)showSheet('历史数据暂不可用','<p class="empty-state">请稍后重试。</p><button class="download" data-open="history">返回日期列表</button>');}
}
function download(){const csv='\ufeffdate,derived_index,covered_members,last_event_date,method,data_kind\r\n'+rowsForPeriod().map(r=>`${r.date},${r.score??''},${r.covered},${r.sourceDate??''},${snapshot.method},RETROSPECTIVE_OFFICIAL_TEXT`).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`fed-pulse-official-text-${state.period}d.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('官方文本回算数据已导出')}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2400)}
function bindChart(){const el=$('#trend-chart');if(!el)return;
 if(!window.echarts){el.innerHTML='<p class="empty-state">图表组件加载失败，请刷新重试</p>';return;}
 const points=rowsForPeriod();trendInstance=echarts.init(el,null,{renderer:'svg'});
 trendInstance.setOption({animation:false,textStyle:{fontFamily:'PingFang SC, sans-serif',fontSize:11},grid:{left:0,right:0,top:18,bottom:78,containLabel:true},tooltip:{trigger:'axis',confine:true,borderWidth:0,backgroundColor:'#fff',textStyle:{fontSize:12,color:'#222'},formatter:p=>{const row=points[p[0].dataIndex];return `${fullDate(row.date)}<br>鹰鸽指数：${num(row.score)}<br>文本覆盖：${row.covered} 人`;}},xAxis:{type:'category',data:points.map(p=>shortDate(p.date)),boundaryGap:false,axisTick:{show:false},axisLine:{lineStyle:{color:'#e8e8e8'}},axisLabel:{fontSize:11,color:'#6b7280',hideOverlap:true,interval:Math.max(1,Math.floor(points.length/4))}},yAxis:{type:'value',min:0,max:100,interval:25,axisLabel:{fontSize:11,color:'#6b7280'},splitLine:{lineStyle:{color:'#eee'}},axisLine:{show:false},axisTick:{show:false}},dataZoom:[{type:'slider',left:0,right:0,height:34,bottom:8,start:0,end:100,showDataShadow:false,borderColor:'#ddd',borderRadius:2,backgroundColor:'#f5f5f5',fillerColor:'rgba(90,130,230,.06)',handleStyle:{color:'#fff',borderColor:'#ccc'},handleSize:'90%',moveHandleSize:0,showDetail:false,dataBackground:{lineStyle:{color:'#bbb'},areaStyle:{color:'#eee'}},selectedDataBackground:{lineStyle:{color:'#aebacb'},areaStyle:{color:'#eee'}}}],series:[{type:'line',step:'end',data:points.map(p=>p.score),connectNulls:false,showSymbol:false,lineStyle:{color:'#5A82E6',width:2},itemStyle:{color:'#5A82E6'},areaStyle:{origin:'start',color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(90,130,230,.20)'},{offset:1,color:'rgba(90,130,230,0)'}]}}}]});
}
window.addEventListener('resize',()=>{trendInstance?.resize();probabilityInstance?.resize()});

async function refresh(wait=false){
 if(refreshBusy)return;refreshBusy=true;$('#refresh-button')?.classList.add('spinning');
 try{const response=await fetch('/api/pulse'+(wait?'?wait=1':''),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();if(!data.members||!data.coverage||!data.history)throw Error('无效响应');snapshot=data;render();if(wait)toast(data.refreshing?'正在检查官方来源，先显示最近有效读数':'已读取最近核实数据');if(data.refreshing)setTimeout(()=>refresh(),12000)}catch(e){if(!snapshot)main.innerHTML='<div class="content"><div class="empty-state">官方数据暂时不可用，请稍后重新打开页面。</div></div>';toast('数据请求失败，请稍后重试')}finally{refreshBusy=false;$('#refresh-button')?.classList.remove('spinning')}
}
main.innerHTML='<div class="content"><div class="empty-state">正在读取已核实的官方数据…</div></div>';
function meetingSheet(){
 const dates=snapshot.probabilities?.availableMeetings||[];if(!dates.length)return;
 const selected=probabilityData()?.meetingDate||dates[0];
 showSheet('选择会议日期',`<div class="meeting-radio-list" role="radiogroup" aria-label="FOMC会议日期">${dates.map((date,i)=>`<button class="meeting-radio ${date===selected?'selected':''}" role="radio" aria-checked="${date===selected}" data-meeting="${date}"><i class="meeting-radio-mark" aria-hidden="true"></i><span>${chineseDate(date)}</span>${i===0?'<small>最近一次</small>':''}</button>`).join('')}</div>`);
}
function searchSheet(){showSheet('查找委员与政策信号','<input class="search-input" id="member-search" placeholder="输入委员姓名或讲话关键词" aria-label="搜索委员与信号"><div id="search-results"></div>');$('#member-search').focus();updateSearch('');}
function updateSearch(q){const members=snapshot.members.filter(m=>(m.zh+' '+m.name+' '+m.role).toLowerCase().includes(q.toLowerCase()));const signals=snapshot.signals.filter(d=>(signalTitle(d)+' '+d.title+' '+d.excerpt).toLowerCase().includes(q.toLowerCase())).slice(0,10);$('#search-results').innerHTML=`${members.map(m=>`<button class="meeting-option" data-member="${m.id}">${escaped(m.zh)}<small>${num(m.score)} · ${stanceOf(m.score)}</small></button>`).join('')}${q?signalRows(signals):''}${members.length||signals.length?'':'<p class="empty-state">未找到匹配内容</p>'}`;}
function localComments(){try{const rows=JSON.parse(localStorage.getItem('fed-demo-comments')||'[]');return Array.isArray(rows)?rows.filter(r=>typeof r.text==='string'&&typeof r.id==='string').slice(0,20):[]}catch{return []}}
function commentsSheet(){
 const rows=localComments();showSheet('评论 · 本机演示',`<label class="comment-label" for="demo-comment">写下你的看法</label><textarea class="comment-input" id="demo-comment" maxlength="500" placeholder="最多500字" aria-label="评论内容"></textarea><button class="download primary" id="save-demo-comment">保存本机留言</button><p class="sheet-caption">仅保存在当前浏览器，本机可见。</p><div class="local-comment-list">${rows.length?rows.map(r=>`<article class="local-comment"><p>${escaped(r.text)}</p><div><time>${new Date(r.time).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</time><button data-delete-comment="${escaped(r.id)}">删除</button></div></article>`).join(''):'<p class="empty-state">暂无本机留言</p>'}</div>`);
}
function subscribed(){try{return localStorage.getItem('fed-subscribed')==='true'}catch{return false}}
function actionSheet(action){
 if(action==='comments')commentsSheet();
 if(action==='subscribe'){showSheet('订阅指数提醒',`<p class="sheet-description">将订阅偏好保存在本机，关注指数变化和政策信号。</p><label class="check-row"><span>美联储鹰鸽指数</span><input id="subscription-toggle" type="checkbox" ${subscribed()?'checked':''}></label><p class="sheet-caption">此演示仅保存本机关注状态。</p><button class="download primary" id="save-subscription">保存订阅偏好</button>`);}
 if(action==='share')showSheet('分享美联储鹰鸽指数',`<p class="sheet-description">当前指数 ${num(snapshot.score)} 分 · ${stanceOf(snapshot.score)}<br>有效信号 ${fullDate(snapshot.eventDate)}</p><button class="download primary" id="copy-share">复制页面链接</button><p class="sheet-caption">可将链接发送给好友；微信原生分享需在小程序环境中使用。</p>`);
 if(action==='image')showSheet('生成数据长图','<p class="sheet-description">将当前页面和数据时间导出为 PNG 图片。</p><button class="download primary" id="generate-image">生成并下载长图</button>');
 if(action==='float')showSheet('加入指数浮窗',`<p class="sheet-description">在当前页面显示精简指数，滚动阅读时继续关注。</p><button class="download primary" id="toggle-float">${$('#floating-index').hidden?'加入浮窗':'关闭浮窗'}</button>`);
}
document.addEventListener('input',e=>{if(e.target.id==='member-search')updateSearch(e.target.value)});
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.camp){state.camp=state.camp===b.dataset.camp?'all':b.dataset.camp;state.expanded=false;render();}
 if(b.id==='voters-only'){state.camp='all';state.memberFilter=state.memberFilter==='voters'?'all':'voters';state.expanded=false;render();}
 if(b.id==='cancel-picker')closeSheet();
 if(b.dataset.meeting){state.meetingDate=b.dataset.meeting;closeSheet();render();}
 if(b.dataset.open==='meetings')meetingSheet();if(b.dataset.open==='search')searchSheet();
 if(b.dataset.action)actionSheet(b.dataset.action);
 if(b.id==='back-button'){render();window.scrollTo({top:0,behavior:'smooth'});}
 if(b.id==='save-subscription'){try{localStorage.setItem('fed-subscribed',String($('#subscription-toggle').checked));closeSheet();toast('订阅偏好已保存在本机');}catch{toast('当前浏览器无法保存本机偏好');}}
 if(b.id==='save-demo-comment'){const text=$('#demo-comment').value.trim();if(!text){toast('请先填写留言');return;}try{const rows=[{id:crypto.randomUUID(),text:text.slice(0,500),time:new Date().toISOString()},...localComments()].slice(0,20);localStorage.setItem('fed-demo-comments',JSON.stringify(rows));commentsSheet();toast('留言已保存在本机');}catch{toast('当前浏览器无法保存留言');}}
 if(b.dataset.deleteComment){try{localStorage.setItem('fed-demo-comments',JSON.stringify(localComments().filter(r=>r.id!==b.dataset.deleteComment)));commentsSheet();}catch{toast('当前浏览器无法修改留言');}}
 if(b.id==='copy-share'){try{await navigator.clipboard.writeText(location.href);toast('链接已复制');}catch{showSheet('复制页面链接',`<input class="search-input" readonly value="${escaped(location.href)}" aria-label="页面链接"><p class="sheet-caption">请选中并复制链接</p>`);}}
 if(b.id==='toggle-float'){const box=$('#floating-index');box.hidden=!box.hidden;box.innerHTML=`<button id="dismiss-float" aria-label="关闭指数浮窗">×</button><small>鹰鸽指数</small><strong>${num(snapshot.score)}</strong><span>${stanceOf(snapshot.score)}</span>`;closeSheet();}
 if(b.id==='dismiss-float')$('#floating-index').hidden=true;
 if(b.id==='generate-image'){b.disabled=true;b.textContent='正在生成…';try{await document.fonts.ready;const data=await htmlToImage.toPng(main,{pixelRatio:2,backgroundColor:'#fff',cacheBust:false});const link=document.createElement('a');link.download=`美联储鹰鸽指数-${snapshot.eventDate}.png`;link.href=data;link.click();showSheet('数据长图已生成',`<a class="download primary" href="${data}" download="美联储鹰鸽指数-${snapshot.eventDate}.png">保存 PNG 长图</a><img id="generated-image" style="width:100%;margin-top:14px" src="${data}" alt="美联储鹰鸽指数数据长图">`);toast('数据长图已生成');}catch{b.disabled=false;b.textContent='重试生成长图';toast('生成失败，请重试');}}
});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='refresh-button')refresh(true);if(b.id==='close-sheet'||b.dataset.dismiss==='sheet')closeSheet();if(b.dataset.historyDate){historyDaySheet(b.dataset.historyDate);}if(b.dataset.period){state.period=+b.dataset.period;render()}if(b.dataset.memberFilter){state.memberFilter=b.dataset.memberFilter;state.expanded=false;render()}if(b.dataset.expand){state.expanded=!state.expanded;render();if(!state.expanded)$('#committee-section')?.scrollIntoView({block:'start'})}if(b.dataset.member)memberSheet(b.dataset.member);if(b.dataset.document)documentSheet(b.dataset.document);if(b.dataset.signalFilter){state.signalFilter=b.dataset.signalFilter;signalsSheet()}if(b.dataset.open==='method')methodSheet();if(b.dataset.open==='attribution-help')helpSheet('指数变化归因是什么','<p class="sheet-body">按固定顺序逐篇加入最近一批发言并重算，衡量新增内容的影响。正值推高指数，负值拉低指数；计算调整补齐时间、样本与取整差额，合计与总变化一致。这是当前规则的回算，并非当时发布流水。</p>');if(b.dataset.open==='coverage')coverageSheet();if(b.dataset.open==='decision')decisionSheet();if(b.dataset.open==='sources')sourcesSheet();if(b.dataset.open==='signals')signalsSheet();if(b.dataset.open==='history')historySheet();if(b.id==='load-more-signals')loadMoreSignals();if(b.id==='download')download()});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSheet()}});
document.addEventListener('change',e=>{if(e.target.id==='fedwatch-meeting'){state.meetingDate=e.target.value;render()}});
refresh();setInterval(()=>{if(!document.hidden)refresh()},300000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});

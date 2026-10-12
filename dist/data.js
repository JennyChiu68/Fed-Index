// All observations here are fictional, deliberately detached from real officials.
// The prototype never fetches or implies live policy / futures data.
export const scenarios = {
 hawk:{score:68,previous:62,week:57,label:'偏鹰派',color:'#df8752',soft:'#fff1e5',update:'10.12 14:30',status:'模拟事件已更新',summary:'通胀仍是关注重点。',description:'示例官员更强调保持限制性政策，推动沟通指数上行。',market:[35,58,7],nextMarket:[48,44,8],gap:'政策沟通偏鹰，市场仍保留降息预期。',members:[78,72,71,68,49,35],signals:[{name:'理事 A',initial:'A',role:'示例投票委员',title:'通胀回落仍需更多证据',quote:'在确认通胀持续回到目标之前，政策需要保持足够的限制性。',impact:4,score:81,time:'14:30',reason:'示例文本强调限制性政策，并提高降息所需的证据门槛。'},{name:'地区联储主席 B',initial:'B',role:'示例投票委员',title:'不宜过早放松政策',quote:'过早放松可能使通胀进展逆转，我们可以耐心等待。',impact:2,score:72,time:'11:20',reason:'示例文本强调过早宽松的风险，方向偏鹰。'},{name:'理事 C',initial:'C',role:'示例投票委员',title:'就业降温值得关注',quote:'如果就业市场进一步转弱，我们应准备适当调整政策。',impact:-1,score:36,time:'09:10',reason:'示例文本为就业下行时的宽松打开空间，但仍带有条件。'},{name:'权重再平衡',initial:'↻',role:'模型计算项',title:'历史样本时间权重更新',quote:'新增事件触发重新计算，较早的讲话权重减小。',impact:1,score:null,time:'14:30',reason:'这是模型的时间权重贡献，不是一条真实讲话。'}]},
 dove:{score:32,previous:38,week:46,label:'偏鸽派',color:'#389b88',soft:'#eaf6f1',update:'10.12 14:30',status:'模拟事件已更新',summary:'就业风险获得更多关注。',description:'示例官员释放宽松空间，沟通指数向鸽派方向移动。',market:[76,22,2],nextMarket:[85,13,2],gap:'政策沟通偏鸽，市场也在押注宽松。',members:[22,28,35,38,50,65],signals:[{name:'理事 A',initial:'A',role:'示例投票委员',title:'就业下行风险开始增加',quote:'就业面临的风险已经上升，适当降低限制程度可能是合适的。',impact:-4,score:19,time:'14:30',reason:'示例文本明确讨论降低政策限制程度，方向偏鸽。'},{name:'地区联储主席 B',initial:'B',role:'示例投票委员',title:'通胀进展支持政策调整',quote:'近期通胀进展使我们有空间逐步调整政策。',impact:-2,score:28,time:'11:20',reason:'示例文本认为通胀允许宽松，方向偏鸽。'},{name:'理事 C',initial:'C',role:'示例投票委员',title:'仍需关注价格压力',quote:'我们仍需要警惕通胀反弹，并保持政策灵活性。',impact:1,score:64,time:'09:10',reason:'示例文本提出通胀反弹风险，对鸽派变化形成抵消。'},{name:'权重再平衡',initial:'↻',role:'模型计算项',title:'历史样本时间权重更新',quote:'新增事件触发重新计算，较早的讲话权重减小。',impact:-1,score:null,time:'14:30',reason:'这是模型的时间权重贡献，不是一条真实讲话。'}]},
 neutral:{score:50,previous:50,week:52,label:'中性',color:'#8793a4',soft:'#eff2f7',update:'10.12 14:30',status:'模拟事件已更新',summary:'两端风险大致平衡。',description:'示例官员同时关注通胀与就业，沟通立场整体中性。',market:[42,53,5],nextMarket:[55,40,5],gap:'中性沟通下，市场更倾向下次会议维持利率。',members:[68,63,50,49,37,33],signals:[{name:'理事 A',initial:'A',role:'示例投票委员',title:'继续观察通胀与就业',quote:'我们将评估两端风险，未来行动取决于后续数据。',impact:0,score:50,time:'14:30',reason:'示例文本没有明确的宽松或收紧偏好。'},{name:'地区联储主席 B',initial:'B',role:'示例投票委员',title:'应对通胀保持耐心',quote:'在调整政策之前，还需要看到更多通胀进展。',impact:2,score:63,time:'11:20',reason:'示例文本提高宽松门槛，方向偏鹰。'},{name:'理事 C',initial:'C',role:'示例投票委员',title:'就业风险需得到重视',quote:'政策同样需要关注就业市场的下行风险。',impact:-2,score:37,time:'09:10',reason:'示例文本增加就业风险权重，方向偏鸽。'}]},
 quiet:{score:68,previous:68,week:57,label:'偏鹰派',color:'#df8752',soft:'#fff1e5',update:'10.09 22:30',status:'无新增政策信号',summary:'今日没有新增有效讲话。',description:'沿用最近有效读数；市场概率可独立变化。',market:[41,53,6],nextMarket:[52,41,7],gap:'沟通读数保持不变，市场降息预期独立升温。',members:[78,72,71,68,49,35],signals:[]}
};
export const sourceLinks = [
 {name:'FXStreet',kind:'媒体 · 事件更新',text:'已有聚合沟通指数；100 为中性，官员发表新政策评论后调整。借鉴单一读数与事件更新。',url:'https://www.fxstreet.com/economic-calendar/fed-sentiment-index'},
 {name:'RoboMacro',kind:'数据平台 · 公开方法',text:'公开 LLM 评分、时间衰减和角色权重。借鉴方法透明度，不直接复制其参数。',url:'https://robomacro.com/methodology/hawk-dove'},
 {name:'Fed Chirp',kind:'研究产品 · 工作日日更',text:'覆盖讲话与会议文件，提供委员分析。首页的会议分数与每日扫描时间需分开理解。',url:'https://www.fedchirp.com/'},
 {name:'MacroMicro',kind:'数据平台 · 声明指数',text:'AI 分析 FOMC 声明，适合会议与历史比较；不能替代讲话事件更新。',url:'https://en.macromicro.me/video/313/macro-in-2-minutes-tracking-global-central-banks-and-mm-ai-fomc-statement-indices'},
 {name:'Bloomberg Economics',kind:'机构研究 · NLP 指数',text:'存在基于美联储新闻标题的情绪指数；公开页面不足以核实最新完整序列及更新频率。',url:'https://www.bloomberg.com/news/features/2024-04-28/will-the-fed-cut-rates-what-60-000-headlines-say-about-its-next-move'},
 {name:'J.P. Morgan Hawk-Dove Score',kind:'投行 · 研究指标',text:'PIMCO 2025 年 10 月报告披露并引用该指标。已存在投行评分，但未核实免费实时公众页面。',url:'https://www.pimco.com/gb/en/documents/5154cb2f-3a6f-47c1-ad5d-304e7bc3a2e2'},
 {name:'CME FedWatch',kind:'市场预期 · 独立维度',text:'从 30 天联邦基金期货价格计算会议利率概率。用作独立参照，不混入讲话主指数。',url:'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html'}
];
export function stanceOf(score){return score<20?'明显鸽派':score<45?'偏鸽派':score<=55?'中性':score<=80?'偏鹰派':'明显鹰派'}
export function seriesFor(scenario,days){
 const end=Date.UTC(2026,9,12);const current=scenarios[scenario];
 return Array.from({length:days},(_,i)=>{
  const remaining=days-1-i;
  let score;
  if(remaining===0)score=current.score;
  else if(remaining===1)score=current.previous;
  else if(remaining===7)score=current.week;
  else if(scenario==='quiet'&&remaining<=3)score=current.score;
  else {const base=current.score+(current.week-current.score)*Math.min(remaining/7,1);score=Math.round(base+Math.sin(i*.72)*3+Math.sin(i*.23)*4-remaining*.07)}
  return {date:new Date(end-remaining*86400000).toISOString().slice(0,10),score:Math.min(100,Math.max(0,score)),simulated:true};
 });
}

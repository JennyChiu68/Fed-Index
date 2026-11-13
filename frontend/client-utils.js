export function stanceOf(score){return score==null?'暂无评分':score<25?'鸽派':score<45?'偏鸽派':score<=55?'中性':score<75?'偏鹰派':'鹰派'}

export function sourceHealth(s){
 const failures=(s.sourceStatus||[]).filter(x=>x.status==='error'&&x.id!=='document').length+(s.sourceHealth?.failedDocuments||0);
 if(s.stale||s.refreshError)return {state:'stale',label:'数据待更新 · 查看状态'};
 return failures?{state:'partial',label:'部分来源待重试 · 查看状态'}:{state:'ok',label:'查看来源状态'};
}
export function attributionRows(s){
 const rows=(s.changes||[]).filter(d=>Number.isFinite(d.impact)&&d.impact!==0);
 return rows.sort((a,b)=>Number(Boolean(a.calculation))-Number(Boolean(b.calculation))||b.date.localeCompare(a.date)||Math.abs(b.impact)-Math.abs(a.impact)||String(a.id).localeCompare(String(b.id)));
}
export function probabilityTimestamp(p){
 const date=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',...(p.asOfResolution==='date'?{}:{hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}).format(new Date(p.asOf)).replaceAll('/','-');
 const state=p.error||p.refreshError||p.status==='cached'?' · 暂用缓存':p.asOfResolution==='date'?' · 历史值':p.status==='older'?' · 较早数据':'';
 return date+state;
}

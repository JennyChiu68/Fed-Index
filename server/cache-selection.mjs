// A freshly verified published dataset must not be hidden by older runtime cache.
const timestamp=value=>Number.isFinite(Date.parse(value))?Date.parse(value):0;
export function selectOfficialData(seed,cached){
 if(!cached)return seed;
 const latest=timestamp(seed.collectedAt)>timestamp(cached.collectedAt)?seed:cached;
 const oldest=timestamp(latest.collectedAt)-180*86400000,documents=new Map();
 for(const d of [...cached.documents,...seed.documents]){
  if(timestamp(d.date)<oldest)continue;
  const prior=documents.get(d.url);
  if(!prior||timestamp(d.fetchedAt)>timestamp(prior.fetchedAt))documents.set(d.url,d);
 }
 const policies=[cached.policy,seed.policy].filter(Boolean).sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(Boolean(b.voteSource))-Number(Boolean(a.voteSource))||timestamp(b.checkedAt)-timestamp(a.checkedAt));
 return {...latest,...(policies.length?{policy:policies[0]}:{}),documents:[...documents.values()].sort((a,b)=>b.date.localeCompare(a.date))};
}
const rows=data=>data?.meetings?.length?data.meetings:data?.meetingDate?[data]:[];
export function selectFedWatchData(seed,cached){
 if(!cached)return {data:seed,attemptedAt:null,error:null};
 if(seed.meetingDate!==cached.data?.meetingDate)return cached;
 const latest=timestamp(seed.checkedAt)>timestamp(cached.data.checkedAt)?seed:cached.data;
 const errors=new Map((latest.meetingErrors||[]).map(e=>[e.date,e.error]));
 const meetings=new Map(rows(cached.data).map(d=>[d.meetingDate,d]));
 for(const d of rows(seed)){
  const old=meetings.get(d.meetingDate);
  if(!old||timestamp(d.asOf)>timestamp(old.asOf)||timestamp(d.asOf)===timestamp(old.asOf)&&timestamp(d.checkedAt)>timestamp(old.checkedAt))meetings.set(d.meetingDate,d);
 }
 const dates=latest.availableMeetings||rows(latest).map(d=>d.meetingDate);
 const selected=dates.map(date=>meetings.get(date)).filter(Boolean).map(d=>({...d,refreshError:errors.get(d.meetingDate)||null}));
 const nearest=selected.find(d=>d.meetingDate===latest.meetingDate)||latest;
 const seedCheckedLast=timestamp(seed.checkedAt)>timestamp(cached.attemptedAt);
 return {...cached,data:{...latest,...nearest,checkedAt:latest.checkedAt,meetings:selected,availableMeetings:dates},...(seedCheckedLast?{attemptedAt:seed.checkedAt,error:null}:{})};
}

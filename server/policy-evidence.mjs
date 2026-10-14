import {MEMBERS} from './sources.mjs';
const DAY=86400000;
// Decisions are observed facts, not a substitute numerical score for a member's views.
export function decisionEvidence(policy){
 if(!policy?.summary||!policy.date)return null;
 const summary=policy.summary;
 const action=/\b(?:raise|increase) the target range\b/i.test(summary)?'hike':/\b(?:lower|reduce) the target range\b/i.test(summary)?'cut':/\b(?:maintain|keep) the target range\b/i.test(summary)?'hold':null;
 if(!action)return null;
 const amount=/\bby (?:1\/4|a quarter|one-quarter|0\.25) percentage point/i.test(summary)?25:/\bby (?:1\/2|one-half|0\.5) percentage point/i.test(summary)?50:null;
 const forText=/Voting for[^:]*?(?::|\bwere\b)\s*([\s\S]*?)(?=Voting against|$)/i.exec(policy.voteText||'')?.[1]||'';
 const againstText=/Voting against[^:]*?(?::|\bwas\b|\bwere\b)\s*([\s\S]*)/i.exec(policy.voteText||'')?.[1]||'';
 const identify=t=>MEMBERS.filter(m=>new RegExp('\\b'+m.id+'\\b','i').test(t)).map(m=>m.id);
 if(policy.voteDate&&policy.voteDate!==policy.date)return null;
 return {date:policy.date,url:policy.url,voteSource:policy.voteSource||policy.url,action,changeBps:action==='hold'?0:amount,votedFor:identify(forText),votedAgainst:identify(againstText)};
}
export function attachPolicyEvidence(snapshot,policy,now=new Date()){
 const d=decisionEvidence(policy);
 const voters=snapshot.members.filter(m=>m.voter);
 const ids=d?[...d.votedFor,...d.votedAgainst]:[];
 // Reject an incomplete roster, duplicates, future statements, and outdated votes.
 const age=d?now-Date.parse(d.date+'T00:00:00Z'):Infinity;
 const verified=Boolean(d&&age>=0&&age<=90*DAY&&ids.length===voters.length&&new Set(ids).size===ids.length&&voters.every(m=>ids.includes(m.id)));
 const members=snapshot.members.map(m=>({...m,voteEvidence:verified&&ids.includes(m.id)?{date:d.date,url:d.voteSource,action:d.action,changeBps:d.changeBps,supported:d.votedFor.includes(m.id)}:null}));
 const evidenceCovered=members.filter(m=>m.score!=null||m.voteEvidence).length;
 return {...snapshot,members,decision:verified?{...d,supportCount:d.votedFor.length,dissentCount:d.votedAgainst.length,totalVotes:ids.length}:null,coverage:{...snapshot.coverage,evidenceCovered,voteCovered:verified?ids.length:0}};
}

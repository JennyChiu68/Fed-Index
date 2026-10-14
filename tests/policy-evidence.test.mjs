import test from 'node:test';
import assert from 'node:assert/strict';
import {decisionEvidence,attachPolicyEvidence} from '../server/policy-evidence.mjs';
import {extractDocument,discover,parseVoteRecord,publicSnapshot} from '../server/collector.mjs';
import {INDEXES,MEMBERS} from '../server/sources.mjs';
const now=new Date('2026-10-14T03:00:00Z');
const ids=['warsh','williams','barr','bowman','cook','hammack','jefferson','kashkari','logan','paulson','powell','waller'];
const policy={date:'2026-09-16',url:'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm',voteSource:'https://www.federalreserve.gov/monetarypolicy/fomcminutes20260916.htm',voteDate:'2026-09-16',summary:'The Committee decided to raise the target range for the federal funds rate by 1/4 percentage point.',voteText:'Voting for this action: '+ids.join(', ')+'. Voting against this action: None.'};
const snapshot={coverage:{covered:17,total:19,voterCovered:10,voterTotal:12},members:MEMBERS.map(m=>({...m,voter:ids.includes(m.id),score:['powell','bowman'].includes(m.id)?null:65}))};
test('named votes cover missing members without manufacturing personal scores',()=>{
 const s=attachPolicyEvidence(snapshot,policy,now);
 assert.equal(s.coverage.evidenceCovered,19);assert.equal(s.coverage.covered,17);assert.equal(s.coverage.voteCovered,12);
 for(const id of ['powell','bowman']){const m=s.members.find(m=>m.id===id);assert.equal(m.score,null);assert.equal(m.voteEvidence.supported,true);assert.equal(m.voteEvidence.url,policy.voteSource);}
 assert.equal(s.decision.changeBps,25);assert.equal(s.decision.supportCount,12);
});
test('incomplete, mismatched, future and outdated votes cannot claim full coverage',()=>{
 for(const bad of [{...policy,voteText:'Voting for this action: Powell.'},{...policy,voteDate:'2026-07-29'},{...policy,date:'2026-12-09',voteDate:'2026-12-09'},{...policy,date:'2026-01-28',voteDate:'2026-01-28'}]){
  const s=attachPolicyEvidence(snapshot,bad,now);assert.equal(s.decision,null);assert.equal(s.coverage.evidenceCovered,17);assert.equal(s.coverage.voteCovered,0);
 }
});
test('a dissent is a separate fact and not support for the decision',()=>{
 const s=attachPolicyEvidence(snapshot,{...policy,voteText:'Voting for this action: '+ids.filter(x=>x!=='bowman').join(', ')+'. Voting against this action: Bowman.'},now);
 assert.equal(s.decision.supportCount,11);assert.equal(s.decision.dissentCount,1);assert.equal(s.members.find(m=>m.id==='bowman').voteEvidence.supported,false);
});
test('minutes vote parsing requires the same meeting as the decision',()=>{
 const html='<p><strong>Voting for this action:</strong> Powell, Bowman.</p><p><strong>Voting against this action:</strong> None.</p>';
 assert.match(parseVoteRecord(html,policy.voteSource,policy.date).voteText,/Powell, Bowman/);
 assert.throws(()=>parseVoteRecord(html,policy.voteSource,'2026-07-29'),/date_mismatch/);
});
test('Daly event discovery includes official event transcripts and excludes other economists',()=>{
 const source=INDEXES.find(x=>x.id==='sanfrancisco');
 const html='<a href="/news-and-media/events/2026/08/mary-c-daly-esri-international-conference/">Mary Daly</a><a href="/news-and-media/events/2026/08/nicholas-bloom-talk/">Nicholas Bloom</a>';
 const rows=discover(html,source,2026,now);assert(rows.some(x=>/esri/.test(x.url)));assert(rows.every(x=>/daly/.test(x.url)));
});
test('conversation scoring excludes the moderator and respects official speaker markers',()=>{
 const html='<html><h1>Mary C. Daly ESRI conference</h1><time datetime="2026-08-05"></time><h4>Transcript</h4><p>Alan J. Auerbach:</p><p>I support further rate increases to address the economy over the next several meetings.</p><p>Mary C. Daly:</p><p>I support lowering rates to prevent further deterioration of the labor market.</p><p>Alan J. Auerbach:</p><p>Inflation remains elevated and I believe we should increase interest rates further.</p></html>';
 const ownContext='<p>Thank you for inviting me to discuss the economy today. I appreciate the opportunity to explain how I use incoming economic data, research, conversations with business leaders, and a wide range of information in developing my economic outlook and assessing the balance of risks.</p>';
 const d=extractDocument(html.replace('<p>Mary C. Daly:</p>','<p>Mary C. Daly:</p>'+ownContext),{member:'daly',bank:'sanfrancisco',url:'https://www.frbsf.org/news-and-media/events/2026/08/mary-c-daly-example/',date:'2026-08-05'});
 assert(d.score<45);assert(d.evidence.every(e=>e.direction==='dove'));assert(d.paragraphs.every(p=>!p.includes('rate increases')));
});

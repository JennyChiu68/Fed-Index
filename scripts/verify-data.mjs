import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {scoreText,aggregate,compose,DAY} from '../server/analysis.mjs';
import {publicSnapshot,parseRoster,extractDate} from '../server/collector.mjs';
import {ALLOWED_HOSTS} from '../server/sources.mjs';
const data=JSON.parse(await readFile(new URL('../data/verified-source-data.json',import.meta.url),'utf8'));
const snapshot=publicSnapshot(data);const now=new Date();
assert.equal(new Set(data.documents.map(d=>d.url)).size,data.documents.length,'document URL uniqueness');
assert.equal(new Set(data.roster.members.map(m=>m.id)).size,19);
assert.equal(data.roster.members.filter(m=>m.voter).length,12);
for(const d of data.documents){
 assert.ok(ALLOWED_HOSTS.has(new URL(d.url).hostname),d.url);
 assert.ok(Date.parse(d.date)<=Date.now(),'future source document');
 assert.ok(d.date>=new Date(now-181*DAY).toISOString().slice(0,10),'source lookback');
 if(d.rawScore!=null){assert.ok(d.rawScore>=-1&&d.rawScore<=1);assert.ok(d.evidence.length);assert.equal(scoreText(d.paragraphs).score,d.score,'cached model consistency');assert.ok(d.evidence.every(e=>e.excerpt.replace(/…$/,'').split(/\s+/).length<=22));}
}
assert.ok(data.rate.percentRate>0&&data.rate.percentRate<30);
assert.ok(data.rate.targetRateFrom<=data.rate.percentRate&&data.rate.percentRate<=data.rate.targetRateTo);
assert.ok(data.rate.effectiveDate<=now.toISOString().slice(0,10));
const oldest=aggregate(data.documents,data.roster,'2000-01-01');assert.equal(oldest.score,null,'empty histories do not fabricate neutral');
const futureOnly=aggregate([{member:'warsh',rawScore:1,date:'2099-01-01'}],data.roster,now.toISOString().slice(0,10));assert.equal(futureOnly.score,null);
assert.equal(scoreText(['Welcome to this banking regulation and payments infrastructure conference.']).score,null);
assert.equal(scoreText(['Suppose that a majority of the voters decide that policy needs to be more restrictive.']).score,null);
assert.equal(scoreText(['I do not expect additional rate hikes to be necessary over the coming months.']).score,null,'negated intentions');
assert.ok(scoreText(['I anticipate additional hikes to support a timelier return of inflation to our two percent goal.']).score>55);
assert.ok(scoreText(['I support lowering rates to prevent further deterioration of the labor market.']).score<45);
const withoutMissing={...data.roster,members:data.roster.members.filter(m=>snapshot.members.find(x=>x.id===m.id)?.score!=null)};
assert.equal(aggregate(data.documents,data.roster,snapshot.eventDate).score,aggregate(data.documents,withoutMissing,snapshot.eventDate).score,'missing members not filled with neutral');
assert.equal(snapshot.history.at(-1).score,snapshot.score);
assert.equal(snapshot.history.at(-1).date,snapshot.eventDate);
assert.ok(snapshot.coverage.evidenceCovered>=snapshot.coverage.covered&&snapshot.coverage.evidenceCovered<=snapshot.coverage.total);
if(snapshot.decision){assert.equal(snapshot.coverage.voteCovered,12);assert.equal(snapshot.decision.totalVotes,12);assert.ok(snapshot.members.filter(m=>m.score==null&&m.voteEvidence).every(m=>m.rawScore==null),'votes never manufacture text scores');}

if(snapshot.change!=null)assert.ok(Math.abs(snapshot.changes.reduce((n,c)=>n+(c.impact||0),0)-snapshot.change)<.11,'attribution residual reconciles');
const errors=data.sourceStatus.filter(s=>s.status==='error');
const report={checkedAt:now.toISOString(),documents:data.documents.length,scoredDocuments:data.documents.filter(d=>d.score!=null).length,coverage:snapshot.coverage,decision:snapshot.decision,score:snapshot.score,latestEvent:snapshot.eventDate,sourceFailures:errors.map(e=>({id:e.id,url:e.url})),missingMembers:snapshot.members.filter(m=>m.score==null).map(m=>m.name),missingPolicyEvidence:snapshot.members.filter(m=>m.score==null&&!m.voteEvidence).map(m=>m.name),tests:'passed',limitations:['Rule measurement is research-grade and has not been backtested or independently calibrated.','Some official appearances have video or no transcript; these are excluded.','Retrospective history uses the current roster and model.','CME probabilities use the public FedWatch Current table; source timestamps and cache failures are preserved. These are futures-implied probabilities, independent of the text index.']};
await writeFile(new URL('../data/quality-report.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {scoreText,compose,minimumCoverage,reconstructDay,calculationDay} from '../server/analysis.mjs';
import {parseRoster,parseCalendar,nextOfficialMeeting,minutesReleaseDate,policyParagraphs,parsePolicy} from '../server/collector.mjs';
import {meetingMatchesExpectation} from '../server/fedwatch.mjs';
import {policyContextFor} from '../server/policy-context.mjs';
const roster={year:2026,checkedAt:'2026-11-12T00:00Z',members:Array.from({length:19},(_,i)=>({id:'m'+i,weight:1,voter:i<12}))};
const docs=n=>Array.from({length:n},(_,i)=>({id:'url'+i,url:'url'+i,member:'m'+i,date:'2026-11-10',rawScore:.5,score:75}));
test('coverage must reach half the active roster and missing baselines stay unavailable',()=>{
 assert.equal(minimumCoverage(roster),10);assert.equal(compose(docs(9),roster,new Date('2026-11-12T00:00Z')).score,null);assert.equal(compose(docs(10),roster,new Date('2026-11-12T00:00Z')).score,75);
 const s=compose(docs(9),roster,new Date('2026-11-12T00:00Z'));assert.equal(s.week,null);assert.equal(s.change,null);
});
test('an explicit undirected policy view is distinct from insufficient evidence, without manufacturing 50',()=>{
 for(const sentence of ['I support holding the policy rate unchanged at the next meeting.','I do not believe further rate increases are necessary.','Inflation has improved substantially and is on track to return to our 2 percent target.']){const x=scoreText([sentence]);assert.equal(x.score,null);assert.equal(x.status,'policy_no_direction');}
 assert.equal(scoreText(['Welcome to the payments innovation conference.']).status,'insufficient_policy_evidence');
 for(const sentence of ['I expect that monetary policy will need to move to a restrictive stance.','I currently estimate the target range needs to rise an additional 50 basis points.','What we have seen is stubbornly elevated inflation.'])assert.ok(scoreText([sentence]).score>55);
});
test('daily and latest-event reconstructions use additive sequential changes and an explicit residual',()=>{
 const r={...roster,members:roster.members.slice(0,3)};const data=[{id:'a',url:'a',member:'m0',date:'2026-11-09',rawScore:0,score:50},{id:'b',url:'b',member:'m1',date:'2026-11-09',rawScore:0,score:50},{id:'c',url:'c',member:'m2',date:'2026-11-10',rawScore:1,score:100},{id:'d',url:'d',member:'m0',date:'2026-11-10',rawScore:.8,score:90}];
 const day=reconstructDay(data,r,'2026-11-10');assert.equal(day.previous,50);assert.equal(day.changes.filter(x=>!x.calculation).length,2);assert.ok(day.changes.filter(x=>!x.calculation).every(x=>x.impactType==='sequential_reconstruction'));assert.ok(Math.abs(day.changes.reduce((n,x)=>n+(x.impact||0),0)-day.change)<1e-9);
 const next=reconstructDay(data,r,'2026-11-11');assert.equal(next.changes.filter(x=>!x.calculation).length,0);
 assert.equal(calculationDay(new Date('2026-11-12T16:01:00Z')),'2026-11-13');
});
test('calendar reads future-year sections, handles cross-month meetings and advances after a published decision',()=>{
 const html='<h4>2026 FOMC Meetings</h4><p>December 8-9</p><h4>2025 FOMC Meetings</h4><p>October 28-29</p><h4>2027 FOMC Meetings</h4><p>January 26-27 March 16-17 April/May 30-1</p>';
 const c=parseCalendar(html,new Date('2026-12-10T12:00Z'));assert.equal(c.next.end,'2027-01-27');assert.ok(c.meetings.some(m=>m.start==='2027-04-30'&&m.end==='2027-05-01'));
 assert.equal(nextOfficialMeeting(c,{date:'2026-12-09'},new Date('2026-12-09T20:05Z')).end,'2027-01-27');
 assert.equal(meetingMatchesExpectation('2027-01-27','2026-12-09',['2026-12-09','2027-01-27'],new Date('2026-12-09T20:05Z')),true);
 assert.equal(meetingMatchesExpectation('2027-03-17','2026-12-09',['2026-12-09','2027-01-27','2027-03-17'],new Date('2026-12-09T20:05Z')),false);
 assert.equal(meetingMatchesExpectation('2027-01-27','2026-12-09',['2026-12-09','2027-01-27'],new Date('2026-12-08T20:05Z')),false);
});
test('old-year FOMC heading is accepted only before the verified first annual meeting',()=>{
 const voters=['warsh','williams','barr','bowman','cook','hammack','jefferson','kashkari','logan','paulson','powell','waller'];const html='<h3>2026 Committee Members</h3>'+voters.join(' ')+' Alternate Members';const calendar={meetings:[{start:'2027-01-26',end:'2027-01-27'}]};
 const r=parseRoster(html,new Date('2027-01-01T12:00Z'),{calendar});assert.equal(r.carryover,true);assert.ok(r.members.filter(m=>!m.voter).every(m=>m.voterNameCheckedAt===null&&m.identityVerifiedAt===null));assert.equal(r.members.filter(m=>m.voterNameCheckedAt).length,12);
 assert.throws(()=>parseRoster(html,new Date('2027-01-26T15:00Z'),{calendar}),/year_mismatch/);assert.throws(()=>parseRoster(html,new Date('2027-01-01T12:00Z')),/year_mismatch/);
});
test('source-bound policy reviews never survive a changed official text',()=>{
 const review=JSON.parse(fs.readFileSync(new URL('../data/policy-context-reviews.json',import.meta.url))).entries[0];const paragraphs=JSON.parse(review.sourceParagraphs);assert.equal(policyContextFor(review.url,paragraphs).summaryKind,'source_bound_chinese_review');assert.equal(policyContextFor(review.url,[...paragraphs,'Official correction published.']).summaryKind,'official_original_excerpt');
 const c='<a href="/monetarypolicy/fomcminutes20260916.htm">HTML</a><p>(Released October 07, 2026)</p>';assert.equal(minutesReleaseDate(c,'https://www.federalreserve.gov/monetarypolicy/fomcminutes20260916.htm'),'2026-10-07');
});
test('historical HTTP view validates bounds and returns an explicitly reconstructed day without CME calls',async()=>{
 const {handlePulse}=await import('../server/service.mjs');const today=calculationDay(new Date());const context={waitUntil(){throw Error('historical reads must not refresh upstream')}};
 const valid=await handlePulse(new Request('https://demo/api/pulse?history_date='+today),{},context);assert.equal(valid.status,200);const view=await valid.json();assert.equal(view.kind,'reconstructed');assert.equal(view.date,today);
 for(const value of ['not-a-date','2026-13-40','2099-01-01','2000-01-01']){const r=await handlePulse(new Request('https://demo/api/pulse?history_date='+value),{},context);assert.equal(r.status,400);}
});
test('the collector attaches reviewed statement and minutes context with the release date from the calendar',async()=>{
 const {collect}=await import('../server/collector.mjs');const {FOMC_URL,CALENDAR_URL,RATE_URL}=await import('../server/sources.mjs');
 const reviews=JSON.parse(fs.readFileSync(new URL('../data/policy-context-reviews.json',import.meta.url))).entries;const htmlFor=r=>'<html>'+JSON.parse(r.sourceParagraphs).map(p=>'<p>'+p.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'</p>').join('')+'</html>';
 const voters='warsh williams barr bowman cook hammack jefferson kashkari logan paulson powell waller';const fomc='<h3>2026 Committee Members</h3>'+voters+' Alternate Members <a href="'+reviews[0].url+'">Recent Statement</a><a href="'+reviews[1].url+'">Recent Minutes</a>';
 const calendar='<h4>2026 FOMC Meetings</h4><p>September 15-16 October 27-28 December 8-9</p><a href="'+reviews[1].url+'">HTML</a><p>(Released October 07, 2026)</p><h4>2027 FOMC Meetings</h4><p>January 26-27</p>';
 const result=await collect({now:new Date('2026-11-12T08:00Z'),fetchText:async url=>url===FOMC_URL?fomc:url===CALENDAR_URL?calendar:url===RATE_URL?JSON.stringify({refRates:[{effectiveDate:'2026-11-10',percentRate:3.88}]}):reviews.some(r=>r.url===url)?htmlFor(reviews.find(r=>r.url===url)):'<html><h1>Directory</h1></html>'});
 assert.equal(result.policy.context.summaryKind,'source_bound_chinese_review');assert.equal(result.latestMinutes.context.summaryKind,'source_bound_chinese_review');assert.equal(result.latestMinutes.releaseDate,'2026-10-07');assert.equal(result.latestMinutes.context.meetingStart,'2026-09-15');assert.equal(result.calendar.next.end,'2026-12-09');
});
test('all current scored sources remain available to search',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../data/verified-source-data.json',import.meta.url)));const now=new Date('2026-11-12T08:00Z');
 const current=compose(data.documents,data.roster,now);assert.equal(current.signals.length,27);assert.ok(current.signals.some(d=>d.member==='warsh'));
});

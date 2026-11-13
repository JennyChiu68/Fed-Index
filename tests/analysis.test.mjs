import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreText,compose,stanceOf} from '../server/analysis.mjs';
import {extractDate,extractDocument} from '../server/collector.mjs';
import {stanceOf as displayStance} from '../frontend/client-utils.js';

test('past votes and collective projections do not establish a personal current preference',()=>{
 assert.equal(scoreText(['I supported the decision to raise rates in September, and I supported the decision to hold rates in October.']).score,null);
 assert.equal(scoreText(['The projections submitted at the September meeting showed that a large majority of FOMC participants believe it will be appropriate to raise rates further.']).score,null);
 assert.equal(scoreText(['I continue to believe monetary policy needs to be somewhat restrictive to bring inflation back to 2 percent.']).score,67);
});

test('explicit forward policy firming is recognized while past tightening is excluded',()=>{
 for(const sentence of ['Further firming will likely be necessary to return inflation to target.','Further removal of monetary policy accommodation will be required.','Tighter policy will be necessary to appropriately balance the outlook and risks.'])assert.ok(scoreText([sentence]).score>55);
 assert.equal(scoreText(['Further firming was necessary last year to return inflation to target.']).score,null);
 assert.equal(scoreText(['But inflation remained too high.']).score,null);
 assert.ok(scoreText(['Inflation has remained too high for too long.']).score>55);
});

test('excerpts retain decimals and U.S. abbreviations',()=>{
 const d=scoreText(['The U.S. economy is growing. At 3.7 percent, inflation is unquestionably too high.']);
 assert.equal(d.excerpt,'At 3.7 percent, inflation is unquestionably too high.');
});
test('the same sentence in a summary and the body counts once',()=>{
 const sentence='The risks to inflation outweigh the risks to maximum employment.';
 assert.equal(scoreText([sentence,'In my view, these risks matter. '+sentence]).score,75);
});

test('current window expires on the calculation date even without new speeches',()=>{
 const roster={year:2026,members:['a','b','c'].map(id=>({id,weight:1,voter:true}))};
 const documents=roster.members.map(m=>({url:m.id,member:m.id,date:'2026-01-01',rawScore:.5,score:75}));
 const s=compose(documents,roster,new Date('2026-04-02T12:00:00Z'));
 assert.equal(s.score,null);assert.equal(s.coverage.covered,0);assert.equal(s.members.filter(m=>m.score!=null).length,0);
 assert.equal(s.history.at(-1).score,null);assert.equal(s.indexDate,'2026-04-02');assert.equal(s.eventDate,'2026-01-01');
});

test('activity dates override unrelated page maintenance dates when the body confirms the event',()=>{
 const html='<div class="cfedDetail__lastUpdated">Last Updated: 10/16/26</div><h1>Conference</h1><div class="calloutBox2023"><p>Austan Goolsbee participated in a moderated Q&A on November 9 in Chicago, Illinois.</p></div>';
 assert.equal(extractDate(html,'https://www.chicagofed.org/publications/speeches/2026/nov-9-conference'),'2026-11-09');
});

test('event notices cannot become scored speeches and list-item policy text is collected',()=>{
 const url='https://www.chicagofed.org/publications/speeches/2026/nov-12-event';
 const description='Austan Goolsbee, president and CEO of the Federal Reserve Bank of Chicago, will participate virtually in a moderated Q&A on November 12 in Chicago, Illinois. '.repeat(3);
 const notice=extractDocument(`<html><h1>Event</h1><div class="calloutBox2023"><p>${description}</p></div></html>`,{url,member:'goolsbee',bank:'chicago'});
 assert.equal(notice.documentKind,'event_notice');assert.equal(notice.score,null);
 const speech=extractDocument(`<html><h1>Alberto Musalem policy remarks</h1><p>${'Thank you for inviting me to discuss the economy and monetary policy today. '.repeat(5)}</p><ul><li>Further firming will likely be necessary to return inflation to target.</li></ul></html>`,{url:'https://www.stlouisfed.org/from-the-president/remarks/2026/example',member:'musalem',bank:'stlouis',date:'2026-10-30'});
 assert.ok(speech.score>55);
});

test('headline and member camp labels use the same boundary values',()=>{
 for(const [score,label] of [[24,'鸽派'],[25,'偏鸽派'],[44,'偏鸽派'],[45,'中性'],[55,'中性'],[56,'偏鹰派'],[74,'偏鹰派'],[75,'鹰派'],[100,'鹰派']]){
  assert.equal(stanceOf(score),label);assert.equal(displayStance(score),label);
 }
});

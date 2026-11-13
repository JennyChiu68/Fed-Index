import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scoreDocument} from '../server/analysis.mjs';
import {publicSnapshot} from '../server/collector.mjs';
import {selectOfficialData} from '../server/cache-selection.mjs';
const read=name=>JSON.parse(readFileSync(new URL('../data/'+name,import.meta.url)));
const seed=read('verified-source-data.json'),reviews=read('speech-calibrations.json');
test('the complete original 90-day scope has exact-source reviews with correctly bounded evidence',()=>{
 assert.equal(reviews.documents.length,27);assert.equal(new Set(reviews.documents.map(d=>d.url)).size,27);
 const weights={'明确支持收紧':3,'支持进一步加息':3,'政策需要收紧':3,'维持限制性政策':1.5,'通胀压力仍高':1,'支持降低利率':3,'减少政策限制':2,'就业下行风险':1};
 for(const r of reviews.documents){const d=seed.documents.find(d=>d.url===r.url);assert.equal(scoreDocument(d).reviewStatus,'reviewed');const counts={};for(const e of r.evidence){assert.ok(d.paragraphs.some(p=>p.includes(e.text)));assert.ok([weights[e.label],weights[e.label]/2].includes(e.strength));counts[e.label]=(counts[e.label]||0)+1;assert.ok(counts[e.label]<=2);}}
 const s=publicSnapshot(seed,new Date('2026-11-12T12:00:00Z'));assert.equal(s.calibration.total,27);assert.equal(s.calibration.reviewed,27);assert.equal(s.calibration.officialSummaries,2);assert.equal(s.score,71);
});
test('a source amendment, activity date or speaker change invalidates the old semantic decision',()=>{
 const d=seed.documents.find(d=>d.member==='logan');
 for(const changed of [{...d,paragraphs:[...d.paragraphs,'The official transcript has been revised.']},{...d,date:'2026-11-11'},{...d,member:'waller'}]){const result=scoreDocument(changed);assert.equal(result.reviewStatus,'source_changed');assert.equal(result.excerptZh,null);assert.equal(result.reviewVersion,null);}
});
test('loading a newer legacy runtime cache applies the reviewed source-bound decision',()=>{
 const d=seed.documents.find(d=>d.member==='hammack'&&d.date==='2026-10-12');
 const cached={...seed,collectedAt:'2026-11-12T08:00:00Z',documents:[{...d,method:'official-text-rules-1.1',score:57,rawScore:.14,fetchedAt:'2026-11-12T08:00:00Z'}]};
 const actual=selectOfficialData(seed,cached).documents.find(x=>x.url===d.url);assert.equal(actual.reviewStatus,'reviewed');assert.equal(actual.score,84);
});

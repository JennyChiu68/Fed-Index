import test from 'node:test';import assert from 'node:assert/strict';
import {sourceHealth,attributionRows,probabilityTimestamp} from '../frontend/client-utils.js';
import {publicSnapshot} from '../server/collector.mjs';
import {readFileSync} from 'node:fs';
const seed=JSON.parse(readFileSync(new URL('../data/verified-source-data.json',import.meta.url)));
test('partial document and directory failures remain visible without pretending the whole snapshot expired',()=>{
 const s=publicSnapshot({...seed,sourceStatus:[{id:'document',url:'https://www.dallasfed.org/news/speeches/logan/2026/lkl261110',status:'error'},{id:'fomc',status:'ok'}]});
 assert.equal(s.sourceHealth.failedDocuments,1);assert.ok(s.sourceStatus.some(x=>x.id==='document'&&x.status==='error')); assert.equal(sourceHealth(s).state,'partial');assert.equal(sourceHealth({sourceStatus:[{status:'error'}]}).state,'partial');assert.equal(sourceHealth({stale:true}).state,'stale');assert.equal(sourceHealth({}).state,'ok');
});
test('attribution shows the calculation residual and every nonzero latest-event effect',()=>{
 const s=publicSnapshot(seed,new Date('2026-11-12T12:00:00Z'));const rows=attributionRows(s);
 assert.ok(rows.at(-1).calculation);assert.equal(rows.filter(x=>!x.calculation).length,s.changes.filter(x=>!x.calculation&&x.impact!==0).length);assert.ok(Math.abs(rows.reduce((n,x)=>n+x.impact,0)-s.change)<.11);
});
test('probabilities carry quote time and distinguish explicit cache and historical states',()=>{
 assert.equal(probabilityTimestamp({asOf:'2026-11-12T07:33:31Z',status:'ok'}),'2026-11-12 15:33');
 assert.match(probabilityTimestamp({asOf:'2026-11-12T07:33:31Z',error:'upstream'}),/暂用缓存/);
 assert.equal(probabilityTimestamp({asOf:'2026-11-10T00:00:00Z',asOfResolution:'date'}),'2026-11-10 · 历史值');
});

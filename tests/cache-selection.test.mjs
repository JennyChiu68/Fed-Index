import test from 'node:test';
import assert from 'node:assert/strict';
import {selectOfficialData,selectFedWatchData} from '../server/cache-selection.mjs';
const doc=(url,fetchedAt,value)=>({url,date:'2026-10-08',fetchedAt,value});
test('fresh verified publication replaces older cached metadata without losing other verified documents',()=>{
 const cached={collectedAt:'2026-10-13T03:00:00Z',documents:[doc('same','2026-10-13T03:00:00Z','old'),doc('extra','2026-10-13T03:00:00Z','keep')]};
 const seed={collectedAt:'2026-10-13T04:00:00Z',documents:[doc('same','2026-10-13T04:00:00Z','new')]};
 const result=selectOfficialData(seed,cached);
 assert.equal(result.collectedAt,seed.collectedAt);assert.equal(result.documents.find(d=>d.url==='same').value,'new');assert.ok(result.documents.some(d=>d.url==='extra'));
 assert.equal(selectOfficialData(cached,seed).collectedAt,seed.collectedAt);
});
test('expired documents do not reappear through cache merging',()=>{
 const seed={collectedAt:'2026-10-13T04:00:00Z',documents:[]};
 const cached={collectedAt:'2026-10-12T04:00:00Z',documents:[{url:'expired',date:'2025-01-01'}]};
 assert.equal(selectOfficialData(seed,cached).documents.length,0);
});
const meeting=(date,asOf,checkedAt,value)=>({meetingDate:date,asOf,checkedAt,value});
test('CME merging preserves a newer source quote even when another snapshot was checked later',()=>{
 const first=meeting('2026-10-28','2026-10-13T03:30:00Z','2026-10-13T03:40:00Z',81);
 const second=meeting('2026-12-09','2026-10-13T03:10:00Z','2026-10-13T03:40:00Z',15);
 const cached={data:{...first,meetings:[first],availableMeetings:[first.meetingDate]},attemptedAt:first.checkedAt,error:'previous_failure'};
 const seed={...meeting(first.meetingDate,'2026-10-13T03:20:00Z','2026-10-13T04:00:00Z',80),meetings:[meeting(first.meetingDate,'2026-10-13T03:20:00Z','2026-10-13T04:00:00Z',80),second],availableMeetings:[first.meetingDate,second.meetingDate],meetingErrors:[]};
 const result=selectFedWatchData(seed,cached);
 assert.equal(result.data.meetings[0].value,81);assert.equal(result.data.meetings.length,2);assert.equal(result.error,null);assert.equal(result.data.meetings[0].asOf,first.asOf);assert.equal(result.data.checkedAt,seed.checkedAt);
});
test('a successful older check does not hide a more recent upstream failure',()=>{
 const first=meeting('2026-10-28','2026-10-12T15:30:00Z','2026-10-13T03:00:00Z',80);
 const seed={...first,checkedAt:'2026-10-13T04:00:00Z',meetings:[first],availableMeetings:[first.meetingDate]};
 const cached={data:first,attemptedAt:'2026-10-13T04:05:00Z',error:'upstream_failed'};
 assert.equal(selectFedWatchData(seed,cached).error,'upstream_failed');
 assert.equal(selectFedWatchData({...seed,meetingDate:'2026-12-09'},cached),cached);
});

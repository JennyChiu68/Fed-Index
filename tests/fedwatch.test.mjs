import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseFedWatch,collectFedWatch,CME_TOOL} from '../server/fedwatch.mjs';
const html=await fs.readFile(new URL('./fixtures/cme-current.html',import.meta.url),'utf8');
const settings={now:new Date('2026-10-12T08:45:00Z'),expectedMeeting:'2026-10-28'};
test('captures the Current column, target ranges and source timestamp',()=>{
 const d=parseFedWatch(html,settings);
 assert.deepEqual([d.cut,d.hold,d.hike],[0,81.2,18.8]);
 assert.equal(d.asOf,'2026-10-12T08:25:56.000Z');
 assert.deepEqual(d.currentRange,{lowerBps:375,upperBps:400});
 assert.equal(d.outcomes.find(o=>o.current).probability,81.2); // prior day is 82.3
});
test('rejects mismatched, expired and future-dated data',()=>{
 assert.throws(()=>parseFedWatch(html,{...settings,expectedMeeting:'2026-12-09'}),/date_mismatch/);
 assert.throws(()=>parseFedWatch(html,{now:new Date('2026-10-29T00:00:00Z')}),/expired/);
 assert.throws(()=>parseFedWatch(html,{...settings,now:new Date('2026-10-11T00:00:00Z')}),/future_timestamp/);
});
test('does not fill an empty Now cell with historical probability',()=>{
 assert.throws(()=>parseFedWatch(html.replace('>81.2%</td>','></td>'),settings));
 assert.throws(()=>parseFedWatch(html.replace('>18.8%</td>','>28.8%</td>'),settings),/sum_invalid/);
 assert.throws(()=>parseFedWatch(html.replace('Data as of','Timestamp unavailable'),settings),/timestamp_missing/);
});
test('converts US Central time with the winter DST offset',()=>{
 const winter=html.replaceAll('28 Oct 2026','9 Dec 2026').replace('12 Oct 2026 03:25:56 CT','1 Dec 2026 03:25:56 CT');
 const d=parseFedWatch(winter,{now:new Date('2026-12-01T10:00:00Z')});
 assert.equal(d.asOf,'2026-12-01T09:25:56.000Z');
});
test('follows the public view flow, carries normal cookies, blocks foreign redirects',async()=>{
 const seen=[];
 const data=await collectFedWatch({...settings,fetchImpl:async(url,options)=>{
  seen.push(url);
  if(seen.length===1){assert.equal(url,CME_TOOL);return new Response('',{status:302,headers:{location:'/User/QuikStrikeTools.aspx?insid=fixture&qsid=fixture','set-cookie':'ASP.NET_SessionId=test; Path=/; HttpOnly'}})}
  assert.match(options.headers.cookie,/ASP.NET_SessionId=test/);
  if(seen.length===2)return new Response('<form action="./QuikStrikeTools.aspx?insid=fixture&amp;qsid=fixture"></form>');
  assert.match(url,/QuikStrikeView\.aspx\?insid=fixture&qsid=fixture/);return new Response(html);
 }});
 assert.equal(data.hold,81.2);assert.equal(seen.length,3);
 await assert.rejects(()=>collectFedWatch({fetchImpl:async()=>new Response('',{status:302,headers:{location:'https://example.com'}})}),/redirect_not_allowed/);
});

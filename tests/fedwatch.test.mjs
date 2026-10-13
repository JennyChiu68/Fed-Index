import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseFedWatch,collectFedWatch,parseMeetingChoices,meetingPostback,CME_TOOL} from '../server/fedwatch.mjs';
const html=await fs.readFile(new URL('./fixtures/cme-current.html',import.meta.url),'utf8');
const settings={now:new Date('2026-10-12T08:45:00Z'),expectedMeeting:'2026-10-28'};
const december=await fs.readFile(new URL('./fixtures/cme-december.html',import.meta.url),'utf8');
const meetingLinks=`<a id="tool_lvMeetings_ctrl0_lbMeeting" href="javascript:__doPostBack(&#39;tool$ctrl0$lbMeeting&#39;,&#39;&#39;)">28 Oct26</a><a id="tool_lvMeetings_ctrl1_lbMeeting" href="javascript:__doPostBack(&#39;tool$ctrl1$lbMeeting&#39;,&#39;&#39;)">9 Dec26</a><a id="tool_lvMeetings_ctrl2_lbMeeting" href="javascript:__doPostBack(&#39;tool$ctrl2$lbMeeting&#39;,&#39;&#39;)">27 Jan27</a>`;
const withForm=(body,state)=>`<form action="/User/QuikStrikeView.aspx?qsid=fixture"><input name="__VIEWSTATE" type="hidden" value="${state}"><input type="hidden" name="__EVENTVALIDATION" value="validation"></form>${meetingLinks}${body}`;
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
test('uses CME date controls and the returned form state; a wrong date never borrows another table',async()=>{
 let call=0;
 const result=await collectFedWatch({now:new Date('2026-10-13T04:00:00Z'),expectedMeeting:'2026-10-28',meetingLimit:3,fetchImpl:async(url,options)=>{
  call++;
  if(call===1)return new Response(withForm(html,'nearest-state'));
  assert.equal(options.method,'POST');
  const params=new URLSearchParams(options.body);
  if(call===2){assert.equal(params.get('__VIEWSTATE'),'nearest-state');assert.equal(params.get('__EVENTTARGET'),'tool$ctrl1$lbMeeting');return new Response(withForm(december,'december-state'))}
  assert.equal(params.get('__VIEWSTATE'),'december-state');assert.equal(params.get('__EVENTTARGET'),'tool$ctrl2$lbMeeting');
  return new Response(withForm(december,'wrong-date-state'));
 }});
 assert.deepEqual(result.availableMeetings,['2026-10-28','2026-12-09','2027-01-27']);
 assert.equal(result.meetings.length,2);assert.equal(result.meetings[1].hold,15.3);assert.equal(result.meetings[1].hike,84.7);
 assert.deepEqual(result.meetingErrors,[{date:'2027-01-27',error:'cme_fomc_date_mismatch'}]);
});
test('only upcoming unique dates are offered and form posts cannot leave the official host',()=>{
 assert.deepEqual(parseMeetingChoices(meetingLinks,new Date('2026-12-01')).map(m=>m.date),['2026-12-09','2027-01-27']);
 assert.throws(()=>parseMeetingChoices(meetingLinks+meetingLinks),/duplicate_meeting/);
 assert.throws(()=>meetingPostback('<form action="https://example.com/"><input name="__VIEWSTATE" type="hidden" value="x"></form>',CME_TOOL,'tool$meeting'),/redirect_not_allowed/);
});

const {test}=require('node:test');const assert=require('node:assert/strict');
const {previewSchedule}=require('../electron/task-scheduler.cjs');
const now=Date.parse('2026-09-18T08:00:00Z');
test('preview uses real scheduler for intervals, once, weekdays and timezone',()=>{
 assert.deepEqual(previewSchedule({kind:'interval',minutes:5},now).times,['2026-09-18T08:05:00.000Z','2026-09-18T08:10:00.000Z','2026-09-18T08:15:00.000Z']);
 assert.deepEqual(previewSchedule({kind:'once',at:'2026-09-19T00:00:00Z'},now).times,['2026-09-19T00:00:00.000Z']);
 assert.deepEqual(previewSchedule({kind:'weekdays',time:'09:00',timezone:'Asia/Shanghai'},now).times,['2026-09-21T01:00:00.000Z','2026-09-22T01:00:00.000Z','2026-09-23T01:00:00.000Z']);
 assert.deepEqual(previewSchedule({kind:'daily',time:'09:00',timezone:'America/New_York'},Date.parse('2026-10-31T14:00:00Z')).times,['2026-11-01T14:00:00.000Z','2026-11-02T14:00:00.000Z','2026-11-03T14:00:00.000Z']);
});
test('preview rejects invalid and expired schedules',()=>{
 for(const schedule of [{kind:'interval',minutes:0},{kind:'once',at:''},{kind:'once',at:'2020-01-01'},{kind:'daily',time:'25:00',timezone:'UTC'},{kind:'daily',time:'09:00',timezone:'invalid'}])assert.throws(()=>previewSchedule(schedule,now));
});

test('multiple weekly days preview across week boundaries',()=>{
 assert.deepEqual(previewSchedule({kind:'customWeek',days:[1,3,5],time:'09:00',timezone:'Asia/Shanghai'},now).times,['2026-09-21T01:00:00.000Z','2026-09-23T01:00:00.000Z','2026-09-25T01:00:00.000Z']);
 for(const days of [[],[1,1],[7],['1'],null])assert.throws(()=>previewSchedule({kind:'customWeek',days,time:'09:00',timezone:'UTC'},now),/运行日/);
});

test('multiple selected weekdays retain local time across DST end',()=>{
 assert.deepEqual(previewSchedule({kind:'customWeek',days:[0,1],time:'09:00',timezone:'America/New_York'},Date.parse('2026-10-31T00:00:00Z')).times,['2026-11-01T14:00:00.000Z','2026-11-02T14:00:00.000Z','2026-11-08T14:00:00.000Z']);
});

test('monthly preview skips absent dates, handles leap years and rejects invalid days',()=>{
 assert.deepEqual(previewSchedule({kind:'monthly',monthDay:31,time:'09:00',timezone:'UTC'},Date.parse('2026-01-31T10:00:00Z')).times,['2026-03-31T09:00:00.000Z','2026-05-31T09:00:00.000Z','2026-07-31T09:00:00.000Z']);
 assert.equal(previewSchedule({kind:'monthly',monthDay:29,time:'09:00',timezone:'UTC'},Date.parse('2028-02-01T00:00:00Z')).times[0],'2028-02-29T09:00:00.000Z');
 for(const monthDay of [0,32,1.5,'1',null])assert.throws(()=>previewSchedule({kind:'monthly',monthDay,time:'09:00',timezone:'UTC'},now),/每月日期/);
});

test('monthly local time adjusts its UTC offset across daylight transitions',()=>{
 assert.deepEqual(previewSchedule({kind:'monthly',monthDay:15,time:'09:00',timezone:'America/New_York'},Date.parse('2026-02-01T00:00:00Z')).times,['2026-02-15T14:00:00.000Z','2026-03-15T13:00:00.000Z','2026-04-15T13:00:00.000Z']);
 assert.deepEqual(previewSchedule({kind:'monthly',monthDay:15,time:'09:00',timezone:'America/New_York'},Date.parse('2026-10-01T00:00:00Z')).times,['2026-10-15T13:00:00.000Z','2026-11-15T14:00:00.000Z','2026-12-15T14:00:00.000Z']);
});

test('Sydney schedules use the selected region through southern-hemisphere DST',()=>{
 assert.deepEqual(previewSchedule({kind:'monthly',monthDay:15,time:'09:00',timezone:'Australia/Sydney'},Date.parse('2026-09-01T00:00:00Z')).times,['2026-09-14T23:00:00.000Z','2026-10-14T22:00:00.000Z','2026-11-14T22:00:00.000Z']);
});

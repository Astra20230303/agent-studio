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

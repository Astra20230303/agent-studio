const {test}=require('node:test');const assert=require('node:assert/strict');
const {orderTasks}=require('../src/taskOrdering.ts');
const task=(id,nextRunAt,status='active',startedAt)=>({id,name:id,status,nextRunAt,runs:startedAt?[{startedAt}]:[]});
test('chronological ordering compares instants across time zones and preserves equal-time order',()=>{
 const tasks=[task('later','2026-09-18T09:00:00+08:00'),task('first-tie','2026-09-18T00:00:00Z'),task('second-tie','2026-09-18T08:00:00+08:00'),task('paused','2020-01-01T00:00:00Z','paused'),task('missing',null)];
 const before=structuredClone(tasks);
 assert.deepEqual(orderTasks(tasks,'next').map(t=>t.id),['first-tie','second-tie','later','paused','missing']);
 assert.deepEqual(tasks,before);assert.notEqual(orderTasks(tasks,'original'),tasks);assert.deepEqual(orderTasks(tasks,'original'),tasks);
});
test('recent runs place missing or invalid dates last without disturbing ties',()=>{
 const tasks=[task('never',null),task('older',null,'completed','2026-09-18T00:00:00Z'),task('newer',null,'paused','2026-09-18T01:00:00Z'),task('invalid',null,'active','invalid')];
 assert.deepEqual(orderTasks(tasks,'recent').map(t=>t.id),['newer','older','never','invalid']);
});

const {test}=require('node:test');const assert=require('node:assert/strict');const {taskRunExport}=require('../src/taskRunExport.ts');
const run={id:'r',status:'failed',trigger:'scheduled',startedAt:'2026-09-18T00:00:00Z',finishedAt:'2026-09-18T00:01:00Z',threadId:'conversation',error:'Error detail',output:'Output detail'};
test('historical name, configuration and actual environment are exported without arbitrary fields',()=>{
 const content=taskRunExport('New name',{...run,configuration:{name:'Old name',prompt:'Original prompt',kind:'agent',model:'old-model',permission:'read-only',reasoningEffort:'high',timeoutMinutes:25,apiKey:'secret'},environment:{cwd:'D:/actual',providerId:'actual-provider',baseUrl:'secret-url'}});
 assert.ok(content.startsWith('Old name\n'));assert.ok(!content.includes('New name'));
 for(const text of ['执行时限：25 分钟','定时执行','conversation','old-model','Original prompt','D:/actual','actual-provider','Error detail','Output detail','high','跟随运行时启用渠道'])assert.ok(content.includes(text),text);
 assert.ok(!content.includes('secret'));
});
test('legacy records and reminders export without invented configuration',()=>{
 const legacy=taskRunExport('Legacy',run);assert.ok(legacy.startsWith('Legacy\n'));assert.match(legacy,/没有配置快照/);assert.match(legacy,/Output detail/);
 const reminder=taskRunExport('New',{...run,configuration:{name:'Reminder',prompt:'Remember',kind:'reminder',model:'',permission:'read-only'}});assert.match(reminder,/Remember/);assert.ok(!reminder.includes('模型：'));
});
test('ended exports include duration from recorded timestamps for every outcome',()=>{
 for(const status of ['completed','failed','interrupted']) {
  const content=taskRunExport('Task',{...run,status,finishedAt:'2026-09-18T01:02:03Z'});
  assert.ok(content.split('\n').includes('耗时 1 小时 2 分 3 秒'));
 }
 assert.ok(taskRunExport('Task',{...run,finishedAt:run.startedAt}).split('\n').includes('耗时 0 秒'));
});
test('invalid historical timestamps remain unknown and running exports avoid clock-dependent duration',()=>{
 for(const patch of [{finishedAt:undefined},{finishedAt:'invalid'},{startedAt:'invalid'},{finishedAt:'2026-09-17T23:59:59Z'}]) {
  assert.ok(taskRunExport('Task',{...run,...patch}).split('\n').includes('耗时未知'));
 }
 assert.doesNotMatch(taskRunExport('Task',{...run,status:'running',finishedAt:undefined}),/耗时|已运行/);
});

const {test}=require('node:test');const assert=require('node:assert/strict');
const {taskHistoryExport}=require('../src/taskHistoryExport.ts');
const run={id:'one',status:'completed',trigger:'manual',startedAt:'2026-09-18T00:00:00Z',output:'First output'};
test('history export preserves selected order, configuration and errors while excluding running entries',()=>{
 const runs=[{...run,id:'failed',status:'failed',error:'Detailed failure',outputTruncated:true,configuration:{name:'Original',prompt:'Old prompt',kind:'agent',model:'model',permission:'read-only',apiKey:'hidden'}},run,{...run,id:'pending',status:'running',output:'Partial'}];
 const result=taskHistoryExport('Current',runs,' needle ','all');
 assert.equal(result.count,2);assert.match(result.content,/搜索：needle/);assert.match(result.content,/结果筛选：全部结果/);
 for(const value of ['运行 ID：failed','运行 ID：one','Original','Old prompt','Detailed failure','仅保留末尾'])assert.ok(result.content.includes(value));
 assert.ok(result.content.indexOf('运行 ID：failed')<result.content.indexOf('运行 ID：one'));
 assert.ok(!result.content.includes('pending'));assert.ok(!result.content.includes('Partial'));assert.ok(!result.content.includes('hidden'));
 runs[1].output='changed';assert.match(result.content,/First output/);
});
test('empty or running-only selections cannot create an empty export',()=>{
 for(const runs of [[],[{...run,status:'running'}]])assert.throws(()=>taskHistoryExport('Task',runs,'','running'),/没有可导出/);
});

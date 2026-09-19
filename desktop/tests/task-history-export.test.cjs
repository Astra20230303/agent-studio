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
test('batch export associates each duration with its own persisted record',()=>{
 const result=taskHistoryExport('Task',[
  {...run,finishedAt:'2026-09-18T00:01:02Z'},
  {...run,id:'legacy',status:'failed'},
  {...run,id:'backward',status:'interrupted',finishedAt:'2026-09-17T23:59:59Z'},
 ],'','all');
 const sections=result.content.split('运行 ID：').slice(1);
 assert.equal(sections.length,3);
 assert.match(sections[0],/^one\n[\s\S]*\n耗时 1 分 2 秒\n/);
 assert.match(sections[1],/^legacy\n[\s\S]*\n耗时未知\n/);
 assert.match(sections[2],/^backward\n[\s\S]*\n耗时未知\n/);
});

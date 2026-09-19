const {test}=require('node:test');const assert=require('node:assert/strict');const {taskRunDuration}=require('../src/taskRunDuration.ts');
const start='2026-09-19T00:00:00Z';
test('finished runs use recorded timestamps and running runs use current clock',()=>{
 const run={status:'completed',startedAt:start,finishedAt:'2026-09-19T01:02:03Z'};
 assert.equal(taskRunDuration(run,0),'耗时 1 小时 2 分 3 秒');
 assert.equal(taskRunDuration({...run,status:'failed'}),'耗时 1 小时 2 分 3 秒');
 assert.equal(taskRunDuration({...run,status:'running'},Date.parse(start)+65000),'已运行 1 分 5 秒');
 assert.equal(taskRunDuration({...run,finishedAt:start}),'耗时 0 秒');
 assert.equal(taskRunDuration({...run,finishedAt:'2026-09-19T00:00:00.999Z'}),'耗时 0 秒');
});
test('missing, malformed and backwards timestamps stay unknown',()=>{
 for(const run of [{status:'completed',startedAt:start},{status:'failed',startedAt:'bad',finishedAt:start},{status:'interrupted',startedAt:start,finishedAt:'2025-01-01'},{status:'running',startedAt:start}])assert.equal(taskRunDuration(run,0),'耗时未知');
});

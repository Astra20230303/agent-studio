const {test}=require('node:test');const assert=require('node:assert/strict');const {mcpToolHints}=require('../src/mcpToolHints.ts');
test('tool declarations retain explicit true/false without inventing defaults',()=>{
 assert.deepEqual(mcpToolHints({readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}),['只读：是','可能破坏数据：否','重复调用结果不变：是','可能访问外部系统：否']);
 assert.deepEqual(mcpToolHints({readOnlyHint:false,openWorldHint:true}),['只读：否','可能访问外部系统：是']);
 for(const value of [null,[],{},'bad',{readOnlyHint:'true',destructiveHint:1,unknown:true}])assert.deepEqual(mcpToolHints(value),[]);
});

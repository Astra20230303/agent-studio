const {test}=require('node:test');const assert=require('node:assert/strict');const {readMcpStartup,mcpStartupText}=require('../src/mcpStartup.ts');
test('startup events validate identity, scope and failure detail',()=>{
 const value={threadId:null,name:'cloud',status:'failed',error:'Token expired',failureReason:'reauthenticationRequired'};
 assert.equal(mcpStartupText(readMcpStartup(value)),'cloud · 启动失败 · 需要重新认证：Token expired');
 assert.equal(readMcpStartup(value,'thread'),undefined);
 assert.equal(readMcpStartup({...value,threadId:'thread'},'thread').status,'failed');
 for(const change of [{name:''},{status:'unknown'},{error:{}},{failureReason:5}])assert.equal(readMcpStartup({...value,...change}),undefined);
 assert.equal(readMcpStartup({...value,failureReason:'futureReason'}).reauthenticate,false);
});

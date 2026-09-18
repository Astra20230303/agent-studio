const {test}=require('node:test');const assert=require('node:assert/strict');
const {readThreadResume}=require('../src/threadResume.ts');
const turn={id:'t',status:'completed',items:[{id:'a',type:'agentMessage',text:'kept'}]};
const valid=()=>({thread:{id:'remote',cwd:'D:/confirmed',turns:[structuredClone(turn)]},providerId:'p',model:'m',reasoningEffort:null});
test('resume confirms identity and envelope before returning any history',()=>{
 for(const bad of [null,{}, {thread:{id:'other',turns:[]}}, {thread:{id:'remote'}}, {thread:{id:'remote',turns:{}}},
  {...valid(),providerId:{}},{...valid(),model:[]},{...valid(),reasoningEffort:3},{thread:{...valid().thread,cwd:{}}}]){
  assert.throws(()=>readThreadResume(bad,'remote'),/恢复数据无效/);
 }
 const input=valid();const before=structuredClone(input);const result=readThreadResume(input,'remote');
 assert.equal(result.items[0].item.text,'kept');assert.equal(result.items[0].turnId,'t');assert.equal(result.running,undefined);assert.deepEqual(input,before);
 assert.deepEqual(readThreadResume({thread:{id:'remote',turns:[]}},'remote').items,[]);
});
test('malformed and ambiguous turns cannot unlock a restored session',()=>{
 for(const turns of [[null],[{}],[{...turn,id:' '}],[{...turn,items:null}],[{...turn,status:{}}],[turn,turn],
  [{...turn,status:'inProgress'},{...turn,id:'other',status:'inProgress'}]]){
  assert.throws(()=>readThreadResume({thread:{id:'remote',turns}},'remote'),/回合/);
 }
 assert.throws(()=>readThreadResume({thread:{id:'remote',turns:[{...turn,items:[{id:'a',type:'agentMessage',text:3}]}]}},'remote'),/历史条目无效/);
 const running={...turn,status:'inProgress',items:[{id:'future',type:'futureTool',data:{unknown:true}}]};
 assert.equal(readThreadResume({thread:{id:'remote',turns:[running]}},'remote').running.id,'t');
});

test('restored snapshot owns history and normalized configuration without raw transport fields',()=>{
 const input={...valid(),sandboxPolicy:{type:'readOnly'},approvalPolicy:'on-request',approvalsReviewer:'user',apiKey:'private'};
 const result=readThreadResume(input,'remote');
 assert.equal(result.cwd,'D:/confirmed');assert.equal(result.providerId,'p');assert.equal(result.model,'m');assert.equal(result.reasoningEffort,'default');
 assert.deepEqual(result.permissions,{sandbox:'readOnly',approvalPolicy:'on-request',reviewer:'user'});assert.equal(result.apiKey,undefined);assert.equal(result.thread,undefined);
 input.thread.turns[0].items[0].text='mutated transport';assert.equal(result.items[0].item.text,'kept');
 result.items[0].item.text='mutated consumer';assert.equal(input.thread.turns[0].items[0].text,'mutated transport');
 assert.equal(readThreadResume({...valid(),reasoningEffort:'future'},'remote').reasoningEffort,undefined);
});

test('unknown effort and absent permission evidence remain unconfirmed rather than inventing defaults',()=>{
 const snapshot=readThreadResume({...valid(),reasoningEffort:'future'},'remote');
 assert.equal(snapshot.reasoningEffort,undefined);assert.equal(snapshot.permissions,undefined);
 const active={...valid(),reasoningEffort:'high',thread:{...valid().thread,turns:[{...turn,status:'inProgress'}]},sandbox:{type:'workspaceWrite'},approvalPolicy:{reject:{sandboxApproval:true}},approvalsReviewer:'auto_review'};
 const restored=readThreadResume(active,'remote');assert.equal(restored.running.id,'t');assert.equal(restored.reasoningEffort,'high');
 assert.deepEqual(restored.permissions,{sandbox:'workspaceWrite',approvalPolicy:'custom',reviewer:'auto_review'});
 active.thread.turns[0].items[0].text='changed';assert.equal(restored.running.items[0].text,'kept');
});

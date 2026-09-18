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

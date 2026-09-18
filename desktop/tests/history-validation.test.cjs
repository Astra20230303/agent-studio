const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateRestorableHistory}=require('../src/historyValidation.ts');
test('rejects malformed history instead of silently dropping messages',()=>{
 for(const item of [null,42,[],{}, {id:'',type:'agentMessage',text:'x'}, {id:'a',type:'agentMessage',text:{}}, {id:'u',type:'userMessage',content:[null]}, {id:'u',type:'userMessage',content:[{type:'text',text:2}]}]){
  assert.throws(()=>validateRestorableHistory([{id:'good',type:'agentMessage',text:'keep'},{item}]),/已有消息已保留/);
 }
});
test('allows valid text, attachment-only messages and future tool records',()=>{
 assert.doesNotThrow(()=>validateRestorableHistory([
  {item:{id:'u',type:'userMessage',content:[{type:'localImage',path:'image.png'},{type:'skill',name:'test',path:'skill.md'}]},turnId:'t'},
  {id:'a',type:'agentMessage',text:''},{id:'p',type:'plan',text:'plan'},
  {id:'future',type:'futureTool',payload:{custom:true}},
 ]));
});

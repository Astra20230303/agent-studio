const {test}=require('node:test');const assert=require('node:assert/strict');
const {modelNotice}=require('../src/modelNotice.ts');
test('model notices require the visible active turn across all model event types',()=>{
 const runtime={turnId:'current',completed:['old'],revision:1};
 const cases=[['model/rerouted',{fromModel:'a',toModel:'b',reason:'highRiskCyberActivity'}],['model/verification',{verifications:['trustedAccessForCyber']}],['model/safetyBuffering/updated',{model:'m',useCases:[],reasons:[],showBufferingUi:true}]];
 for(const [method,extra] of cases){
  const input={threadId:'visible',turnId:'current',...extra};
  assert.ok(modelNotice(method,input,'visible',()=>runtime)?.text);
  assert.equal(modelNotice(method,input,'other',()=>runtime),undefined);
  assert.equal(modelNotice(method,{...input,turnId:'old'},'visible',()=>runtime),undefined);
  assert.equal(modelNotice(method,input,'visible',()=>({...runtime,turnId:undefined})),undefined);
  assert.equal(modelNotice(method,input,'visible',()=>({...runtime,completed:['current']})),undefined);
  assert.equal(modelNotice(method,{},'visible',()=>runtime),undefined);
 }
});
test('buffering completion explicitly clears its notice and empty verification is ignored',()=>{
 const read=()=>({turnId:'t',completed:[],revision:1});
 assert.deepEqual(modelNotice('model/safetyBuffering/updated',{threadId:'a',turnId:'t',model:'m',useCases:[],reasons:[],showBufferingUi:false},'a',read),{text:'',clearBuffering:true});
 assert.equal(modelNotice('model/verification',{threadId:'a',turnId:'t',verifications:[]},'a',read),undefined);
});

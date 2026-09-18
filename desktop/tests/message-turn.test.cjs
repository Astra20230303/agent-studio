const {test}=require('node:test');const assert=require('node:assert/strict');
const {findMessageTurn}=require('../src/messageTurn.ts');
test('finds raw and restored message IDs across pages without reading beyond the match',async()=>{
 for(const messageId of ['answer','live-answer']){
  const calls=[];
  const result=await findMessageTurn(async(id,cursor)=>{calls.push([id,cursor]);return cursor?{data:[{id:'target-turn',items:[{id:'answer'}]}],nextCursor:'unused'}:{data:[{id:'earlier',items:[{id:'other'}]}],nextCursor:'next'};},'remote',messageId);
  assert.equal(result,'target-turn');assert.deepEqual(calls,[['remote',undefined],['remote','next']]);
 }
 assert.equal(await findMessageTurn(async()=>({data:[],nextCursor:null}),'remote','missing'),undefined);
});
test('invalid envelopes and turn/item IDs fail instead of guessing a branch point',async()=>{
 for(const page of [null,{}, {data:{}},{data:[],nextCursor:{}},{data:[],nextCursor:' '},{data:[],nextCursor:''},
  {data:[null]},{data:[{id:' ',items:[]}]},{data:[{id:'t',items:{}}]},{data:[{id:'t',items:[null]}]},{data:[{id:'t',items:[{id:3}]}]}]){
  await assert.rejects(findMessageTurn(async()=>page,'remote','answer'),/回合列表无效/);
 }
});
test('one-step and multi-step cursor cycles terminate and independent retries work',async()=>{
 for(const cycle of [['A','A'],['A','B','A']]){
  let calls=0;
  await assert.rejects(findMessageTurn(async()=>({data:[],nextCursor:cycle[calls++]}),'remote','answer'),/分页重复/);
  assert.equal(calls,cycle.length);
 }
 const failure=Error('Offline');await assert.rejects(findMessageTurn(async()=>{throw failure;},'remote','answer'),error=>error===failure);
 assert.equal(await findMessageTurn(async()=>({data:[{id:'recovered',items:[{id:'answer'}]}]}),'remote','answer'),'recovered');
});

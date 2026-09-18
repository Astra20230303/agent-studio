const{test}=require('node:test');const assert=require('node:assert/strict');const{readTurnStart,readTurnSteer,createTurnCommands}=require('../src/turnCommands.ts');
test('start rejects missing or invalid identity/status and inconsistent thread before success',()=>{
 for(const value of [null,{}, {turn:{id:7}},{turn:{id:' '}},{turn:{id:'t',status:'unknown'}},{turn:{id:'t'},threadId:'other'}])assert.throws(()=>readTurnStart(value,'a'),/发送未确认/);
 for(const status of ['inProgress','completed','failed','interrupted'])assert.equal(readTurnStart({turn:{id:'t',status}},'a').turn.status,status);
 assert.deepEqual(readTurnStart({turn:{id:'t'}},'a'),{turn:{id:'t',status:'inProgress'}});
});
test('steering acknowledgement must confirm the requested running turn',()=>{
 for(const value of [null,{}, {turnId:5},{turnId:'other'}])assert.throws(()=>readTurnSteer(value,'t'),/追加未确认/);
 assert.deepEqual(readTurnSteer({turnId:'t'},'t'),{turnId:'t'});
});
test('pending commands capture payloads, exclude cross-operation duplicates and release after bad acknowledgement',async()=>{
 let resolve;const calls=[];
 const commands=createTurnCommands({start:input=>{calls.push(input);return new Promise(done=>resolve=done)},steer:async(...args)=>({turnId:args[1]})});
 const input={threadId:'a',text:'draft',attachments:['original']};const result=commands.start(input);input.attachments.push('later');
 await assert.rejects(commands.start(input),/尚未确认/);await assert.rejects(commands.steer('a','t','steer'),/尚未确认/);await commands.steer('b','other','independent');
 assert.deepEqual(calls[0].attachments,['original']);const failed=assert.rejects(result,/发送未确认/);resolve({});await failed;
 const retry=commands.start(input);resolve({turn:{id:'t'}});assert.equal((await retry).turn.id,'t');
});

const {test}=require('node:test');const assert=require('node:assert/strict');
const {permissionApprovalResponse}=require('../src/permissionApproval.ts');
const {createServerResponses}=require('../src/serverResponses.ts');
test('grant scopes preserve requested permissions without null fields or aliases',()=>{
 const requested={network:null,fileSystem:{read:['D:/read'],write:null,entries:[]},extra:'ignored'};
 const turn=permissionApprovalResponse(requested,'accept');const session=permissionApprovalResponse(requested,'acceptForSession');
 assert.equal(turn.scope,'turn');assert.equal(session.scope,'session');assert.deepEqual(session.permissions,{fileSystem:requested.fileSystem});
 requested.fileSystem.read.push('D:/later');assert.deepEqual(session.permissions.fileSystem.read,['D:/read']);
 assert.deepEqual(permissionApprovalResponse({network:null,fileSystem:null},'accept'),{scope:'turn',permissions:{}});
 assert.deepEqual(permissionApprovalResponse(null,'decline'),{scope:'turn',permissions:{}});
 for(const value of [null,[],{network:[]},{fileSystem:false}]) assert.throws(()=>permissionApprovalResponse(value,'acceptForSession'));
 assert.throws(()=>permissionApprovalResponse({},'cancel'));
});
test('transport receives explicit session scope and refusal never grants permissions',async()=>{
 const calls=[];const service=createServerResponses(async(id,result)=>{calls.push(result);return {ok:true};});
 const request={id:1,method:'item/permissions/requestApproval',params:{permissions:{network:{enabled:true},fileSystem:null}}};
 await service.send(request,'acceptForSession');await service.send(request,'decline');
 assert.deepEqual(calls,[{scope:'session',permissions:{network:{enabled:true}}},{scope:'turn',permissions:{}}]);
});

test('partial grants only copy selected categories from the original request',async()=>{
 const requested={network:{enabled:true},fileSystem:{read:['D:/read'],write:null}};
 assert.deepEqual(permissionApprovalResponse(requested,'accept',{network:false,fileSystem:true}),{scope:'turn',permissions:{fileSystem:requested.fileSystem}});
 assert.deepEqual(permissionApprovalResponse(requested,'acceptForSession',{network:true,fileSystem:false}),{scope:'session',permissions:{network:requested.network}});
 assert.deepEqual(permissionApprovalResponse(requested,'accept',{network:false,fileSystem:false}),{scope:'turn',permissions:{}});
 for(const selection of [{network:true},{network:'true',fileSystem:false},{network:true,fileSystem:true,write:['D:/other']},[]]) assert.throws(()=>permissionApprovalResponse(requested,'accept',selection));
 const calls=[];const service=createServerResponses(async(id,result)=>{calls.push(result);return{ok:true};});
 await service.send({id:5,method:'item/permissions/requestApproval',params:{permissions:requested}},'acceptForSession',undefined,{network:false,fileSystem:true});
 assert.deepEqual(calls,[{scope:'session',permissions:{fileSystem:requested.fileSystem}}]);
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {commandApprovalOptions,validateCommandDecision}=require('../src/approvalDecisions.ts');
const {createServerResponses}=require('../src/serverResponses.ts');
const exec={acceptWithExecpolicyAmendment:{execpolicy_amendment:['git','status']}};
const net=action=>({applyNetworkPolicyAmendment:{network_policy_amendment:{host:'example.com',action}}});
test('ordered server choices include scoped rules and reject malformed or unknown values',()=>{
 const choices=[net('deny'),'decline',exec,net('allow'),'accept',exec];
 assert.deepEqual(commandApprovalOptions({availableDecisions:choices}).map(x=>x.decision),choices.slice(0,-1));
 for(const value of [[],{},false, {acceptWithExecpolicyAmendment:{execpolicy_amendment:[]}}, {acceptWithExecpolicyAmendment:{execpolicy_amendment:['git',null]}}, net('unknown'),{applyNetworkPolicyAmendment:{network_policy_amendment:{host:'',action:'allow'}}}]) assert.equal(commandApprovalOptions({availableDecisions:[value]}).length,0);
 assert.equal(commandApprovalOptions({availableDecisions:[] ,proposedExecpolicyAmendment:['git']}).length,0);
 assert.equal(commandApprovalOptions({availableDecisions:'bad'}).length,0);
 assert.equal(commandApprovalOptions({proposedExecpolicyAmendment:['git'],proposedNetworkPolicyAmendments:[{host:'example.com',action:'deny'}]}).length,6);
 assert.throws(()=>validateCommandDecision({availableDecisions:['decline']},'accept'));
});
test('response sends exact structured decision snapshots only from offered scope',async()=>{
 const calls=[];const service=createServerResponses(async(id,result)=>{calls.push(result);return {ok:true};});
 const request={id:1,method:'item/commandExecution/requestApproval',params:{availableDecisions:[exec,net('deny')]}};
 await service.send(request,exec);
 await service.send(request,net('deny'));
 assert.deepEqual(calls,[{decision:exec},{decision:net('deny')}]);
 exec.acceptWithExecpolicyAmendment.execpolicy_amendment.push('changed');
 assert.deepEqual(calls[0].decision.acceptWithExecpolicyAmendment.execpolicy_amendment,['git','status']);
 await assert.rejects(service.send(request,net('allow')),/范围/);
 await assert.rejects(service.send({...request,method:'item/fileChange/requestApproval'},net('deny')),/不支持/);
 assert.equal(calls.length,2);
});

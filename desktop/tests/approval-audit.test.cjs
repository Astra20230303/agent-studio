const {test}=require('node:test');const assert=require('node:assert/strict');
const {approvalAuditDetail}=require('../src/approvalAudit.ts');
test('permission audit describes only the effective selected grant',()=>{
 const request={method:'item/permissions/requestApproval',params:{permissions:{network:{enabled:true},fileSystem:{write:['secret/path','other/path']}}}};
 const detail=approvalAuditDetail(request,'acceptForSession',{network:false,fileSystem:true,fileSystemEntries:[1]});
 assert.equal(detail,'额外权限 · 本会话 · 网络：未授予 · 文件条目：读取 0 / 写入 1 / 禁止 0');
 assert.equal(approvalAuditDetail(request,'decline'),'额外权限 · 拒绝 · 未授予权限');
 assert.match(approvalAuditDetail(request,'accept'),/本轮 · 网络：允许.*写入 2/);
});
test('rule and question audit never includes command arguments, hosts, answers or arbitrary decisions',()=>{
 assert.equal(approvalAuditDetail({}, {acceptWithExecpolicyAmendment:{execpolicy_amendment:['secret']}}),'命令审批 · 允许并保存命令规则');
 assert.equal(approvalAuditDetail({}, {applyNetworkPolicyAmendment:{network_policy_amendment:{host:'secret',action:'deny'}}}),'命令审批 · 保存网络规则：拒绝');
 assert.equal(approvalAuditDetail({method:'item/tool/requestUserInput',params:{questions:['secret']}},'accept'),'用户问题 · 本次允许');
 assert.equal(approvalAuditDetail({method:'secret'},'secret'),'服务请求 · 已回答');
});

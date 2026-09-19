import type { ApprovalDecision } from './approvalDecisions';
import { permissionApprovalResponse, permissionPaths } from './permissionApproval.ts';
const labels: Record<string, string> = { accept: '本次允许', acceptForSession: '本会话允许', decline: '拒绝', cancel: '取消' };
export function approvalAuditDetail(request: { method?: string; params?: any }, decision: ApprovalDecision, selection?: Record<string, unknown>): string {
  if (request.method === 'item/permissions/requestApproval' && typeof decision === 'string') {
    const grant = permissionApprovalResponse(request.params?.permissions, decision, selection);
    if (decision === 'decline') return '额外权限 · 拒绝 · 未授予权限';
    const network = grant.permissions.network as { enabled?: unknown } | undefined;
    const paths = permissionPaths(grant.permissions.fileSystem) || [];
    const counts = ['read', 'write', 'deny'].map(access => paths.filter(entry => entry.access === access).length);
    return `额外权限 · ${grant.scope === 'session' ? '本会话' : '本轮'} · 网络：${network?.enabled === true ? '允许' : '未授予'} · 文件条目：读取 ${counts[0]} / 写入 ${counts[1]} / 禁止 ${counts[2]}`;
  }
  if (typeof decision !== 'string') {
    if ('acceptWithExecpolicyAmendment' in decision) return '命令审批 · 允许并保存命令规则';
    return `命令审批 · 保存网络规则：${decision.applyNetworkPolicyAmendment.network_policy_amendment.action === 'allow' ? '允许' : '拒绝'}`;
  }
  const kind = request.method === 'item/commandExecution/requestApproval' ? request.params?.kind === 'writeStdin' ? '终端输入审批' : '命令审批' : request.method === 'item/fileChange/requestApproval' ? '文件变更审批' : request.method === 'item/tool/requestUserInput' ? '用户问题' : request.method === 'mcpServer/elicitation/request' ? 'MCP 请求' : '服务请求';
  return `${kind} · ${labels[decision] || '已回答'}`;
}

export type ApprovalDecision = string
  | { acceptWithExecpolicyAmendment: { execpolicy_amendment: string[] } }
  | { applyNetworkPolicyAmendment: { network_policy_amendment: { host: string; action: 'allow' | 'deny' } } };
export type ApprovalOption = { decision: ApprovalDecision; label: string; detail?: string };
const labels: Record<string, string> = { accept: '本次允许', acceptForSession: '本会话允许', decline: '拒绝', cancel: '取消本轮' };
const object = (value: any) => value && typeof value === 'object' && !Array.isArray(value);
const clean = (value: any): value is string => typeof value === 'string' && !!value.trim() && !/[\0\r\n]/.test(value);
function option(value: any): ApprovalOption | undefined {
  if (typeof value === 'string') return Object.hasOwn(labels, value) ? { decision: value, label: labels[value] } : undefined;
  if (!object(value) || Object.keys(value).length !== 1) return;
  const exec = value.acceptWithExecpolicyAmendment;
  if (object(exec) && Object.keys(exec).length === 1 && Array.isArray(exec.execpolicy_amendment) && exec.execpolicy_amendment.length && exec.execpolicy_amendment.every(clean)) {
    const command = [...exec.execpolicy_amendment];
    return { decision: { acceptWithExecpolicyAmendment: { execpolicy_amendment: command } }, label: '允许并保存命令规则', detail: `以后匹配此命令前缀的命令可免审批：${JSON.stringify(command)}` };
  }
  const network = value.applyNetworkPolicyAmendment;
  const rule = network?.network_policy_amendment;
  if (object(network) && Object.keys(network).length === 1 && object(rule) && Object.keys(rule).length === 2 && clean(rule.host) && ['allow', 'deny'].includes(rule.action)) {
    return { decision: { applyNetworkPolicyAmendment: { network_policy_amendment: { host: rule.host, action: rule.action } } }, label: rule.action === 'allow' ? '允许并保存网络规则' : '拒绝并保存网络规则', detail: `持久${rule.action === 'allow' ? '允许' : '拒绝'}访问主机：${rule.host}` };
  }
}
export function commandApprovalOptions(params: any = {}): ApprovalOption[] {
  // An explicit list is authoritative, including an empty or malformed list.
  const values = params.availableDecisions == null
    ? ['decline', 'accept', 'acceptForSession', 'cancel',
      ...(params.proposedExecpolicyAmendment ? [{ acceptWithExecpolicyAmendment: { execpolicy_amendment: params.proposedExecpolicyAmendment } }] : []),
      ...(Array.isArray(params.proposedNetworkPolicyAmendments) ? params.proposedNetworkPolicyAmendments.map((rule: unknown) => ({ applyNetworkPolicyAmendment: { network_policy_amendment: rule } })) : [])]
    : Array.isArray(params.availableDecisions) ? params.availableDecisions : [];
  const seen = new Set<string>();
  return values.flatMap((value: unknown) => {
    const parsed = option(value); if (!parsed) return [];
    const key = JSON.stringify(parsed.decision); if (seen.has(key)) return [];
    seen.add(key); return [parsed];
  });
}
export function validateCommandDecision(params: any, decision: ApprovalDecision): ApprovalDecision {
  const parsed = option(decision);
  if (!parsed || !commandApprovalOptions(params).some(item => JSON.stringify(item.decision) === JSON.stringify(parsed.decision))) throw Error('此审批选项不在服务端提供的范围内。');
  return parsed.decision;
}

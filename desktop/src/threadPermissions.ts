export type ThreadPermissions = { sandbox: string; approvalPolicy: string; reviewer: string };

export function readThreadPermissions(response: any): ThreadPermissions | undefined {
  const sandbox = response?.sandboxPolicy || response?.sandbox;
  if (typeof sandbox?.type !== 'string' || response.approvalPolicy == null) return undefined;
  return {
    sandbox: sandbox.type,
    approvalPolicy: typeof response.approvalPolicy === 'string' ? response.approvalPolicy : 'custom',
    reviewer: typeof response.approvalsReviewer === 'string' ? response.approvalsReviewer : 'unknown',
  };
}

export function permissionSummary(value?: ThreadPermissions): string {
  if (!value) return '权限待确认';
  const sandbox = ({ readOnly: '只读', workspaceWrite: '工作区写入', dangerFullAccess: '完全访问', externalSandbox: '外部沙箱' } as Record<string, string>)[value.sandbox] || '自定义沙箱';
  const approval = value.approvalPolicy === 'never' ? '不请求审批' : value.reviewer === 'auto_review' ? '自动审查' : value.reviewer === 'user' ? '用户审批' : '审批待确认';
  return `${sandbox} · ${approval}`;
}

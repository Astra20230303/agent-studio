const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function permissionApprovalResponse(requested: unknown, decision: string, selection?: Record<string, unknown>) {
  if (!['accept', 'acceptForSession', 'decline'].includes(decision)) throw Error('额外权限审批选项无效。');
  if (decision === 'decline') return { scope: 'turn' as const, permissions: {} };
  if (!object(requested)) throw Error('请求的额外权限无效。');
  if (selection !== undefined && (!object(selection) || Object.keys(selection).some(key => !['network', 'fileSystem'].includes(key)) || typeof selection.network !== 'boolean' || typeof selection.fileSystem !== 'boolean')) throw Error('权限选择无效。');
  const permissions: Record<string, unknown> = {};
  for (const key of ['network', 'fileSystem']) {
    const value = requested[key];
    if (value == null || selection?.[key] === false) continue;
    if (!object(value)) throw Error('请求的额外权限无效。');
    permissions[key] = structuredClone(value);
  }
  return { scope: decision === 'acceptForSession' ? 'session' as const : 'turn' as const, permissions };
}

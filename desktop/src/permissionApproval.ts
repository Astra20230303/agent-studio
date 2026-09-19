const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export type PermissionPath = { path: Record<string, unknown>; access: 'read' | 'write' | 'deny' };
export function permissionPaths(value: unknown): PermissionPath[] | undefined {
  if (!object(value)) return;
  if (value.entries != null) {
    if (!Array.isArray(value.entries) || value.entries.some(entry => !object(entry) || !object(entry.path) || !['read', 'write', 'deny'].includes(String(entry.access)))) return;
    return structuredClone(value.entries) as PermissionPath[];
  }
  const entries: PermissionPath[] = [];
  for (const access of ['read', 'write'] as const) {
    const paths = value[access];
    if (paths == null) continue;
    if (!Array.isArray(paths) || paths.some(path => typeof path !== 'string' || !path.trim())) return;
    for (const path of paths) entries.push({ path: { type: 'path', path }, access });
  }
  return entries;
}
export function permissionPathLabel(entry: PermissionPath) {
  const path = entry.path.type === 'path' ? entry.path.path : entry.path.type === 'glob_pattern' ? entry.path.pattern : JSON.stringify(entry.path);
  return `${({ read: '读取', write: '写入', deny: '禁止访问' })[entry.access]}：${String(path)}`;
}
export function permissionApprovalResponse(requested: unknown, decision: string, selection?: Record<string, unknown>) {
  if (!['accept', 'acceptForSession', 'decline'].includes(decision)) throw Error('额外权限审批选项无效。');
  if (decision === 'decline') return { scope: 'turn' as const, permissions: {} };
  if (!object(requested)) throw Error('请求的额外权限无效。');
  if (selection !== undefined && (!object(selection) || Object.keys(selection).some(key => !['network', 'fileSystem', 'fileSystemEntries'].includes(key)) || typeof selection.network !== 'boolean' || typeof selection.fileSystem !== 'boolean')) throw Error('权限选择无效。');
  const permissions: Record<string, unknown> = {};
  for (const key of ['network', 'fileSystem']) {
    const value = requested[key];
    if (value == null || selection?.[key] === false) continue;
    if (!object(value)) throw Error('请求的额外权限无效。');
    if (key === 'fileSystem' && selection?.fileSystemEntries !== undefined) {
      const entries = permissionPaths(value); const selected = selection.fileSystemEntries;
      if (!entries || !Array.isArray(selected) || selected.some(index => !Number.isSafeInteger(index) || index < 0 || index >= entries.length)) throw Error('文件权限选择无效。');
      // Entries override legacy read/write fields upstream. Never echo those fields
      // after filtering, or permit removal of a restrictive deny entry.
      permissions[key] = { entries: entries.filter((entry, index) => entry.access === 'deny' || selected.includes(index)), ...(value.globScanMaxDepth !== undefined ? { globScanMaxDepth: value.globScanMaxDepth } : {}) };
    } else permissions[key] = structuredClone(value);
  }
  return { scope: decision === 'acceptForSession' ? 'session' as const : 'turn' as const, permissions };
}

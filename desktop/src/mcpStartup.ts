export type McpStartup = { name: string; status: 'starting' | 'ready' | 'failed' | 'cancelled'; error?: string; reauthenticate: boolean };
export function readMcpStartup(value: any, threadId?: string): McpStartup | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value) || (value.threadId ?? undefined) !== threadId
    || typeof value.name !== 'string' || !value.name.trim() || !['starting', 'ready', 'failed', 'cancelled'].includes(value.status)
    || value.error != null && typeof value.error !== 'string' || value.failureReason != null && typeof value.failureReason !== 'string') return;
  return { name: value.name, status: value.status, ...(value.error ? { error: value.error } : {}), reauthenticate: value.failureReason === 'reauthenticationRequired' };
}
export function mcpStartupText(value: McpStartup) {
  return `${value.name} · ${({ starting: '正在启动', ready: '已就绪', failed: '启动失败', cancelled: '启动已取消' })[value.status]}${value.reauthenticate ? ' · 需要重新认证' : ''}${value.error ? `：${value.error}` : ''}`;
}

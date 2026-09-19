export type EnvironmentInfo = { shell: { name: string; path: string }; cwd?: string | null };
export type EnvironmentStatus = { status: 'ready' | 'pending' | 'disconnected' | 'unknown'; error?: string };

const identity = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && !/[\0\r\n]/.test(value);

export function readEnvironmentInfo(value: unknown): EnvironmentInfo {
  const input = value as any;
  if (!input || !input.shell || !identity(input.shell.name) || !identity(input.shell.path) || input.cwd != null && !identity(input.cwd)) throw new Error('环境信息响应无效');
  return { shell: { name: input.shell.name, path: input.shell.path }, ...(input.cwd != null ? { cwd: input.cwd } : {}) };
}

export function readEnvironmentStatus(value: unknown): EnvironmentStatus {
  const input = value as any;
  if (!input || !['ready', 'pending', 'disconnected', 'unknown'].includes(input.status) || input.error != null && (typeof input.error !== 'string' || !input.error.trim())) throw new Error('环境状态响应无效');
  return { status: input.status, ...(input.error != null ? { error: input.error } : {}) };
}

export function environmentAddParams(environmentId: string, execServerUrl: string, connectTimeoutMs?: number) {
  if (!/^\S+$/.test(environmentId)) throw new Error('环境 ID 无效');
  let url: URL;
  try { url = new URL(execServerUrl); } catch { throw new Error('exec-server URL 无效'); }
  if (!['ws:', 'wss:'].includes(url.protocol) || url.username || url.password || /[\r\n]/.test(execServerUrl)) throw new Error('exec-server URL 无效');
  if (connectTimeoutMs != null && (!Number.isSafeInteger(connectTimeoutMs) || connectTimeoutMs <= 0 || connectTimeoutMs > 300000)) throw new Error('连接超时时间无效');
  return { environmentId, execServerUrl, ...(connectTimeoutMs != null ? { connectTimeoutMs } : {}) };
}

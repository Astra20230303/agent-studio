export type EnvironmentInfo = { shell: { name: string; path: string }; cwd?: string | null };
export type EnvironmentStatus = { status: 'ready' | 'pending' | 'disconnected' | 'unknown'; error?: string };

const identity = (value: unknown): value is string => typeof value === 'string' && /^\S.{0,255}$/.test(value);

export function readEnvironmentInfo(value: unknown): EnvironmentInfo {
  const input = value as any;
  if (!input || !input.shell || !identity(input.shell.name) || !identity(input.shell.path) || input.cwd != null && !identity(input.cwd)) throw new Error('环境信息响应无效');
  return { shell: { name: input.shell.name, path: input.shell.path }, ...(input.cwd != null ? { cwd: input.cwd } : {}) };
}

export function readEnvironmentStatus(value: unknown): EnvironmentStatus {
  const input = value as any;
  if (!input || !['ready', 'pending', 'disconnected', 'unknown'].includes(input.status) || input.error != null && !identity(input.error)) throw new Error('环境状态响应无效');
  return { status: input.status, ...(input.error != null ? { error: input.error } : {}) };
}

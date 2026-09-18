import { readThreadPermissions } from './threadPermissions.ts';
export type ThreadStartOptions = { cwd?: string; model?: string; modelProvider?: string; providerId?: string; effort?: string; permission?: 'on-request' | 'workspace-write' | 'danger-full-access' };
export function readThreadStart(value: any) {
  const object = (item: any) => item && typeof item === 'object' && !Array.isArray(item);
  if (!object(value) || !object(value.thread) || typeof value.thread.id !== 'string' || !value.thread.id.trim()
    || value.thread.id !== value.thread.id.trim() || /[\0\r\n]/.test(value.thread.id)
    || value.providerId != null && typeof value.providerId !== 'string') throw Error('服务端会话创建数据无效，草稿已保留，请重试。');
  return structuredClone({ id: value.thread.id as string, providerId: (value.providerId || undefined) as string | undefined, permissions: readThreadPermissions(value) });
}

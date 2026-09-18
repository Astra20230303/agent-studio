export type ThreadMemoryMode = 'enabled' | 'disabled';
export function validateThreadMemoryInput(threadId: string, mode: string): ThreadMemoryMode {
  if (!/^\S+$/.test(threadId) || !['enabled', 'disabled'].includes(mode)) throw new Error('记忆模式参数无效');
  return mode as ThreadMemoryMode;
}

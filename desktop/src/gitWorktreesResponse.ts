export type WorktreeValue = { primary?: boolean; current?: boolean; path: string; branch?: string; head?: string; detached?: boolean; bare?: boolean; locked?: string | boolean; prunable?: string | boolean };
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const commit = (value: unknown) => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
const absolute = (value: unknown): value is string => typeof value === 'string' && /^(?:[A-Za-z]:[\\/]|\/|\\\\[^\\]+\\[^\\]+)/.test(value) && !/[\0\r\n]/.test(value);
export function parseGitWorktrees(value: unknown) {
  if (!object(value) || !Array.isArray(value.worktrees) || value.worktrees.some((entry: any) => !object(entry) || !absolute(entry.path)
    || ['primary', 'current', 'detached', 'bare'].some(key => entry[key] != null && typeof entry[key] !== 'boolean')
    || ['locked', 'prunable'].some(key => entry[key] != null && typeof entry[key] !== 'string' && typeof entry[key] !== 'boolean')
    || entry.branch != null && (typeof entry.branch !== 'string' || !entry.branch.trim() || /[\0\r\n]/.test(entry.branch))
    || entry.head != null && !commit(entry.head))) throw Error('Git 工作树数据无效，请重试');
  const paths = value.worktrees.map((entry: any) => entry.path);
  if (new Set(paths).size !== paths.length) throw Error('Git 工作树存在重复路径，请重试');
  return structuredClone(value.worktrees) as WorktreeValue[];
}

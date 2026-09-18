import type { Project } from './domain';
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const absolute = (value: unknown) => typeof value === 'string' && /^(?:[A-Za-z]:[\\/]|\/|\\\\[^\\]+\\[^\\]+)/.test(value) && !value.includes('\0');
export function parseWorktreeProject(value: unknown): Project {
  if (!object(value) || typeof value.id !== 'string' || !value.id.trim() || typeof value.name !== 'string' || !value.name.trim() || !absolute(value.path)
    || value.environment !== 'worktree' || !object(value.git) || value.git.isRepository !== true || value.git.branch != null && typeof value.git.branch !== 'string') throw Error('工作树项目数据无效，请重试');
  return structuredClone(value) as Project;
}

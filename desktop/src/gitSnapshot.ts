export type ChangedFile = { path: string; original?: string; index: string; working: string; untracked: boolean };
export type GitSnapshot = { branch: string; branches?: string[]; head?: string; merging?: boolean; root: string; detached?: boolean; stashAvailable?: boolean; remotes?: string[]; upstream?: string; remote?: string; ahead?: number; behind?: number; files: ChangedFile[] };
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
export function parseGitSnapshot(value: unknown): GitSnapshot {
  if (!object(value) || typeof value.root !== 'string' || !value.root.trim() || typeof value.branch !== 'string'
    || !Array.isArray(value.files)
    || ['head', 'upstream', 'remote'].some(key => value[key] != null && typeof value[key] !== 'string')
    || ['merging', 'detached', 'stashAvailable'].some(key => value[key] != null && typeof value[key] !== 'boolean')
    || ['ahead', 'behind'].some(key => value[key] != null && (!Number.isSafeInteger(value[key]) || value[key] < 0))
    || ['branches', 'remotes'].some(key => value[key] != null && (!Array.isArray(value[key]) || value[key].some((item: unknown) => typeof item !== 'string' || !item)))
    || value.files.some((file: any) => !object(file) || typeof file.path !== 'string' || !file.path || typeof file.untracked !== 'boolean'
      || typeof file.index !== 'string' || file.index.length !== 1 || typeof file.working !== 'string' || file.working.length !== 1
      || file.original != null && typeof file.original !== 'string')
    || new Set(value.files.map((file: any) => file.path)).size !== value.files.length) throw Error('Git 状态数据无效，请刷新变更重试');
  return structuredClone(value) as GitSnapshot;
}
export function parseGitDiff(value: unknown): string {
  if (!object(value) || typeof value.diff !== 'string' || value.truncated != null && typeof value.truncated !== 'boolean') throw Error('Git 差异数据无效，请重试');
  return (value.diff || '此区域没有差异。') + (value.truncated ? '\n…内容已截断' : '');
}

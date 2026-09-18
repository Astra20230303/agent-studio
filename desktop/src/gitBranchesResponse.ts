export type RemoteBranch = { ref: string; head: string };
export type GitBranchesSnapshot = { branches: string[]; remoteBranches?: RemoteBranch[]; current: string; head: string };
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const commit = (value: unknown) => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
export function parseGitBranches(value: unknown): GitBranchesSnapshot {
  if (!object(value) || !Array.isArray(value.branches) || value.branches.some((name: unknown) => typeof name !== 'string' || !name)
    || new Set(value.branches).size !== value.branches.length || typeof value.current !== 'string' || typeof value.head !== 'string' || !(commit(value.head) || value.head === '' && value.current.length > 0 && !value.branches.includes(value.current))
    || value.remoteBranches != null && (!Array.isArray(value.remoteBranches) || value.remoteBranches.some((entry: any) => !object(entry) || typeof entry.ref !== 'string' || !entry.ref || !commit(entry.head)))) throw Error('Git 分支数据无效，请重试');
  const remoteBranches = value.remoteBranches || [];
  if (new Set(remoteBranches.map((entry: any) => entry.ref)).size !== remoteBranches.length) throw Error('Git 分支数据存在重复远端，请重试');
  return structuredClone({ ...value, remoteBranches }) as GitBranchesSnapshot;
}

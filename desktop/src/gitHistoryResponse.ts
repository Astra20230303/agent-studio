export type GitCommit = { id: string; author: string; date: string; subject: string };
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const commitId = (value: unknown) => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
export function parseGitHistory(value: unknown) {
  if (!object(value) || !Array.isArray(value.refs) || value.refs.some((ref: unknown) => typeof ref !== 'string' || !ref)
    || value.anchor != null && !commitId(value.anchor) || !Array.isArray(value.commits) || value.commits.length > 30
    || typeof value.hasMore !== 'boolean' || value.commits.some((commit: any) => !object(commit) || !commitId(commit.id) || typeof commit.author !== 'string' || typeof commit.date !== 'string' || typeof commit.subject !== 'string')) throw Error('Git 提交历史数据无效，请重试');
  if (new Set(value.commits.map((commit: any) => commit.id)).size !== value.commits.length) throw Error('Git 提交历史存在重复记录，请重试');
  return structuredClone(value) as { refs: string[]; anchor?: string; commits: GitCommit[]; hasMore: boolean };
}
export function parseGitCommitDetail(value: unknown) {
  if (!object(value) || typeof value.detail !== 'string') throw Error('Git 提交详情数据无效，请重试');
  return value.detail;
}

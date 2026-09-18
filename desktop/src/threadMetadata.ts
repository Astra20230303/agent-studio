const validId = (value: unknown): value is string => typeof value === 'string' && /^\S+$/.test(value);
export function updateThreadProjectParams(threadId: string, projectId: string | null) {
  if (!validId(threadId) || projectId != null && !validId(projectId)) throw new Error('会话项目关联参数无效');
  return { threadId, projectId: projectId || '' };
}
export function updateThreadGitParams(threadId: string, gitInfo: { sha?: string | null; branch?: string | null; originUrl?: string | null }) {
  if (!validId(threadId) || !gitInfo || Object.entries(gitInfo).some(([key, value]) => !['sha', 'branch', 'originUrl'].includes(key) || value != null && (typeof value !== 'string' || !value.trim() || /[\0\r\n]/.test(value)))) throw new Error('会话 Git 元数据参数无效');
  return { threadId, gitInfo: { ...(gitInfo.sha !== undefined ? { sha: gitInfo.sha } : {}), ...(gitInfo.branch !== undefined ? { branch: gitInfo.branch } : {}), ...(gitInfo.originUrl !== undefined ? { originUrl: gitInfo.originUrl } : {}) } };
}

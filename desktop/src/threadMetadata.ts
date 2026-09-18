const validId = (value: unknown): value is string => typeof value === 'string' && /^\S+$/.test(value);
export function updateThreadProjectParams(threadId: string, projectId: string | null) {
  if (!validId(threadId) || projectId != null && !validId(projectId)) throw new Error('会话项目关联参数无效');
  return { threadId, projectId: projectId || '' };
}

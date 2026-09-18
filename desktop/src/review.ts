const validId = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value.trim() === value && !/[\0\r\n]/.test(value);
export function readReviewTarget(target: any) {
  if (!target || typeof target !== 'object' || !validId(target.type)) throw new Error('审查目标无效');
  if (target.type === 'uncommittedChanges') return { type: 'uncommittedChanges' as const };
  if (target.type === 'baseBranch' && validId(target.branch)) return { type: 'baseBranch' as const, branch: target.branch };
  if (target.type === 'commit' && validId(target.sha)) return { type: 'commit' as const, sha: target.sha, ...(target.title === undefined ? {} : { title: String(target.title) }) };
  if (target.type === 'custom' && validId(target.instructions)) return { type: 'custom' as const, instructions: target.instructions };
  throw new Error('审查目标无效');
}
export function readReviewStartResponse(value: any, threadId: string) {
  if (!validId(threadId) || !validId(value?.reviewThreadId) || value.reviewThreadId !== threadId || !validId(value?.turn?.id)) throw new Error('服务端返回了无效代码审查回合');
  return { reviewThreadId: value.reviewThreadId, turnId: value.turn.id };
}

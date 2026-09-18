export const COMMIT_REVIEW_LIMIT = 60000;
export function commitReviewPrompt(root: string, commit: string, detail: string, focus = '') {
  if (!root || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit) || !detail.trim()) throw Error('请先读取有效的提交详情');
  const truncated = detail.length > COMMIT_REVIEW_LIMIT;
  const excerpt = detail.slice(0, COMMIT_REVIEW_LIMIT);
  return [
    '请评审以下历史 Git 提交，查找可复现的缺陷、回归和缺失测试。给出文件与行号、影响和证据，先提供评审结论。',
    `工作区：${root}`,
    `目标提交：${commit}`,
    '以目标提交及其父提交为依据，不要假定当前工作区就是该版本。',
    ...(focus.trim() ? [`评审重点：${focus.trim()}`] : []),
    ...(truncated ? ['以下提交详情已截断，请先通过目标提交 ID 读取剩余差异再给出完整评审。'] : []),
    '', '提交详情：', excerpt,
  ].join('\n');
}

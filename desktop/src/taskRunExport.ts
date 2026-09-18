import type { TaskRun } from './scheduledTasks';
export function taskRunExport(name: string, run: TaskRun): string {
  const labels = { running: '运行中', completed: '已完成', failed: '失败', interrupted: '已中断' };
  const config = run.configuration;
  const lines = [config?.name || name, `开始：${run.startedAt}`, ...(run.finishedAt ? [`结束：${run.finishedAt}`] : []), labels[run.status], `触发：${run.trigger === 'scheduled' ? '定时执行' : '手动执行'}`];
  if (run.threadId) lines.push(`会话 ID：${run.threadId}`);
  if (config) {
    lines.push('', '运行时任务配置', `类型：${config.kind === 'agent' ? 'Agent 任务' : '提醒'}`);
    if (config.kind === 'agent') lines.push(`渠道配置：${config.providerId || '跟随运行时启用渠道'}`, `模型：${config.model}`, `执行时限：${config.timeoutMinutes ?? 10} 分钟`, `推理强度：${config.reasoningEffort || '模型默认'}`, `目录配置：${config.cwd || '使用运行时默认项目目录'}`, `权限：${config.permission}`);
    lines.push('任务内容：', config.prompt);
  } else lines.push('', '此运行记录没有配置快照。');
  if (run.environment) lines.push('', '实际执行环境', `工作目录：${run.environment.cwd}`, `渠道 ID：${run.environment.providerId || '未提供渠道 ID'}`);
  if (run.error) lines.push('', '错误：', run.error);
  lines.push('', '运行输出：', run.output || '');
  return lines.join('\n');
}

import type { TaskRun } from './scheduledTasks';
import { taskRunExport } from './taskRunExport.ts';

export function taskHistoryExport(name: string, runs: TaskRun[], query: string, status: string) {
  const completed = runs.filter(run => run.status !== 'running');
  if (!completed.length) throw Error('没有可导出的已结束运行记录');
  const labels: Record<string, string> = { all: '全部结果', completed: '已完成', failed: '失败', interrupted: '已中断', running: '运行中' };
  const content = [
    `${name} · 运行历史`,
    `搜索：${query.trim() || '无'}`,
    `结果筛选：${labels[status] || status}`,
    `已结束记录：${completed.length}`,
    '范围：当前已保存的匹配记录；运行中的记录不导出。',
    ...completed.map(run => `\n${'='.repeat(48)}\n运行 ID：${run.id}\n${taskRunExport(name, run)}`),
  ].join('\n');
  return { content, count: completed.length };
}

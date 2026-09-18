import type { ThreadStatus } from './domain';

export const threadStatusLabel: Record<ThreadStatus, string> = {
  idle: '空闲', running: '运行中', needs_input: '等待输入', completed: '已完成', failed: '失败',
};

export function threadStatusMark(status: ThreadStatus) {
  if (status === 'running') return '…';
  if (status === 'needs_input') return '!';
  if (status === 'failed') return '×';
  return undefined;
}

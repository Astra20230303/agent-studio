import type { DesktopState } from './domain';
export function selectNotifiedThread(state: DesktopState, remoteId: unknown, title = '通知会话'): boolean {
  if (typeof remoteId !== 'string' || !remoteId.trim()) return false;
  let thread = state.threads.find(item => item.remoteId === remoteId);
  if (!thread) {
    thread = { id: `remote-${remoteId}`, remoteId, title, status: 'idle', pinned: false, archived: false, messages: [], updatedAt: new Date().toISOString() };
    state.threads.push(thread);
  }
  state.activeThreadId = thread.id;
  return true;
}

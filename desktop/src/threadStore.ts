import type { DesktopState, Thread } from './domain';
import { createThreadRepository, type ThreadRepository, type ThreadSource } from './threadRepository.ts';
import { createThreadMutations, type ThreadMutations, type ThreadRemoteMutations } from './threadMutations.ts';

export interface ThreadStore extends ThreadRepository, ThreadMutations {}
export type ThreadBackend = ThreadSource & ThreadRemoteMutations;

// One instance per application state. View lifetimes and queue persistence remain
// with callers; mutation exclusion spans all views and survives reconnects.
export function createThreadStore(backend: ThreadBackend, update: (mutate: (state: DesktopState) => void) => void): ThreadStore {
  const repository = createThreadRepository(backend);
  const mutations = createThreadMutations(backend, update);
  const pending = new Set<string>();
  async function exclusive(thread: Pick<Thread, 'id' | 'remoteId'>, operation: () => Promise<void>) {
    const keys = [`local:${thread.id}`, ...(thread.remoteId ? [`remote:${thread.remoteId}`] : [])];
    if (keys.some(key => pending.has(key))) throw Error('此会话的操作尚未完成，请稍后重试。');
    keys.forEach(key => pending.add(key));
    try { await operation(); }
    finally { keys.forEach(key => pending.delete(key)); }
  }
  return {
    query: repository.query,
    rename: (thread, name) => exclusive(thread, () => mutations.rename(thread, name)),
    archive: thread => exclusive(thread, () => mutations.archive(thread)),
    remove: thread => exclusive(thread, () => mutations.remove(thread)),
    restore: thread => exclusive(thread, () => mutations.restore(thread)),
  };
}

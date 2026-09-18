import type { DesktopState, Thread } from './domain';
import { createThreadRepository, type ThreadRepository, type ThreadSource } from './threadRepository.ts';
import { createThreadMutations, type ThreadMutations, type ThreadRemoteMutations } from './threadMutations.ts';

export interface ThreadStore extends ThreadRepository, ThreadMutations {
  syncInitialTitle(thread: Pick<Thread, 'id'> & { remoteId: string }, title: string): Promise<void>;
}
export type ThreadBackend = ThreadSource & ThreadRemoteMutations;

// One instance per application state. View lifetimes and queue persistence remain
// with callers; mutation exclusion spans all views and survives reconnects.
export function createThreadStore(backend: ThreadBackend, update: (mutate: (state: DesktopState) => void) => void): ThreadStore {
  const repository = createThreadRepository(backend);
  const mutations = createThreadMutations(backend, update);
  const pending = new Set<string>();
  // A manual rename can finish locally while thread/start is still pending.
  const manualNames = new Map<string, string>();
  const identityKeys = (thread: Pick<Thread, 'id' | 'remoteId'>) => [`local:${thread.id}`, ...(thread.remoteId ? [`remote:${thread.remoteId}`] : [])];
  async function exclusive(thread: Pick<Thread, 'id' | 'remoteId'>, operation: () => Promise<void>) {
    const keys = identityKeys(thread);
    if (keys.some(key => pending.has(key))) throw Error('此会话的操作尚未完成，请稍后重试。');
    keys.forEach(key => pending.add(key));
    try { await operation(); }
    finally { keys.forEach(key => pending.delete(key)); }
  }
  return {
    query: repository.query,
    rename: (thread, name) => {
      const identity = { id: thread.id, remoteId: thread.remoteId };
      return exclusive(identity, async () => {
        await mutations.rename(identity, name);
        identityKeys(identity).forEach(key => manualNames.set(key, name));
      });
    },
    syncInitialTitle: (thread, title) => {
      const identity = { ...thread };
      return exclusive(identity, async () => {
        const manual = identityKeys(identity).map(key => manualNames.get(key)).find(name => name !== undefined);
        await backend.rename(identity.remoteId, manual ?? title);
      });
    },
    archive: thread => exclusive(thread, () => mutations.archive(thread)),
    remove: thread => {
      const identity = { id: thread.id, remoteId: thread.remoteId };
      return exclusive(identity, async () => {
        await mutations.remove(identity);
        identityKeys(identity).forEach(key => manualNames.delete(key));
      });
    },
    restore: thread => exclusive(thread, () => mutations.restore(thread)),
  };
}

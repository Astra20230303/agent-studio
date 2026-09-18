import { readPermissionUpdate } from './threadPermissionUpdate.ts';
import { readThreadProvider } from './threadProvider.ts';
import { createThreadHistory, type HistoryReadOptions } from './threadHistory.ts';
import { validateRestorableHistory } from './historyValidation.ts';
import { findMessageTurn } from './messageTurn.ts';
import { readThreadFork } from './threadFork.ts';
import { readThreadStart, type ThreadStartOptions } from './threadStart.ts';
import { readThreadResume } from './threadResume.ts';
import type { DesktopState, Thread } from './domain';
import { createThreadRepository, type ThreadRepository, type ThreadSource } from './threadRepository.ts';
import { createThreadMutations, type ThreadMutations, type ThreadRemoteMutations } from './threadMutations.ts';

export interface ThreadStore extends ThreadRepository, ThreadMutations {
  changePermission(source: Pick<Thread, 'id'> & { remoteId: string }, permission: DesktopState['permission']): Promise<ReturnType<typeof readPermissionUpdate>>;
  switchProvider(source: Pick<Thread, 'id'> & { remoteId: string }, providerId: string, model: string): Promise<ReturnType<typeof readThreadProvider>>;
  readHistory(threadId: string, options?: HistoryReadOptions): Promise<unknown[]>;
  findMessageTurn(threadId: string, messageId: string): Promise<string | undefined>;
  start(localId: string, options: ThreadStartOptions): Promise<ReturnType<typeof readThreadStart>>;
  fork(source: Pick<Thread, 'id'> & { remoteId: string }, lastTurnId?: string): Promise<ReturnType<typeof readThreadFork>>;
  resume(threadId: string): Promise<ReturnType<typeof readThreadResume>>;
  syncInitialTitle(thread: Pick<Thread, 'id'> & { remoteId: string }, title: string): Promise<void>;
}
export type ThreadBackend = ThreadSource & ThreadRemoteMutations & { changePermission(threadId: string, permission: DesktopState['permission']): Promise<unknown>; switchProvider(threadId: string, providerId: string, model: string): Promise<unknown>; items(threadId: string, cursor?: string): Promise<unknown>; turns(threadId: string, cursor?: string): Promise<unknown>; resume(threadId: string): Promise<unknown>; start(options: ThreadStartOptions): Promise<unknown>; fork(threadId: string, lastTurnId?: string): Promise<unknown> };

// One instance per application state. View lifetimes and queue persistence remain
// with callers; mutation exclusion spans all views and survives reconnects.
export function createThreadStore(backend: ThreadBackend, update: (mutate: (state: DesktopState) => void) => void): ThreadStore {
  const history = createThreadHistory(async (threadId, cursor) => {
    const page = await backend.items(threadId, cursor);
    // Capture each page before later requests or callbacks can mutate it.
    return structuredClone(page);
  });
  const repository = createThreadRepository(backend);
  const mutations = createThreadMutations(backend, update);
  const pending = new Set<string>();
  // A manual rename can finish locally while thread/start is still pending.
  const manualNames = new Map<string, { name: string; revision: number }>();
  let titleRevision = 0;
  const identityKeys = (thread: Pick<Thread, 'id' | 'remoteId'>) => [`local:${thread.id}`, ...(thread.remoteId ? [`remote:${thread.remoteId}`] : [])];
  async function exclusive<T>(thread: Pick<Thread, 'id' | 'remoteId'>, operation: () => Promise<T>) {
    const keys = identityKeys(thread);
    if (keys.some(key => pending.has(key))) throw Error('此会话的操作尚未完成，请稍后重试。');
    keys.forEach(key => pending.add(key));
    try { return await operation(); }
    finally { keys.forEach(key => pending.delete(key)); }
  }
  return {
    query: repository.query,
    changePermission(source, permission) {
      const identity = { id: source.id, remoteId: source.remoteId };
      return exclusive(identity, async () => readPermissionUpdate(await backend.changePermission(identity.remoteId, permission), permission));
    },
    switchProvider(source, providerId, model) {
      const identity = { id: source.id, remoteId: source.remoteId };
      return exclusive(identity, async () => readThreadProvider(await backend.switchProvider(identity.remoteId, providerId, model), identity.remoteId, providerId, model));
    },
    async readHistory(threadId, options) {
      const items = await history.readAll(threadId, options);
      validateRestorableHistory(items);
      return items;
    },
    findMessageTurn: (threadId, messageId) => findMessageTurn((id, cursor) => backend.turns(id, cursor), threadId, messageId),
    async start(localId, options) {
      const key = `start:${localId}`;
      if (pending.has(key)) throw Error('此会话正在创建，请等待完成。');
      pending.add(key);
      try { return readThreadStart(await backend.start(structuredClone(options))); }
      finally { pending.delete(key); }
    },
    fork(source, lastTurnId) {
      const identity = { ...source };
      return exclusive(identity, async () => readThreadFork(await backend.fork(identity.remoteId, lastTurnId), identity.remoteId));
    },
    async resume(threadId) { return readThreadResume(await backend.resume(threadId), threadId); },
    rename: (thread, name) => {
      const identity = { id: thread.id, remoteId: thread.remoteId };
      return exclusive(identity, async () => {
        await mutations.rename(identity, name);
        const confirmed = { name, revision: ++titleRevision };
        identityKeys(identity).forEach(key => manualNames.set(key, confirmed));
      });
    },
    syncInitialTitle: (thread, title) => {
      const identity = { ...thread };
      return exclusive(identity, async () => {
        const manual = identityKeys(identity).map(key => manualNames.get(key)).reduce<{ name: string; revision: number } | undefined>((latest, entry) => entry && (!latest || entry.revision > latest.revision) ? entry : latest, undefined);
        await backend.rename(identity.remoteId, manual?.name ?? title);
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

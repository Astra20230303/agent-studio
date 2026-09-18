import type { DesktopState, Thread } from './domain';

export interface ThreadMutations {
  rename(thread: Pick<Thread, 'id' | 'remoteId'>, name: string): Promise<void>;
  archive(thread: Pick<Thread, 'id' | 'remoteId'>): Promise<void>;
  remove(thread: Pick<Thread, 'id' | 'remoteId'>): Promise<void>;
}
export interface ThreadRemoteMutations {
  rename(id: string, name: string): Promise<unknown>;
  archive(id: string): Promise<unknown>;
  remove(id: string): Promise<unknown>;
}

// Apply a narrow mutation to the latest state only after remote acknowledgement.
// The caller owns connection checks, operation locks, and queue coordination.
export function createThreadMutations(remote: ThreadRemoteMutations, update: (mutate: (state: DesktopState) => void) => void): ThreadMutations {
  return {
    async rename({ id, remoteId }, name) {
      if (remoteId) await remote.rename(remoteId, name);
      update(state => {
        const thread = state.threads.find(thread => thread.id === id);
        if (thread) { thread.title = name; thread.titleSource = 'manual'; }
      });
    },
    async archive({ id, remoteId }) {
      if (remoteId) await remote.archive(remoteId);
      update(state => {
        const thread = state.threads.find(thread => thread.id === id);
        if (thread) { thread.archived = true; thread.status = 'completed'; }
        if (state.activeThreadId === id) state.activeThreadId = undefined;
      });
    },
    async remove({ id, remoteId }) {
      if (remoteId) await remote.remove(remoteId);
      update(state => {
        state.threads = state.threads.filter(thread => thread.id !== id);
        if (state.activeThreadId === id) state.activeThreadId = undefined;
      });
    },
  };
}

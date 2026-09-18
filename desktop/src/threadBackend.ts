import { switchThreadProvider, listThreadItems, listThreadTurns, listThreads, listArchivedThreads, searchThreads, setThreadName, archiveThread, deleteThread, unarchiveThread, resumeThread, startThread, forkThread } from './codexClient';
import type { ThreadBackend } from './threadStore';

export const threadBackend: ThreadBackend = {
  switchProvider: switchThreadProvider, items: listThreadItems, turns: listThreadTurns, fork: forkThread, start: startThread, resume: resumeThread, list: listThreads, archived: listArchivedThreads, search: searchThreads,
  rename: setThreadName, archive: archiveThread, remove: deleteThread, restore: unarchiveThread,
};

import { listThreads, listArchivedThreads, searchThreads, setThreadName, archiveThread, deleteThread, unarchiveThread } from './codexClient';
import type { ThreadBackend } from './threadStore';

export const threadBackend: ThreadBackend = {
  list: listThreads, archived: listArchivedThreads, search: searchThreads,
  rename: setThreadName, archive: archiveThread, remove: deleteThread, restore: unarchiveThread,
};

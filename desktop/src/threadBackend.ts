import { listThreads, listArchivedThreads, searchThreads, setThreadName, archiveThread, deleteThread, unarchiveThread, resumeThread, startThread } from './codexClient';
import type { ThreadBackend } from './threadStore';

export const threadBackend: ThreadBackend = {
  start: startThread, resume: resumeThread, list: listThreads, archived: listArchivedThreads, search: searchThreads,
  rename: setThreadName, archive: archiveThread, remove: deleteThread, restore: unarchiveThread,
};

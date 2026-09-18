import { listThreads, listArchivedThreads, searchThreads } from './codexClient';
import { createThreadRepository } from './threadRepository';

export const threadRepository = createThreadRepository({ list: listThreads, archived: listArchivedThreads, search: searchThreads });

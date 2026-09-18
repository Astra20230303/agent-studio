import type { Thread } from './domain';

export function relatedThreads(threads: Thread[], active?: Thread): Thread[] {
  if (!active?.remoteId) return [];
  return threads.filter(thread => thread.id !== active.id && !thread.archived && thread.messages.some(message => {
    const tool = message.tool;
    return tool?.subAgent?.threadId === active.remoteId
      || tool?.collaboration?.receiverThreadIds.includes(active.remoteId!)
      || Object.prototype.hasOwnProperty.call(tool?.collaboration?.agentsStates || {}, active.remoteId!);
  }));
}

export function RelatedThreads({ threads, active, onSelect }: { threads: Thread[]; active?: Thread; onSelect: (thread: Thread) => void }) {
  const sources = relatedThreads(threads, active);
  if (!sources.length) return null;
  return <nav aria-label="关联会话" style={{ padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    <span>在这些会话中有协作记录：</span>
    {sources.map(thread => <button key={thread.id} onClick={() => onSelect(thread)} title={thread.cwd} style={{ maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
      返回 {thread.title}{thread.cwd ? ` · ${thread.cwd}` : ''}
    </button>)}
  </nav>;
}

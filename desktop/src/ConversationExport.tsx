import { useEffect, useRef, useState } from 'react';
import type { Thread } from './domain';
import type { ThreadStore } from './threadStore';

import { conversationMarkdown } from './conversationMarkdown';
export { conversationMarkdown } from './conversationMarkdown';

export function ConversationExport({ thread, repository, connected, busy, toast }: { repository: Pick<ThreadStore, 'readHistory'>; thread: Thread; connected: boolean; busy: boolean; toast: (message: string) => void }) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [reading, setReading] = useState(false);
  const historyRequest = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => historyRequest.current?.abort(), [thread.id]);
  const lock = useRef(false);
  const run = async () => {
    if (lock.current) return;
    lock.current = true; setExporting(true);
    const snapshot = structuredClone(thread);
    const request = new AbortController();
    try {
      let items: any[] | undefined;
      if (snapshot.remoteId && connected) {
        historyRequest.current = request; setReading(true); setProgress('正在读取导出记录…');
        items = await repository.readHistory(snapshot.remoteId, { signal: request.signal, onProgress: ({ pages, items }) => setProgress(`导出已读取 ${pages} 页，${items} 条记录`) });
      }
      request.signal.throwIfAborted();
      historyRequest.current = undefined; setReading(false); setProgress('');
      const content = conversationMarkdown(snapshot, items);
      let basename = snapshot.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100).replace(/[. ]+$/, '') || 'conversation';
      if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(basename)) basename = `conversation-${basename}`;
      const filename = `${basename}.md`;
      const save = window.desktop?.saveConversation;
      if (save) {
        const result = await save({ filename, content });
        if (!result.ok) throw new Error(result.error || '保存失败');
        if (!result.canceled) toast('会话已导出');
      } else {
        const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('已开始下载会话');
      }
    } catch (error) { toast(request.signal.aborted ? '已取消导出，未保存文件' : `导出失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { historyRequest.current = undefined; lock.current = false; setExporting(false); setReading(false); setProgress(''); }
  };
  return <><button disabled={busy || exporting} title={connected && thread.remoteId ? '读取完整服务端历史并保存 Markdown' : '导出本机已加载记录，可能不完整'} onClick={() => void run()}>{exporting ? '正在导出…' : connected && thread.remoteId ? '导出 Markdown' : '导出本机记录'}</button>{reading && <button onClick={() => historyRequest.current?.abort()}>取消导出读取</button>}{progress && <span role="status">{progress}</span>}</>;
}

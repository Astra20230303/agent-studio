import { useRef, useState } from 'react';
import type { Thread } from './domain';
import { listAllThreadItems } from './codexClient';

import { conversationMarkdown } from './conversationMarkdown';
export { conversationMarkdown } from './conversationMarkdown';

export function ConversationExport({ thread, connected, busy, toast }: { thread: Thread; connected: boolean; busy: boolean; toast: (message: string) => void }) {
  const [exporting, setExporting] = useState(false);
  const lock = useRef(false);
  const run = async () => {
    if (lock.current) return;
    lock.current = true; setExporting(true);
    const snapshot = structuredClone(thread);
    try {
      let items: any[] | undefined;
      if (snapshot.remoteId && connected) {
        items = await listAllThreadItems(snapshot.remoteId);
      }
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
    } catch (error) { toast(`导出失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { lock.current = false; setExporting(false); }
  };
  return <button disabled={busy || exporting} title={connected && thread.remoteId ? '读取完整服务端历史并保存 Markdown' : '导出本机已加载记录，可能不完整'} onClick={() => void run()}>{exporting ? '正在导出…' : connected && thread.remoteId ? '导出 Markdown' : '导出本机记录'}</button>;
}

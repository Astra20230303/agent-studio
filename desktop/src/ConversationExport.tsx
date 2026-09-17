import { useRef, useState } from 'react';
import type { Thread } from './domain';
import { listThreadItems } from './codexClient';

function block(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const fence = '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map(match => match[0].length + 1)));
  return `${fence}\n${text}\n${fence}`;
}
export function conversationMarkdown(thread: Thread, items?: any[]) {
  const title = thread.title.replace(/[\r\n]+/g, ' ');
  const intro = `# ${title}\n\n导出时间：${new Date().toISOString()}\n\n来源：${items ? '服务端完整分页记录' : '本机已加载记录（可能不完整）'}\n\n会话：${block(thread.remoteId || thread.id)}\n`;
  const records = items ? items.map(entry => {
    const item = entry.item || entry;
    const label = item.type === 'userMessage' ? '用户' : item.type === 'agentMessage' ? '助手' : item.type;
    const content = item.type === 'agentMessage' ? item.text : item.type === 'userMessage'
      ? (item.content || []).map((part: any) => part.type === 'text' ? part.text : block(part)).join('\n\n') : block(entry);
    return `## ${label}\n\n${content || ''}`;
  }) : thread.messages.map(message => `## ${{ user: '用户', assistant: '助手', system: '系统' }[message.role]}\n\n${message.content}${message.attachments?.length ? `\n\n附件路径（未嵌入文件）：\n${block(message.attachments)}` : ''}${message.skills?.length ? `\n\n技能：\n${block(message.skills)}` : ''}${message.tool ? `\n\n工具记录：\n${block(message.tool)}` : ''}`);
  return `${intro}\n${records.join('\n\n---\n\n')}\n`;
}

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
        items = []; let cursor: string | undefined; const seen = new Set<string>();
        do {
          const page = await listThreadItems(snapshot.remoteId, cursor);
          if (!Array.isArray(page.data)) throw new Error('服务端历史格式无效');
          items.push(...page.data);
          cursor = page.nextCursor || undefined;
          if (cursor && seen.has(cursor)) throw new Error('服务端历史分页重复，请重试');
          if (cursor) seen.add(cursor);
        } while (cursor);
      }
      const content = conversationMarkdown(snapshot, items);
      const filename = `${snapshot.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100).replace(/[. ]+$/, '') || 'conversation'}.md`;
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
  return <button disabled={busy || exporting} title={connected && thread.remoteId ? '读取完整服务端历史并保存 Markdown' : '导出本机已加载记录，可能不完整'} onClick={() => void run()}>{exporting ? '正在导出…' : '导出 Markdown'}</button>;
}

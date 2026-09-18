import { useMessageCopy } from './useMessageCopy';
import { useRef, useState } from 'react';
import { Check, Copy, GitFork, LoaderCircle } from 'lucide-react';
import { replyText } from './messageActions';

export function MessageActions({ content, onFork, disabled, onError }: {
  content: string; onFork: () => Promise<void>; disabled: boolean; onError: (message: string) => void;
}) {
  const { copied, copying, copy } = useMessageCopy(replyText(content), onError);
  const [branching, setBranching] = useState(false);
  const busy = useRef(false);
  const fork = async () => {
    if (busy.current || disabled) return;
    busy.current = true; setBranching(true);
    try { await onFork(); }
    catch (error) { onError(`创建分支失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { busy.current = false; setBranching(false); }
  };
  return <div className="message-actions">
    <button className="reply-action" aria-label={copied ? '已复制' : '复制回复'} data-tooltip={copied ? '已复制' : '复制回复'} onClick={() => void copy()} aria-busy={copying} disabled={copying || !replyText(content)}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>
    <button className="reply-action" aria-label="分支到新聊天" data-tooltip={disabled ? '请等待会话连接且本轮回复完成' : branching ? '正在创建分支…' : '分支到新聊天'} onClick={() => void fork()} disabled={disabled || branching}>{branching ? <LoaderCircle size={14} className="action-spinner" /> : <GitFork size={14} />}</button>
    <span className="sr-only" role="status">{copied ? '回复已复制' : branching ? '正在创建分支' : ''}</span>
  </div>;
}

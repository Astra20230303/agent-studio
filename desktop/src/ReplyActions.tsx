import { useMessageCopy } from './useMessageCopy';
import { useRef, useState } from 'react';
import { Check, Copy, GitFork, LoaderCircle, Undo2 } from 'lucide-react';
import { replyText } from './messageActions';

export function MessageActions({ content, onFork, onRevert, disabled, onError }: {
  content: string; onFork: () => Promise<void>; onRevert: () => Promise<void>; disabled: boolean; onError: (message: string) => void;
}) {
  const { copied, copying, copy } = useMessageCopy(replyText(content), onError);
  const [branching, setBranching] = useState(false);
  const [reverting, setReverting] = useState(false);
  const busy = useRef(false);
  const fork = async () => {
    if (busy.current || disabled) return;
    busy.current = true; setBranching(true);
    try { await onFork(); }
    catch (error) { onError(`创建分支失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { busy.current = false; setBranching(false); }
  };
  const revert = async () => {
    if (busy.current || disabled || !window.confirm('回退到此回复？此回复及之后的会话历史将从远端移除，本地文件不会自动还原。')) return;
    busy.current = true; setReverting(true);
    try { await onRevert(); }
    catch (error) { onError(`回退会话失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { busy.current = false; setReverting(false); }
  };
  return <div className="message-actions">
    <button className="reply-action" aria-label={copied ? '已复制' : '复制回复'} data-tooltip={copied ? '已复制' : '复制回复'} onClick={() => void copy()} aria-busy={copying} disabled={copying || !replyText(content)}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>
    <button className="reply-action" aria-label="分支到新聊天" data-tooltip={disabled ? '请等待会话连接且本轮回复完成' : branching ? '正在创建分支…' : '分支到新聊天'} onClick={() => void fork()} disabled={disabled || branching}>{branching ? <LoaderCircle size={14} className="action-spinner" /> : <GitFork size={14} />}</button>
    <button className="reply-action" aria-label="回退到此回复" data-tooltip={disabled ? '请等待会话连接且本轮回复完成' : reverting ? '正在回退…' : '回退到此回复'} onClick={() => void revert()} disabled={disabled || reverting}>{reverting ? <LoaderCircle size={14} className="action-spinner" /> : <Undo2 size={14} />}</button>
    <span className="sr-only" role="status">{copied ? '回复已复制' : branching ? '正在创建分支' : reverting ? '正在回退' : ''}</span>
  </div>;
}

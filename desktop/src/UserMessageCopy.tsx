import { useMessageCopy } from './useMessageCopy';
import { Check, Copy } from 'lucide-react';

export function UserMessageCopy({ content, onError }: { content: string; onError: (message: string) => void }) {
  const { copied, copying, copy } = useMessageCopy(content, onError);
  return <div className="message-actions">
    <button className="reply-action" aria-label={copied ? '用户消息已复制' : '复制用户消息'} data-tooltip={copied ? '已复制' : '复制用户消息'} aria-busy={copying} disabled={copying || !content} onClick={() => void copy()}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>
    <span className="sr-only" role="status">{copied ? '用户消息已复制' : ''}</span>
  </div>;
}

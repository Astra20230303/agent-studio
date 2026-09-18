import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function UserMessageCopy({ content, onError }: { content: string; onError: (message: string) => void }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const locked = useRef(false);
  useEffect(() => { setCopied(false); return () => clearTimeout(timer.current); }, [content]);
  const copy = async () => {
    if (locked.current) return;
    locked.current = true;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true); clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch { onError('复制失败，请检查剪贴板权限后重试。'); }
    finally { locked.current = false; }
  };
  return <div className="message-actions">
    <button className="reply-action" aria-label={copied ? '用户消息已复制' : '复制用户消息'} data-tooltip={copied ? '已复制' : '复制用户消息'} disabled={!content} onClick={() => void copy()}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>
    <span className="sr-only" role="status">{copied ? '用户消息已复制' : ''}</span>
  </div>;
}

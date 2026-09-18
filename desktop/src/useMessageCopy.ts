import { useEffect, useRef, useState } from 'react';
export function useMessageCopy(content: string, onError: (message: string) => void) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const locked = useRef(false);
  const version = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    version.current++; setCopied(false);
    return () => { version.current++; clearTimeout(timer.current); };
  }, [content]);
  const copy = async () => {
    if (locked.current || !content) return;
    locked.current = true; setCopying(true); setCopied(false); clearTimeout(timer.current);
    const attempt = version.current;
    try {
      await navigator.clipboard.writeText(content);
      if (version.current !== attempt) return;
      setCopied(true); timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      if (version.current === attempt) onError('复制失败，请检查剪贴板权限后重试。');
    } finally { locked.current = false; setCopying(false); }
  };
  return { copied, copying, copy };
}

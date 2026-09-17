import { useEffect, useRef, useState } from 'react';

export function CopyText({ source, label }: { source: string; label: string }) {
  const [copied, setCopied] = useState<string>();
  const [error, setError] = useState('');
  const attempt = useRef(0);
  useEffect(() => { attempt.current++; setCopied(undefined); setError(''); }, [source]);
  useEffect(() => () => { attempt.current++; }, []);
  const copy = async () => {
    const version = ++attempt.current;
    setError('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(source);
      if (attempt.current === version) setCopied(source);
    } catch { if (attempt.current === version) { setCopied(undefined); setError('复制失败，请检查剪贴板权限后重试。'); } }
  };
  return <span className="copy-text"><button aria-label={label} onClick={() => void copy()}>{copied === source ? '已复制' : label}</button><span className="sr-only" role="status">{copied === source ? `${label.replace(/^复制/, '')}已复制` : ''}</span>{error && <span role="alert">{error}</span>}</span>;
}

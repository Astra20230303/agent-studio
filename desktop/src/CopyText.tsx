import { useEffect, useRef, useState } from 'react';

export function CopyText({ source, label }: { source: string; label: string }) {
  const [copied, setCopied] = useState<string>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const copying = useRef(false);
  const attempt = useRef(0);
  useEffect(() => { attempt.current++; setCopied(undefined); setError(''); }, [source]);
  useEffect(() => () => { attempt.current++; }, []);
  const copy = async () => {
    if (copying.current) return;
    copying.current = true; setBusy(true);
    const version = ++attempt.current;
    setError('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(source);
      if (attempt.current === version) setCopied(source);
    } catch { if (attempt.current === version) { setCopied(undefined); setError('复制失败，请检查剪贴板权限后重试。'); } }
    finally { copying.current = false; setBusy(false); }
  };
  return <span className="copy-text"><button aria-label={label} disabled={busy} aria-busy={busy} onClick={() => void copy()}>{busy ? '正在复制…' : copied === source ? '已复制' : label}</button><span className="sr-only" role="status">{busy ? '正在复制…' : copied === source ? `${label.replace(/^复制/, '')}已复制` : ''}</span>{error && <span role="alert">{error}</span>}</span>;
}

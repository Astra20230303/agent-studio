import { useEffect, useRef, useState } from 'react';

export function CodeBlock({ source, language }: { source: string; language: string }) {
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
  return <div className="code-block"><div className="code-header"><span>{language || '代码'}</span><button aria-label="复制代码" onClick={() => void copy()}>{copied === source ? '已复制' : '复制'}</button><span className="sr-only" role="status">{copied === source ? '代码已复制' : ''}</span></div>{error && <p role="alert">{error}</p>}<pre><code>{source}</code></pre></div>;
}

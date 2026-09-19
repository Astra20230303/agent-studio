import { useEffect, useRef, useState } from 'react';
import { readCodexProviderCapabilities } from './codexClient';
import type { CodexProviderCapabilities } from './codexProviderCapabilities';
export function CodexProviderCapabilitiesPanel({ connected, busy }: { connected: boolean; busy?: boolean }) {
  const [capabilities, setCapabilities] = useState<CodexProviderCapabilities>(); const [loading, setLoading] = useState(false); const [notice, setNotice] = useState('');
  const generation = useRef(0), lock = useRef(false);
  const load = async () => {
    if (!connected || busy || lock.current) return;
    const ticket = generation.current;
    lock.current = true; setLoading(true); setNotice(''); setCapabilities(undefined);
    try { const result = await readCodexProviderCapabilities(); if (ticket === generation.current) setCapabilities(result); }
    catch (error) { if (ticket === generation.current) setNotice(`读取模型渠道能力失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { if (ticket === generation.current) { lock.current = false; setLoading(false); } }
  };
  useEffect(() => {
    generation.current++; lock.current = false; setLoading(false); setCapabilities(undefined); setNotice('');
    if (connected && !busy) void load();
    return () => { generation.current++; };
  }, [connected, busy]);
  return <section className="settings-card" aria-label="Codex 模型渠道能力"><h2>Codex 模型渠道能力</h2><p>查看当前 app-server 模型渠道声明的高级能力。</p><button disabled={!connected || busy || loading} onClick={() => void load()}>{loading ? '读取中…' : '刷新能力'}</button>{capabilities && <dl><dt>命名空间工具</dt><dd>{capabilities.namespaceTools ? '支持' : '不支持'}</dd><dt>图像生成</dt><dd>{capabilities.imageGeneration ? '支持' : '不支持'}</dd><dt>网页搜索</dt><dd>{capabilities.webSearch ? '支持' : '不支持'}</dd></dl>}{notice && <p role="alert">{notice}</p>}</section>;
}

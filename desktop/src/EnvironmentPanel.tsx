import { useEffect, useState } from 'react';
import { readEnvironmentInfo, readEnvironmentStatus, type EnvironmentInfo, type EnvironmentStatus } from './environment';
import { addEnvironment, readEnvironmentInfo as requestInfo, readEnvironmentStatus as requestStatus } from './codexClient';

const labels = { ready: '就绪', pending: '连接中', disconnected: '已断开', unknown: '未知环境' } as const;
export function EnvironmentPanel({ connected, busy }: { connected: boolean; busy?: boolean }) {
  const [environmentId, setEnvironmentId] = useState('local');
  const [info, setInfo] = useState<EnvironmentInfo>();
  const [status, setStatus] = useState<EnvironmentStatus>();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [execServerUrl, setExecServerUrl] = useState('');
  const [timeout, setTimeoutValue] = useState('');
  const load = async () => {
    const id = environmentId.trim();
    if (!connected || busy || loading || !/^\S+$/.test(id)) { if (!/^\S+$/.test(id)) setNotice('请输入环境 ID'); return; }
    setLoading(true); setNotice('');
    try { const [nextInfo, nextStatus] = await Promise.all([requestInfo(id), requestStatus(id)]); setInfo(nextInfo); setStatus(nextStatus); }
    catch (error) { setInfo(undefined); setStatus(undefined); setNotice(`读取环境信息失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { setLoading(false); }
  };
  const add = async () => {
    if (!connected || busy || loading) return;
    setLoading(true); setNotice('');
    try { await addEnvironment(environmentId.trim(), execServerUrl.trim(), timeout.trim() ? Number(timeout) : undefined); setNotice('环境已注册，请刷新读取状态。'); }
    catch (error) { setNotice(`注册环境失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (!connected) { setInfo(undefined); setStatus(undefined); setNotice(''); } }, [connected]);
  return <section className="settings-card" aria-label="Codex 执行环境"><h2>Codex 执行环境</h2><p>查看或注册 app-server 配置的执行环境和 shell 信息。</p><label>环境 ID<input value={environmentId} onChange={event => setEnvironmentId(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void load(); }} /></label><button disabled={!connected || busy || loading} onClick={() => void load()}>{loading ? '读取中…' : '读取环境'}</button><details><summary>注册远程 exec-server</summary><label>WebSocket URL<input placeholder="wss://example/exec" value={execServerUrl} onChange={event => setExecServerUrl(event.target.value)} /></label><label>连接超时（毫秒，可选）<input inputMode="numeric" value={timeout} onChange={event => setTimeoutValue(event.target.value)} /></label><button disabled={!connected || busy || loading || !execServerUrl.trim()} onClick={() => void add()}>注册环境</button></details>{status && <p role="status">连接状态：{labels[status.status]}{status.error ? ` · ${status.error}` : ''}</p>}{info && <dl><dt>Shell</dt><dd>{info.shell.name} · {info.shell.path}</dd>{info.cwd && <><dt>默认工作目录</dt><dd>{info.cwd}</dd></>}</dl>}{notice && <p role="alert">{notice}</p>}</section>;
}

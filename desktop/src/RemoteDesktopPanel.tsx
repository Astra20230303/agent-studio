import { useRef, useState } from 'react';
import { Monitor, RefreshCw, Square } from 'lucide-react';

type Result = { isError?: boolean; content: { type: string; text?: string; data?: string; mimeType?: string }[] };

export function RemoteDesktopPanel() {
  const [url, setUrl] = useState('http://127.0.0.1:16080/vnc.html');
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState('');
  const [status, setStatus] = useState('未连接');
  const requestGeneration = useRef(0);
  const run = async (type: string) => {
    const generation = ++requestGeneration.current;
    setBusy(true);
    try {
      const bridge = window.desktop as typeof window.desktop & { remoteAction?: (action: { type: string; url: string }) => Promise<Result> };
      const result = await bridge?.remoteAction?.({ type, url });
      if (!result || result.isError) throw new Error(result?.content.find(item => item.type === 'text')?.text || '请在 Felix 桌面应用中连接');
      const screenshot = result.content.find(item => item.type === 'image');
      if (generation !== requestGeneration.current) return;
      setImage(screenshot ? `data:${screenshot.mimeType};base64,${screenshot.data}` : '');
      setStatus(type === 'disconnect' ? '已停止控制' : '已连接');
    } catch (error) { if (generation === requestGeneration.current) setStatus(error instanceof Error ? error.message : '连接失败'); }
    finally { if (generation === requestGeneration.current) setBusy(false); }
  };
  return <section>
    <label htmlFor="remote-url">noVNC 地址</label>
    <input id="remote-url" value={url} disabled={busy} onChange={event => setUrl(event.target.value)} style={{ display: 'block', width: '100%', padding: 10, margin: '12px 0', boxSizing: 'border-box' }} />
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <button disabled={busy} onClick={() => void run('connect')}><Monitor size={16} />连接远程桌面</button>
      <button disabled={busy || !image} onClick={() => void run('screenshot')} title="刷新截图"><RefreshCw size={16} /></button>
      <button onClick={() => void run('disconnect')}><Square size={16} />停止控制</button>
    </div>
    <p role="status">{busy ? '正在处理…' : status}</p>
    {image && <img src={image} alt="远程桌面当前截图" style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />}
  </section>;
}

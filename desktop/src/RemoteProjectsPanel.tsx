import { useState } from 'react';
import { listRemoteProjects } from './codexClient';
import type { RemoteProject } from './remoteProjects';

export function RemoteProjectsPanel({ connected, busy }: { connected: boolean; busy?: boolean }) {
  const [projects, setProjects] = useState<RemoteProject[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const refresh = async () => {
    if (!connected || busy || loading) return;
    setLoading(true); setStatus('');
    try { const result = await listRemoteProjects(); setProjects(result); setStatus(`已读取 ${result.length} 个远端项目`); }
    catch (error) { setStatus(`读取远端项目失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { setLoading(false); }
  };
  return <section className="settings-card" aria-label="Codex 远端项目"><h2>Codex 远端项目</h2><p>查看 app-server 保存的项目及其根目录。</p><button disabled={!connected || busy || loading} onClick={() => void refresh()}>{loading ? '正在读取…' : '刷新远端项目'}</button>{status && <p role="status">{status}</p>}{projects.length > 0 && <ul>{projects.map(project => <li key={project.id}><strong>{project.name}</strong><span> · {project.roots.join('、') || '无根目录'}</span>{project.recencyAt != null && <small> · 最近活跃 {new Date(project.recencyAt * 1000).toLocaleString()}</small>}{Object.keys(project.metadata).length > 0 && <small> · {Object.entries(project.metadata).map(([key, value]) => `${key}=${value}`).join(', ')}</small>}</li>)}</ul>}</section>;
}

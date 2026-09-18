import { useCallback, useEffect, useRef, useState } from 'react';
import { createRemoteProject, deleteRemoteProject, listRemoteProjects, subscribeCodex, updateRemoteProject } from './codexClient';
import { readRemoteProjectChange, type RemoteProject } from './remoteProjects';

type Draft = { name: string; roots: string; metadata: string };
const emptyDraft = (): Draft => ({ name: '', roots: '', metadata: '' });
const draftFor = (project: RemoteProject): Draft => ({ name: project.name, roots: project.roots.join('\n'), metadata: Object.entries(project.metadata).map(([key, value]) => `${key}=${value}`).join('\n') });
function parseDraft(draft: Draft) {
  const roots = draft.roots.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  const metadata: Record<string, string> = {};
  for (const line of draft.metadata.split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
    const separator = line.indexOf('=');
    if (separator <= 0) throw new Error(`metadata 行无效：${line}`);
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1);
    if (!key || key in metadata) throw new Error(`metadata 键无效或重复：${key}`);
    metadata[key] = value;
  }
  return { name: draft.name, roots, metadata };
}

export function RemoteProjectsPanel({ connected, busy }: { connected: boolean; busy?: boolean }) {
  const [projects, setProjects] = useState<RemoteProject[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [editing, setEditing] = useState<string | 'new'>();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const refresh = useCallback(async (fromNotification = false) => {
    if (!connected || busy || loadingRef.current) return;
    loadingRef.current = true; setLoading(true); if (!fromNotification) setStatus('');
    try { const result = await listRemoteProjects(); setProjects(result); setStatus(`已读取 ${result.length} 个远端项目`); }
    catch (error) { setStatus(`读取远端项目失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { loadingRef.current = false; setLoading(false); }
  }, [connected, busy]);
  useEffect(() => connected ? subscribeCodex({ notification: message => { if (message.method === 'project/changed' && readRemoteProjectChange(message.params)) void refresh(true); } }) : undefined, [connected, refresh]);
  const save = async (project?: RemoteProject) => {
    if (loading) return;
    setLoading(true); setStatus('');
    try {
      const input = parseDraft(draft);
      if (project) await updateRemoteProject(project, input.name, input.roots, input.metadata);
      else await createRemoteProject(input.name, input.roots, input.metadata);
      setEditing(undefined); setDraft(emptyDraft()); setStatus(project ? '远端项目已更新' : '远端项目已创建'); setProjects(await listRemoteProjects());
    } catch (error) { setStatus(`保存远端项目失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { setLoading(false); }
  };
  const remove = async (project: RemoteProject) => {
    if (loading || !window.confirm(`确定删除远端项目“${project.name}”吗？`)) return;
    setLoading(true); setStatus('');
    try { await deleteRemoteProject(project.id); setProjects(await listRemoteProjects()); setStatus('远端项目已删除'); }
    catch (error) { setStatus(`删除远端项目失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { setLoading(false); }
  };
  const form = editing && <form onSubmit={event => { event.preventDefault(); void save(editing === 'new' ? undefined : projects.find(project => project.id === editing)); }}>
    <label>名称<input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} required /></label>
    <label>根目录（每行一个）<textarea value={draft.roots} onChange={event => setDraft({ ...draft, roots: event.target.value })} rows={3} /></label>
    <label>metadata（每行 key=value）<textarea value={draft.metadata} onChange={event => setDraft({ ...draft, metadata: event.target.value })} rows={3} /></label>
    <button type="submit" disabled={loading}>{loading ? '保存中…' : '保存'}</button><button type="button" disabled={loading} onClick={() => { setEditing(undefined); setDraft(emptyDraft()); }}>取消</button>
  </form>;
  return <section className="settings-card" aria-label="Codex 远端项目"><h2>Codex 远端项目</h2><p>查看并管理 app-server 保存的项目及其根目录。</p><button disabled={!connected || busy || loading} onClick={() => void refresh()}>{loading ? '正在处理…' : '刷新远端项目'}</button><button disabled={!connected || busy || loading} onClick={() => { setEditing('new'); setDraft(emptyDraft()); }}>新建项目</button>{status && <p role="status">{status}</p>}{form}{projects.length > 0 && <ul>{projects.map(project => <li key={project.id}><strong>{project.name}</strong><span> · {project.roots.join('、') || '无根目录'}</span>{project.recencyAt != null && <small> · 最近活跃 {new Date(project.recencyAt * 1000).toLocaleString()}</small>}{Object.keys(project.metadata).length > 0 && <small> · {Object.entries(project.metadata).map(([key, value]) => `${key}=${value}`).join(', ')}</small>}<button disabled={loading || !connected || busy} onClick={() => { setEditing(project.id); setDraft(draftFor(project)); }}>编辑</button><button disabled={loading || !connected || busy} onClick={() => void remove(project)}>删除</button></li>)}</ul>}</section>;
}

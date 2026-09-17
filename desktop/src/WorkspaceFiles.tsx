import { useEffect, useState } from 'react';
import './workspaceFiles.css';
import { FileEditor } from './FileEditor';
type Entry = { name: string; path: string; directory: boolean; symlink: boolean };
export function WorkspaceFiles({ root, onAttach, onClose }: { root?: string; onAttach: (path: string) => void; onClose: () => void }) {
  const [directory, setDirectory] = useState('.');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Entry>();
  const [listing, setListing] = useState<{ entries: Entry[]; truncated?: boolean; skipped?: number }>();
  const [preview, setPreview] = useState<any>();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let disposed = false;
    setError(''); setPreview(undefined); setListing(undefined);
    if (!root) return;
    const read = async () => {
      const response = await window.desktop?.workspaceFile?.({ root, path: selected?.path || (search ? '.' : directory), action: selected ? 'read' : search ? 'search' : 'list', query: search });
      if (disposed) return;
      if (!response?.ok) throw Error(response?.error || '文件浏览不可用');
      if (selected) setPreview(response.result); else setListing(response.result);
    };
    void read().catch(error => { if (!disposed) setError(error.message); });
    return () => { disposed = true; };
  }, [root, directory, selected, refresh, search]);
  return <section className="workspace-files" aria-label="工作区文件"><header><b>文件</b><button onClick={() => { setSelected(undefined); setDirectory('.'); setQuery(''); setSearch(''); }}>根目录</button><button onClick={() => setRefresh(value => value + 1)}>刷新文件</button><button onClick={onClose} aria-label="关闭文件面板">×</button></header><small>{root || '请先选择项目目录'}</small>
    <form onSubmit={event => { event.preventDefault(); setSelected(undefined); setSearch(query.trim()); }}><input aria-label="查找工作区文件" placeholder="文件名或相对路径" value={query} onChange={event => setQuery(event.target.value)} /><button disabled={!root}>查找文件</button>{search && <button type="button" onClick={() => { setQuery(''); setSearch(''); setSelected(undefined); }}>清除文件查找</button>}</form>
    {search && <small>搜索工作区内文件，跳过 .git 和符号链接；最多扫描 20000 项、返回 200 个结果。</small>}
    {selected ? <><button onClick={() => setSelected(undefined)}>返回目录</button><h3>{selected.name}</h3><button onClick={() => onAttach(`${root}/${selected.path}`)}>添加到消息</button></> : <><p>{search ? `文件查找：${search}` : directory}</p>{!search && directory !== '.' && <button onClick={() => setDirectory(directory.split(/[\\/]/).slice(0, -1).join('/') || '.')}>上级目录</button>}{listing?.entries.map(entry => <button className="workspace-file-row" key={entry.path} onClick={() => entry.directory ? setDirectory(entry.path) : setSelected(entry)}>{entry.directory ? '▸' : '▧'} {search ? entry.path : entry.name}{entry.symlink ? ' ↗' : ''}</button>)}{listing?.truncated && <p>{search ? '搜索达到上限，请缩小关键词范围。' : '仅显示前 1000 项。'}</p>}</>}
    {!!listing?.skipped && <p>有 {listing.skipped} 个目录无法读取，结果可能不完整。</p>}
    {error && <p role="alert">{error}</p>}{root && !listing && !preview && !error && <p>正在读取…</p>}
    {listing && !listing.entries.length && <p>{search ? '没有匹配文件。' : '此目录为空。'}</p>}
    {selected && root && preview?.revision && <button onClick={() => setEditing(true)}>编辑文件</button>}
    {editing && selected && root && preview?.revision && <FileEditor root={root} path={selected.path} initial={preview} onClose={() => setEditing(false)} onSaved={setPreview} />}
    {preview?.image && <img src={preview.image} alt={selected?.name} />}{preview?.binary && <p>二进制文件，无法显示文本预览。</p>}{typeof preview?.text === 'string' && <pre>{preview.text}</pre>}{preview?.truncated && <p>仅预览前 256 KB。</p>}
  </section>;
}

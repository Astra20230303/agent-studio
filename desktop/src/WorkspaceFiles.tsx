import { useEffect, useState } from 'react';
import './workspaceFiles.css';
type Entry = { name: string; path: string; directory: boolean; symlink: boolean };
export function WorkspaceFiles({ root, onAttach, onClose }: { root?: string; onAttach: (path: string) => void; onClose: () => void }) {
  const [directory, setDirectory] = useState('.');
  const [selected, setSelected] = useState<Entry>();
  const [listing, setListing] = useState<{ entries: Entry[]; truncated?: boolean }>();
  const [preview, setPreview] = useState<any>();
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let disposed = false;
    setError(''); setPreview(undefined); setListing(undefined);
    if (!root) return;
    const read = async () => {
      const response = await window.desktop?.workspaceFile?.({ root, path: selected?.path || directory, action: selected ? 'read' : 'list' });
      if (disposed) return;
      if (!response?.ok) throw Error(response?.error || '文件浏览不可用');
      if (selected) setPreview(response.result); else setListing(response.result);
    };
    void read().catch(error => { if (!disposed) setError(error.message); });
    return () => { disposed = true; };
  }, [root, directory, selected, refresh]);
  return <section className="workspace-files" aria-label="工作区文件"><header><b>文件</b><button onClick={() => { setSelected(undefined); setDirectory('.'); }}>根目录</button><button onClick={() => setRefresh(value => value + 1)}>刷新文件</button><button onClick={onClose} aria-label="关闭文件面板">×</button></header><small>{root || '请先选择项目目录'}</small>
    {selected ? <><button onClick={() => setSelected(undefined)}>返回目录</button><h3>{selected.name}</h3><button onClick={() => onAttach(`${root}/${selected.path}`)}>添加到消息</button></> : <><p>{directory}</p>{directory !== '.' && <button onClick={() => setDirectory(directory.split(/[\\/]/).slice(0, -1).join('/') || '.')}>上级目录</button>}{listing?.entries.map(entry => <button className="workspace-file-row" key={entry.path} onClick={() => entry.directory ? setDirectory(entry.path) : setSelected(entry)}>{entry.directory ? '▸' : '▧'} {entry.name}{entry.symlink ? ' ↗' : ''}</button>)}{listing?.truncated && <p>仅显示前 1000 项。</p>}</>}
    {error && <p role="alert">{error}</p>}{root && !listing && !preview && !error && <p>正在读取…</p>}
    {listing && !listing.entries.length && <p>此目录为空。</p>}
    {preview?.image && <img src={preview.image} alt={selected?.name} />}{preview?.binary && <p>二进制文件，无法显示文本预览。</p>}{typeof preview?.text === 'string' && <pre>{preview.text}</pre>}{preview?.truncated && <p>仅预览前 256 KB。</p>}
  </section>;
}

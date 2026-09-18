import { useEffect, useRef, useState } from 'react';
import './workspaceFiles.css';
import type { ArtifactTarget } from './Artifacts';
import { isEditablePreview } from './editablePreview';
export type FileEditSession = { root: string; path: string; initial: { text: string; revision: string } };
export type FilePreviewUpdate = { root: string; path: string; preview: any };
type Entry = { revision?: string; line?: number; column?: number; snippet?: string; name: string; path: string; directory: boolean; symlink: boolean };
export function WorkspaceFiles({ root, onAttach, onClose, onEdit, onPreview, previewUpdate }: { onPreview: (target: ArtifactTarget) => void; onEdit: (session: FileEditSession) => void; previewUpdate?: FilePreviewUpdate; root?: string; onAttach: (path: string) => void; onClose: () => void }) {
  const [directory, setDirectory] = useState('.');
  const [contentSearch, setContentSearch] = useState(false);
  const matchLine = useRef<HTMLSpanElement>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Entry>();
  const [listing, setListing] = useState<{ entries: Entry[]; truncated?: boolean; skipped?: number }>();
  const [preview, setPreview] = useState<any>();
  const [failedImageSource, setFailedImageSource] = useState<string>();
  const imageFailed = !!preview?.image && failedImageSource === preview.image;
  const requestVersion = useRef(0);
  useEffect(() => {
    if (previewUpdate && previewUpdate.root === root && previewUpdate.path === selected?.path) {
      requestVersion.current++; setPreview(previewUpdate.preview); setError('');
    }
  }, [previewUpdate, root, selected?.path]);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let disposed = false;
    const version = ++requestVersion.current;
    setError(''); setPreview(undefined); setListing(undefined);
    if (!root) return;
    const read = async () => {
      const response = await window.desktop?.workspaceFile?.({ root, path: selected?.path || (search ? '.' : directory), action: selected ? 'read' : search ? contentSearch ? 'search-content' : 'search' : 'list', query: search });
      if (disposed || version !== requestVersion.current) return;
      if (!response?.ok) throw Error(response?.error || '文件浏览不可用');
      if (selected) setPreview(response.result); else setListing(response.result);
    };
    void read().catch(error => { if (!disposed && version === requestVersion.current) setError(error.message); });
    return () => { disposed = true; };
  }, [root, directory, selected, refresh, search, contentSearch]);
  useEffect(() => { matchLine.current?.scrollIntoView({ block: 'center' }); }, [preview, selected]);
  const staleMatch = Boolean(selected?.line && selected.revision && preview && selected.revision !== preview.revision);
  return <section className="workspace-files" aria-label="工作区文件"><header><b>文件</b><button onClick={() => { setSelected(undefined); setDirectory('.'); setQuery(''); setSearch(''); }}>根目录</button><button onClick={() => setRefresh(value => value + 1)}>刷新文件</button><button onClick={onClose} aria-label="关闭文件面板">×</button></header><small>{root || '请先选择项目目录'}</small>
    <form onSubmit={event => { event.preventDefault(); setSelected(undefined); setSearch(query.trim()); }}><select aria-label="文件搜索方式" value={contentSearch ? "content" : "name"} onChange={event => { setContentSearch(event.target.value === "content"); setSelected(undefined); setSearch(''); }}><option value="name">文件名</option><option value="content">文件内容</option></select><input aria-label="查找工作区文件" placeholder={contentSearch ? "文本关键词（不区分大小写）" : "文件名或相对路径"} value={query} onChange={event => setQuery(event.target.value)} /><button disabled={!root}>查找文件</button>{search && <button type="button" onClick={() => { setQuery(''); setSearch(''); setSelected(undefined); }}>清除文件查找</button>}</form>
    {search && <small>搜索工作区内文件，跳过 .git 和符号链接；最多扫描 20000 项、返回 200 个结果。{contentSearch && " 内容搜索限完整 UTF-8 文本，每文件不超过 256 KB，总读取约 32 MB。"}</small>}
    {selected ? <><button onClick={() => setSelected(undefined)}>返回目录</button><h3>{selected.name}</h3><button disabled={!root || !preview} onClick={() => { if (root) onPreview({ root, path: selected.path, line: staleMatch ? undefined : selected.line, revision: selected.revision }); }}>展开文件预览</button><button onClick={() => onAttach(`${root}/${selected.path}`)}>添加到消息</button></> : <><p>{search ? `文件查找：${search}` : directory}</p>{!search && directory !== '.' && <button onClick={() => setDirectory(directory.split(/[\\/]/).slice(0, -1).join('/') || '.')}>上级目录</button>}{listing?.entries.map(entry => <button className="workspace-file-row" key={`${entry.path}:${entry.line || 0}`} onClick={() => entry.directory ? setDirectory(entry.path) : setSelected(entry)}>{entry.directory ? '▸' : '▧'} {search ? entry.path : entry.name}{entry.line ? `:${entry.line}:${entry.column} · ${entry.snippet}` : ''}{entry.symlink ? ' ↗' : ''}</button>)}{listing?.truncated && <p>{search ? '搜索达到上限，请缩小关键词范围。' : '仅显示前 1000 项。'}</p>}</>}
    {!!listing?.skipped && <p>有 {listing.skipped} 个文件或目录未搜索（无法读取、过大或非 UTF-8 文本），结果可能不完整。</p>}
    {error && <p role="alert">{error}</p>}{root && !listing && !preview && !error && <p>正在读取…</p>}
    {listing && !listing.entries.length && <p>{search ? '没有匹配文件。' : '此目录为空。'}</p>}
    {selected && root && isEditablePreview(preview) && <button onClick={() => onEdit({ root, path: selected.path, initial: { text: preview.text, revision: preview.revision } })}>编辑文件</button>}
    {preview?.image && <img src={preview.image} alt={selected?.name} onError={() => setFailedImageSource(preview.image)} />}{imageFailed && <p role="alert">图片无法解码，文件可能已损坏。请修复文件后刷新文件。</p>}{preview?.encodingInvalid && <p role="status">文件包含无法按 UTF-8 解码的字符，预览使用替代字符，不能编辑。</p>}{preview?.binary && <p>二进制文件，无法显示文本预览。</p>}{staleMatch && <p role="status">文件在搜索后已变化，请返回并刷新搜索结果。</p>}{typeof preview?.text === 'string' && <pre>{selected?.line && !staleMatch ? preview.text.split('\n').map((line: string, index: number) => <span key={index} ref={index + 1 === selected.line ? matchLine : undefined} style={index + 1 === selected.line ? { background: '#ffe08a', color: '#202020' } : undefined}>{line}{'\n'}</span>) : preview.text}</pre>}{preview?.truncated && <p>仅预览前 256 KB。</p>}
  </section>;
}

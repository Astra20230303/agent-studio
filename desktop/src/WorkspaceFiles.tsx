import { useEffect, useRef, useState } from 'react';
import './workspaceFiles.css';
import type { ArtifactTarget } from './Artifacts';
import { SearchMatchText } from './SearchMatchText';
import { isEditablePreview } from './editablePreview';
export type FileEditSession = { root: string; path: string; initial: { text: string; revision: string } };
export type FilePreviewUpdate = { root: string; path: string; preview: any };
type Entry = { revision?: string; line?: number; column?: number; matchLength?: number; snippet?: string; name: string; path: string; directory: boolean; symlink: boolean };
function parentDirectory(path: string) { return path.split(/[\\/]/).slice(0, -1).join('/') || '.'; }
export function WorkspaceFiles({ root, onAttach, onClose, onEdit, onPreview, previewUpdate }: { onPreview: (target: ArtifactTarget) => void; onEdit: (session: FileEditSession) => void; previewUpdate?: FilePreviewUpdate; root?: string; onAttach: (path: string) => void; onClose: () => void }) {
  const [directory, setDirectory] = useState('.');
  const [searchScope, setSearchScope] = useState<'workspace' | 'directory'>('workspace');
  const searchDirectory = searchScope === 'directory' ? directory : '.';
  const [contentSearch, setContentSearch] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const matchLine = useRef<HTMLSpanElement>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [activeResult, setActiveResult] = useState<number>();
  const resultButtons = useRef<(HTMLButtonElement | null)[]>([]);
  function focusResult(index: number) {
    resultButtons.current[index]?.focus();
    resultButtons.current[index]?.scrollIntoView({ block: 'nearest' });
    return true;
  }
  function moveResult(direction: number) {
    const count = listing?.entries.length || 0;
    if (!search || selected || !count) return false;
    const next = activeResult === undefined ? (direction > 0 ? 0 : count - 1) : (activeResult + direction + count) % count;
    return focusResult(next);
  }
  function pageResult(direction: -1 | 1) {
    const count = listing?.entries.length || 0;
    if (!search || selected || !count) return false;
    const current = activeResult === undefined ? direction > 0 ? 0 : count - 1 : activeResult;
    return focusResult(Math.max(0, Math.min(count - 1, current + direction * 5)));
  }
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
    setError(''); setPreview(undefined); setListing(undefined); setActiveResult(undefined); resultButtons.current = [];
    if (!root) return;
    const read = async () => {
      const response = await window.desktop?.workspaceFile?.({ root, path: selected?.path || (search ? searchDirectory : directory), action: selected ? 'read' : search ? contentSearch ? 'search-content' : 'search' : 'list', query: search, ...(search && contentSearch && !selected ? { searchOptions: { caseSensitive, wholeWord } } : {}) });
      if (disposed || version !== requestVersion.current) return;
      if (!response?.ok) throw Error(response?.error || '文件浏览不可用');
      if (selected) setPreview(response.result); else setListing(response.result);
    };
    void read().catch(error => { if (!disposed && version === requestVersion.current) setError(error.message); });
    return () => { disposed = true; };
  }, [root, directory, selected, refresh, search, contentSearch, caseSensitive, wholeWord, searchScope]);
  useEffect(() => { matchLine.current?.scrollIntoView({ block: 'center' }); }, [preview, selected]);
  const staleMatch = Boolean(selected?.line && selected.revision && preview && selected.revision !== preview.revision);
  return <section className="workspace-files" aria-label="工作区文件"><header><b>文件</b><button onClick={() => { setSelected(undefined); setDirectory('.'); setQuery(''); setSearch(''); }}>根目录</button><button onClick={() => setRefresh(value => value + 1)}>刷新文件</button><button onClick={onClose} aria-label="关闭文件面板">×</button></header><small>{root || '请先选择项目目录'}</small>
    <form onSubmit={event => { event.preventDefault(); setSelected(undefined); setSearch(query.trim()); setRefresh(value => value + 1); }}><select aria-label="文件搜索方式" value={contentSearch ? "content" : "name"} onChange={event => { setContentSearch(event.target.value === "content"); setSelected(undefined); setSearch(''); }}><option value="name">文件名</option><option value="content">文件内容</option></select><input aria-label="查找工作区文件" placeholder={contentSearch ? "文本关键词" : "文件名或相对路径"} value={query} onChange={event => { setQuery(event.target.value); setActiveResult(undefined); }} onKeyDown={event => { if (!event.nativeEvent.isComposing && query.trim() === search && (event.key === 'ArrowDown' || event.key === 'ArrowUp') && moveResult(event.key === 'ArrowDown' ? 1 : -1)) event.preventDefault(); }} /><button disabled={!root}>查找文件</button>{search && <button type="button" onClick={() => { setQuery(''); setSearch(''); setSelected(undefined); }}>清除文件查找</button>}</form>
    <label>搜索范围<select aria-label="文件搜索范围" value={searchScope} onChange={event => { setSearchScope(event.target.value as 'workspace' | 'directory'); setSelected(undefined); }}><option value="workspace">整个工作区</option><option value="directory">当前目录及子目录：{directory}</option></select></label>
    {contentSearch && <div className="workspace-search-options"><label><input type="checkbox" checked={caseSensitive} onChange={event => { setCaseSensitive(event.target.checked); setSelected(undefined); }} />区分大小写</label><label title="字母、数字、组合字符和下划线视为单词字符"><input type="checkbox" checked={wholeWord} onChange={event => { setWholeWord(event.target.checked); setSelected(undefined); }} />全字匹配</label></div>}
    {search && <small>搜索范围：{searchDirectory}（含子目录），跳过 .git 和符号链接；最多扫描 20000 项、返回 200 个结果。{contentSearch && " 内容搜索限完整 UTF-8 文本，每文件不超过 256 KB，总读取约 32 MB。"}</small>}
    {selected ? <><button onClick={() => setSelected(undefined)}>返回目录</button><button disabled={!root} onClick={() => { setDirectory(parentDirectory(selected.path)); setSelected(undefined); setQuery(''); setSearch(''); }}>打开所在目录</button><h3>{selected.name}</h3><button disabled={!root || !preview} onClick={() => { if (root) onPreview({ root, path: selected.path, line: staleMatch ? undefined : selected.line, column: staleMatch ? undefined : selected.column, matchLength: staleMatch ? undefined : selected.matchLength, revision: selected.revision }); }}>展开文件预览</button><button onClick={() => onAttach(`${root}/${selected.path}`)}>添加到消息</button></> : <><p>{search ? `文件查找：${search}` : directory}</p>{!search && directory !== '.' && <button onClick={() => setDirectory(parentDirectory(directory))}>上级目录</button>}{listing?.entries.map((entry, index) => <button ref={element => { resultButtons.current[index] = element; }} aria-current={search && activeResult === index ? 'true' : undefined} onFocus={() => setActiveResult(index)} onKeyDown={event => { if (!event.nativeEvent.isComposing && (event.key === 'ArrowDown' || event.key === 'ArrowUp') && moveResult(event.key === 'ArrowDown' ? 1 : -1)) event.preventDefault(); else if (search && !selected && !event.nativeEvent.isComposing && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && (event.key === 'Home' || event.key === 'End') && listing?.entries.length) { event.preventDefault(); focusResult(event.key === 'Home' ? 0 : listing.entries.length - 1); } else if (search && !selected && !event.nativeEvent.isComposing && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && (event.key === 'PageDown' || event.key === 'PageUp') && pageResult(event.key === 'PageDown' ? 1 : -1)) event.preventDefault(); }} className="workspace-file-row" key={`${entry.path}:${entry.line || 0}:${entry.column || 0}`} onClick={() => entry.directory ? setDirectory(entry.path) : setSelected(entry)}>{entry.directory ? '▸' : '▧'} {search ? entry.path : entry.name}{entry.line ? `:${entry.line}:${entry.column} · ${entry.snippet}` : ''}{entry.symlink ? ' ↗' : ''}</button>)}{listing?.truncated && <p>{search ? '搜索达到上限，请缩小关键词范围。' : '仅显示前 1000 项。'}</p>}</>}
    {!!listing?.skipped && <p>有 {listing.skipped} 个文件或目录未搜索（无法读取、过大或非 UTF-8 文本），结果可能不完整。</p>}
    {error && <p role="alert">{error}</p>}{root && !listing && !preview && !error && <p>正在读取…</p>}
    {listing && !listing.entries.length && <p>{search ? '没有匹配文件。' : '此目录为空。'}</p>}
    {selected && root && isEditablePreview(preview) && <button onClick={() => onEdit({ root, path: selected.path, initial: { text: preview.text, revision: preview.revision } })}>编辑文件</button>}
    {preview?.image && <img src={preview.image} alt={selected?.name} onError={() => setFailedImageSource(preview.image)} />}{imageFailed && <p role="alert">图片无法解码，文件可能已损坏。请修复文件后刷新文件。</p>}{preview?.encodingInvalid && <p role="status">文件包含无法按 UTF-8 解码的字符，预览使用替代字符，不能编辑。</p>}{preview?.binary && <p>二进制文件，无法显示文本预览。</p>}{staleMatch && <p role="status">文件在搜索后已变化，请返回并刷新搜索结果。</p>}{typeof preview?.text === 'string' && <pre>{selected?.line && !staleMatch ? preview.text.split('\n').map((line: string, index: number) => <span key={index} ref={index + 1 === selected.line ? matchLine : undefined} style={index + 1 === selected.line ? { background: '#ffe08a', color: '#202020' } : undefined}>{index + 1 === selected.line ? <SearchMatchText text={line} column={selected.column} length={selected.matchLength} /> : line}{'\n'}</span>) : preview.text}</pre>}{preview?.truncated && <p>仅预览前 256 KB。</p>}
  </section>;
}

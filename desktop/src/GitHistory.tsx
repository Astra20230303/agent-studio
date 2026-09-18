import { useEffect, useRef, useState } from 'react';
import { parseGitHistory, parseGitCommitDetail, type GitCommit } from './gitHistoryResponse';

export function GitHistory({ root }: { root: string }) {
  const [page, setPage] = useState<{ anchor?: string; offset: number }>({ offset: 0 });
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [refs, setRefs] = useState<string[]>([]);
  const [ref, setRef] = useState('HEAD');
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const anchor = useRef<string | undefined>(undefined);
  useEffect(() => {
    let disposed = false;
    setLoading(true); setError(''); setDetail('');
    void (async () => {
      try {
        const result = await window.desktop?.workspaceGit?.({ root, action: selected ? 'commit-detail' : 'history', commit: selected, ref, ...page });
        if (disposed) return;
        if (!result?.ok) throw Error(result?.error || '无法读取提交历史');
        if (selected) setDetail(parseGitCommitDetail(result.result));
        else { const next = parseGitHistory(result.result); setRefs(next.refs); setCommits(next.commits); setHasMore(next.hasMore); anchor.current = next.anchor; }
      } catch (error) { if (!disposed) setError(error instanceof Error ? error.message : String(error)); }
      finally { if (!disposed) setLoading(false); }
    })();
    return () => { disposed = true; };
  }, [root, selected, page, retry, ref]);
  return <section aria-label="提交历史">
    <h3>提交历史</h3>
    <label>历史分支<select aria-label="历史分支" value={ref} onChange={event => { setRef(event.target.value); setSelected(''); setPage({ offset: 0 }); }}>
      <option value="HEAD">当前 HEAD</option>
      {refs.map(name => <option key={name} value={name}>{name.startsWith('refs/heads/') ? `本地 · ${name.slice(11)}` : `远端 · ${name.slice(13)}`}</option>)}
    </select></label>
    {ref !== 'HEAD' && <button onClick={() => { setRef('HEAD'); setSelected(''); setPage({ offset: 0 }); }}>返回当前 HEAD 历史</button>}
    <p>远端分支显示上次获取的历史。</p>
    <button disabled={loading} onClick={() => { setSelected(''); setPage({ offset: 0 }); }}>刷新历史</button>
    {loading && <p role="status">正在读取提交…</p>}
    {error && <div role="alert"><p>{error}</p><button onClick={() => setRetry(value => value + 1)}>重试读取提交</button></div>}
    {selected ? <><button onClick={() => setSelected('')}>返回提交列表</button><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{detail}</pre></> : !loading && !error && <>
      {commits.length === 0 && <p>暂无提交。</p>}
      {commits.map(commit => <div key={commit.id}><button onClick={() => setSelected(commit.id)}>{commit.id.slice(0, 8)} · {commit.subject}</button><p>{commit.author} · {commit.date}</p></div>)}
      <button disabled={page.offset === 0} onClick={() => setPage({ anchor: anchor.current, offset: page.offset - 30 })}>较新提交</button>
      <button disabled={!hasMore} onClick={() => setPage({ anchor: anchor.current, offset: page.offset + 30 })}>更早提交</button>
    </>}
  </section>;
}

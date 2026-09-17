import { useEffect, useRef, useState } from 'react';

type Commit = { id: string; author: string; date: string; subject: string };
export function GitHistory({ root }: { root: string }) {
  const [page, setPage] = useState<{ anchor?: string; offset: number }>({ offset: 0 });
  const [commits, setCommits] = useState<Commit[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const anchor = useRef<string | undefined>(undefined);
  useEffect(() => {
    let disposed = false;
    setLoading(true); setError(''); setDetail('');
    void (async () => {
      try {
        const result = await window.desktop?.workspaceGit?.({ root, action: selected ? 'commit-detail' : 'history', commit: selected, ...page });
        if (disposed) return;
        if (!result?.ok) throw Error(result?.error || '无法读取提交历史');
        if (selected) setDetail(result.result.detail);
        else { setCommits(result.result.commits); setHasMore(result.result.hasMore); anchor.current = result.result.anchor; }
      } catch (error) { if (!disposed) setError(error instanceof Error ? error.message : String(error)); }
      finally { if (!disposed) setLoading(false); }
    })();
    return () => { disposed = true; };
  }, [root, selected, page]);
  return <section aria-label="提交历史">
    <h3>提交历史</h3>
    <button disabled={loading} onClick={() => { setSelected(''); setPage({ offset: 0 }); }}>刷新历史</button>
    {loading && <p role="status">正在读取提交…</p>}
    {error && <p role="alert">{error}</p>}
    {selected ? <><button onClick={() => setSelected('')}>返回提交列表</button><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{detail}</pre></> : !loading && !error && <>
      {commits.length === 0 && <p>暂无提交。</p>}
      {commits.map(commit => <div key={commit.id}><button onClick={() => setSelected(commit.id)}>{commit.id.slice(0, 8)} · {commit.subject}</button><p>{commit.author} · {commit.date}</p></div>)}
      <button disabled={page.offset === 0} onClick={() => setPage({ anchor: anchor.current, offset: page.offset - 30 })}>较新提交</button>
      <button disabled={!hasMore} onClick={() => setPage({ anchor: anchor.current, offset: page.offset + 30 })}>更早提交</button>
    </>}
  </section>;
}

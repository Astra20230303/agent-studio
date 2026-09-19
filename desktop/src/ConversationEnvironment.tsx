import { useEffect, useState, type ReactNode } from 'react';
import { parseGitSnapshot, type GitSnapshot } from './gitSnapshot';

export function ConversationEnvironment({ cwd, environment, onFiles, onGit, children }: { cwd?: string; environment?: 'local' | 'worktree'; onFiles: () => void; onGit: () => void; children?: ReactNode }) {
  const [snapshot, setSnapshot] = useState<GitSnapshot>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let alive = true;
    setSnapshot(undefined); setError('');
    if (!cwd) return;
    setLoading(true);
    void (async () => {
      try {
        const result = await window.desktop?.workspaceGit?.({ root: cwd, action: 'status' });
        if (!result?.ok) throw Error(result?.error || '无法读取 Git 状态');
        const value = parseGitSnapshot(result.result);
        if (alive) setSnapshot(value);
      } catch (error) { if (alive) setError(error instanceof Error ? error.message : String(error)); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [cwd, revision]);
  return <section className="conversation-environment" aria-label="当前会话环境">
    <p>{environment === 'worktree' ? '工作树' : '本地'} · {cwd || '尚未绑定工作目录'}</p>
    <div className="environment-actions"><button disabled={!cwd} onClick={onFiles}>打开工作区文件</button><button disabled={!cwd} onClick={onGit}>打开 Git 变更</button></div>
    <button disabled={!cwd || loading} onClick={() => setRevision(value => value + 1)}>{loading ? '正在读取环境…' : '刷新环境'}</button>
    {error && <p role="alert">{error}</p>}
    {snapshot && <><p>分支：{snapshot.detached ? '分离 HEAD' : snapshot.branch || '尚无提交'}</p><p>变更：{snapshot.files.length} 个文件</p>{snapshot.upstream && <p>上游：{snapshot.upstream} · 领先 {snapshot.ahead ?? 0} / 落后 {snapshot.behind ?? 0}</p>}</>}
    {children}
  </section>;
}

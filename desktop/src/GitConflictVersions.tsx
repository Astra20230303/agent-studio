import { useEffect, useState } from 'react';
import { parseConflictStages, type ConflictStage } from './gitConflictResponse';
type Stage = ConflictStage;
export function GitConflictVersions({ root, path }: { root: string; path: string }) {
  const [stages, setStages] = useState<Stage[]>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; setStages(undefined); setError('');
    void (async () => {
      try {
        const response = await window.desktop?.workspaceGit?.({ root, path, action: 'conflict' });
        if (!response?.ok) throw Error(response?.error || '无法读取冲突版本');
        if (active) setStages(parseConflictStages(response.result));
      } catch (error) { if (active) setError(String(error)); }
    })();
    return () => { active = false; };
  }, [root, path, revision]);
  return <section aria-label="冲突版本"><h3>冲突版本</h3><p>变基时，第 2 阶段通常是目标分支，第 3 阶段是正在重放的提交。</p>{error ? <p role="alert">{error}<button onClick={() => setRevision(value => value + 1)}>重试读取版本</button></p> : !stages ? <p role="status">正在读取冲突版本…</p> : ['共同基线（第 1 阶段）', '当前侧（第 2 阶段）', '传入侧（第 3 阶段）'].map((label, index) => {
    const stage = stages.find(value => value.stage === index + 1);
    return <details key={label} open><summary>{label}</summary>{!stage ? <p>此阶段没有文件（新增或删除）。</p> : stage.unavailable ? <p>{stage.unavailable}</p> : <pre>{stage.text || '（空文件）'}</pre>}</details>;
  })}</section>;
}

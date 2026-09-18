import { CopyText } from './CopyText';

export function TurnDiffPanel({ value }: { value?: { turnId: string; diff: string } }) {
  if (!value) return null;
  return <details className="plan-panel turn-diff-panel">
    <summary>本回合统一差异</summary>
    <div className="tool-copy-actions"><CopyText source={value.diff} label="复制本回合差异" /></div>
    <pre className="tool-output" style={{ maxHeight: 420, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{value.diff || '本回合没有文件差异。'}</pre>
  </details>;
}

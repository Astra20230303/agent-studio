import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ArtifactLink } from './Artifacts';
import type { ToolActivity } from './domain';
import { messageLinkKind } from './messageLink';

export function ImageViewActivity({ tool }: { tool: ToolActivity }) {
  const [revision, setRevision] = useState(0);
  const path = tool.rawRecord?.item.path;
  const valid = typeof path === 'string' && messageLinkKind(path) === 'file';
  const labels: Record<string, string> = { inProgress: '正在查看图片', completed: '已查看图片', failed: '图片查看失败', interrupted: '图片查看已中断' };
  return <section className="tool-row" aria-label="图片查看结果">
    <div className="tool-copy-actions"><strong>{labels[tool.status] || '图片查看'}</strong>
      <button title="重新读取图片" aria-label="重新读取图片" disabled={!valid} onClick={() => setRevision(value => value + 1)}><RefreshCw size={14} /></button>
    </div>
    {valid ? <><p style={{ overflowWrap: 'anywhere' }}>{path}</p><ArtifactLink key={`${path}:${revision}`} path={path} label={path.split(/[\\/]/).at(-1) || path} preview /></> : <p role="alert">未提供有效的本地图片路径。</p>}
  </section>;
}

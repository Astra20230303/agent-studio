import { useState } from 'react';
import { ArtifactLink } from './Artifacts';
import { messageLinkKind } from './messageLink';
import type { ToolActivity } from './domain';

export function ImageGenerationActivity({ tool }: { tool: ToolActivity }) {
  const item = tool.rawRecord?.item || {};
  const [broken, setBroken] = useState<string>();
  const result = typeof item.result === 'string' ? item.result.trim() : '';
  const mime = result.startsWith('iVBORw0KGgo') ? 'image/png' : result.startsWith('/9j/') ? 'image/jpeg' : result.startsWith('UklGR') ? 'image/webp' : undefined;
  const src = mime && result.length <= 14 * 1024 * 1024 && /^[A-Za-z0-9+/]+={0,2}$/.test(result) ? `data:${mime};base64,${result}` : undefined;
  const path = typeof item.savedPath === 'string' && messageLinkKind(item.savedPath) === 'file' ? item.savedPath : undefined;
  const failed = !!item.failure || tool.status === 'failed';
  const completed = !failed && tool.status === 'completed';
  const label = failed ? '图片生成失败' : completed ? '图片已生成' : ['inProgress', 'in_progress', 'generating'].includes(tool.status) ? '正在生成图片…' : tool.status === 'interrupted' ? '图片生成已中断' : `图片生成 · ${tool.status}`;
  return <section className="tool-row" aria-label="图片生成结果">
    <strong>{label}</strong>
    {typeof item.revisedPrompt === 'string' && item.revisedPrompt && <details><summary>生成提示词</summary><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.revisedPrompt}</p></details>}
    {failed && <p role="alert">{(item.failure as any)?.type === 'usageLimitExceeded' ? '图片生成额度已用完，请稍后重试。' : '图片生成未成功。'}</p>}
    {completed && (src ? <><img className="artifact-image" src={src} alt="生成的图片" onError={() => setBroken(src)} />{broken === src && <p role="alert">图片无法解码，结果可能已损坏。</p>}<a href={src} download={`generated.${mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'}`}>下载生成图片</a></> : path ? <ArtifactLink path={path} label="生成的图片" preview /> : <p role="status">未提供可预览的图片结果。</p>)}
    {path && <p style={{ overflowWrap: 'anywhere' }}>{path}</p>}
  </section>;
}

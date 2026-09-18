import { useEffect, useRef, useState } from 'react';
import { resultBlocks, toolMedia } from './toolMedia';
function Media({ block }: { block: unknown }) {
  const media = toolMedia(block);
  const [failed, setFailed] = useState<string>();
  if (!media || failed === media.src) return <p>媒体无法预览，请查看结构化结果。</p>;
  return media.kind === 'image' ? <img src={media.src} alt="工具返回的图片" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(media.src)} style={{ maxWidth: '100%', maxHeight: 480, objectFit: 'contain' }} /> : <audio src={media.src} controls preload="none" onError={() => setFailed(media.src)} style={{ maxWidth: '100%' }} />;
}
export function ToolResult({ result }: { result: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const [copyState, setCopyState] = useState('');
  const [copyError, setCopyError] = useState('');
  const [busy, setBusy] = useState(false);
  const copying = useRef(false);
  const revision = useRef(0);
  useEffect(() => { revision.current++; setCopyState(''); setCopyError(''); return () => { revision.current++; }; }, [result]);
  const resultText = () => typeof result === 'string' ? result : JSON.stringify(result, null, 2) ?? '';
  const copy = async () => {
    if (copying.current) return;
    copying.current = true; setBusy(true); setCopyState(''); setCopyError('');
    const current = revision.current;
    try { await navigator.clipboard.writeText(resultText()); if (current === revision.current) setCopyState('已复制工具结果'); }
    catch (error) { if (current === revision.current) setCopyError(`复制失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { copying.current = false; setBusy(false); }
  };
  const blocks = resultBlocks(result);
  return <>
    {blocks.map((block, index) => <div key={index}>{['text', 'inputText'].includes(block?.type) && typeof block.text === 'string' ? <pre className="tool-output">{block.text}</pre> : ['image', 'inputImage', 'audio', 'inputAudio'].includes(block?.type) ? <Media block={block} /> : null}</div>)}
    <button disabled={busy} onClick={() => void copy()}>{busy ? '正在复制…' : '复制工具结果'}</button>
    {copyState && <p role="status">{copyState}</p>}{copyError && <p role="alert">{copyError}</p>}
    <details onToggle={event => setExpanded(event.currentTarget.open)}><summary>结构化结果</summary>{expanded && <pre className="tool-output">{resultText()}</pre>}</details>
  </>;
}

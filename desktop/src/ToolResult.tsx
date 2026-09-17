import { useState } from 'react';
import { resultBlocks, toolMedia } from './toolMedia';
function Media({ block }: { block: unknown }) {
  const media = toolMedia(block);
  const [failed, setFailed] = useState(false);
  if (!media || failed) return <p>媒体无法预览，请查看结构化结果。</p>;
  return media.kind === 'image' ? <img src={media.src} alt="工具返回的图片" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} style={{ maxWidth: '100%', maxHeight: 480, objectFit: 'contain' }} /> : <audio src={media.src} controls preload="none" onError={() => setFailed(true)} style={{ maxWidth: '100%' }} />;
}
export function ToolResult({ result }: { result: unknown }) {
  const blocks = resultBlocks(result);
  return <>
    {blocks.map((block, index) => <div key={index}>{['text', 'inputText'].includes(block?.type) && typeof block.text === 'string' ? <pre className="tool-output">{block.text}</pre> : ['image', 'inputImage', 'audio', 'inputAudio'].includes(block?.type) ? <Media block={block} /> : null}</div>)}
    <details><summary>结构化结果</summary><pre className="tool-output">{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre></details>
  </>;
}

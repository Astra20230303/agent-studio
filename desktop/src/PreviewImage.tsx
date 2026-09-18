import { useLayoutEffect, useRef, useState } from 'react';
import './previewImage.css';

export function PreviewImage({ source, name }: { source: string; name: string }) {
  // Remount for a new payload so size, decoding errors and zoom never leak across files.
  return <ImageCanvas key={source} source={source} name={name} />;
}

function ImageCanvas({ source, name }: { source: string; name: string }) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>();
  const [scale, setScale] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  const [fitScale, setFitScale] = useState(1);
  useLayoutEffect(() => {
    if (scale !== null || !dimensions || !image.current) return;
    const element = image.current;
    const measure = () => setFitScale(element.getBoundingClientRect().width / dimensions.width);
    measure();
    const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, [dimensions, scale]);
  const displayedScale = scale ?? fitScale;
  const ready = !!dimensions && !failed;
  return <section className="preview-image" aria-label="图片预览">
    <div className="preview-image-controls">
      <button disabled={!ready} aria-pressed={scale === null} onClick={() => setScale(null)}>适应窗口</button>
      <button disabled={!ready} aria-pressed={scale === 1} onClick={() => setScale(1)}>原始尺寸</button>
      <button aria-label="缩小图片" disabled={!ready || displayedScale <= 0.1} onClick={() => setScale(Math.max(0.1, displayedScale / 1.25))}>−</button>
      <button aria-label="放大图片" disabled={!ready || displayedScale >= 8} onClick={() => setScale(Math.min(8, displayedScale * 1.25))}>+</button>
      {ready && <span role="status">{dimensions.width} × {dimensions.height} · {scale === null ? '适应窗口' : `${Math.round(scale * 100)}%`}</span>}
    </div>
    {failed && <p role="alert">图片无法解码，文件可能已损坏。请修复文件后刷新预览。</p>}
    <div className="preview-image-viewport" tabIndex={0} aria-label="图片滚动区域">
      <img ref={image} className={scale === null ? 'fit' : 'scaled'} src={source} alt={name} onLoad={event => { setFailed(false); setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }); }} onError={() => setFailed(true)} style={scale !== null && dimensions ? { width: dimensions.width * scale, height: dimensions.height * scale } : undefined} />
    </div>
  </section>;
}

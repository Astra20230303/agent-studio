import { useEffect, useRef, useState, type ComponentProps } from 'react';
import type { ArtifactPreview } from './ArtifactPreview';

export function LazyArtifactPreview(props: ComponentProps<typeof ArtifactPreview>) {
  const [Preview, setPreview] = useState<typeof ArtifactPreview>();
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setError(false);
    void import('./ArtifactPreview').then(module => {
      if (active) setPreview(() => module.ArtifactPreview);
    }, () => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  return Preview ? <Preview {...props} /> : <LoadingPreview failed={error} onClose={props.onClose} />;
}

function LoadingPreview({ failed, onClose }: { failed: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const opened = dialog.current;
    opened?.showModal();
    return () => { opened?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} className="file-editor" aria-label="文件预览加载" onCancel={event => { event.preventDefault(); onClose(); }}>
    <p role={failed ? 'alert' : 'status'}>{failed ? '无法加载文件预览，请重新打开应用后再试。' : '正在加载文件预览…'}</p>
    <button onClick={onClose}>关闭预览</button>
  </dialog>;
}

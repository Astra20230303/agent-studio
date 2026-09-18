import type { ClipboardEvent } from 'react';

export function pasteImage(event: ClipboardEvent, onFiles: (paths: string[]) => void, onError: (message: string) => void) {
  const images = Array.from(event.clipboardData.files).filter(file => file.type.startsWith('image/'));
  if (!images.length) return;
  event.preventDefault();
  const save = window.desktop?.savePastedImage;
  return (async () => {
    try {
      if (!save) throw Error('粘贴图片需要桌面应用');
      for (const file of images) {
        if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw Error('剪贴板图片仅支持 PNG、JPEG、WebP、GIF。');
        if (file.size > 16 * 1024 * 1024) throw Error('图片超过 16 MB，请缩小图片');
        const result = await save(new Uint8Array(await file.arrayBuffer()));
        if (!result.ok || !result.path) throw Error(result.error || '图片保存失败');
        onFiles([result.path]);
      }
    } catch (error) { onError(error instanceof Error ? error.message : String(error)); }
  })();
}

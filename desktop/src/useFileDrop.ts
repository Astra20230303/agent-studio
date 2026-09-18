import { useState, type DragEvent } from 'react';

export function useFileDrop(onFiles: (paths: string[]) => void, onError: (message: string) => void) {
  const [dragging, setDragging] = useState(false);
  const isFile = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files');
  return {
    'data-file-drag': dragging || undefined,
    onDragOver: (event: DragEvent) => {
      if (!isFile(event)) return;
      event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDragging(true);
    },
    onDragLeave: (event: DragEvent) => {
      if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
      setDragging(false);
    },
    onDrop: (event: DragEvent) => {
      if (!isFile(event)) return;
      event.preventDefault(); event.stopPropagation(); setDragging(false);
      try {
        const files = Array.from(event.dataTransfer.files);
        const paths = window.desktop?.droppedFilePaths?.(files);
        if (!files.length || !paths || paths.length !== files.length || paths.some(path => !path)) throw Error('无法读取拖入文件的本地路径，请使用添加附件。');
        onFiles([...new Set(paths)]);
      } catch (error) { onError(error instanceof Error ? error.message : String(error)); }
    },
  };
}

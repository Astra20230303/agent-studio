import { useCallback, useState } from 'react';
import { X } from 'lucide-react';

export function useServerWarnings() {
  const [warnings, setWarnings] = useState<{ id: string; message: string }[]>([]);
  const push = useCallback((message: string) => {
    const warning = { id: crypto.randomUUID(), message };
    setWarnings(current => [...current, warning]);
  }, []);
  const dismiss = useCallback((id: string) => {
    setWarnings(current => current.filter(warning => warning.id !== id));
  }, []);
  return { warnings, push, dismiss };
}

export function ServerWarnings({ warnings, dismiss }: Pick<ReturnType<typeof useServerWarnings>, 'warnings' | 'dismiss'>) {
  const current = warnings[0];
  if (!current) return null;
  return <div className="state-save-warning">
    <span key={current.id} role="alert">{current.message}{warnings.length > 1 && <small>（另有 {warnings.length - 1} 条待处理警告）</small>}</span>
    <button aria-label="关闭服务警告" title="关闭当前警告并显示下一条" onClick={() => dismiss(current.id)}><X size={16} /></button>
  </div>;
}

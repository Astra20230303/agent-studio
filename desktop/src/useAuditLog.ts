import { useCallback, useRef, useState } from 'react';
import { persistentStorage } from './persistentStorage';

export type AuditEntry = { id: string; at: string; action: string; detail?: string };
const KEY = 'felix-audit-log-v1';
const MAX = 200;
function readEntries(): { entries: AuditEntry[]; error: string } {
  try {
    const value = JSON.parse(persistentStorage.getItem(KEY) || '[]');
    if (!Array.isArray(value) || !value.every(item => typeof item?.id === 'string' && typeof item?.at === 'string' && typeof item?.action === 'string' && (item.detail === undefined || typeof item.detail === 'string'))) throw Error('操作记录格式无效');
    return { entries: value.slice(0, MAX), error: '' };
  } catch { return { entries: [], error: '操作记录读取失败，已暂停写入以保留原始数据。' }; }
}
export function useAuditLog() {
  const [loaded] = useState(readEntries);
  const [entries, setEntries] = useState(loaded.entries);
  const [error, setError] = useState(loaded.error);
  const current = useRef(entries);
  const write = useRef(Promise.resolve());
  const revision = useRef(0);
  const persist = useCallback((next: AuditEntry[]) => {
    const version = ++revision.current;
    const payload = JSON.stringify(next);
    write.current = write.current.then(async () => {
      try { await persistentStorage.setItem(KEY, payload); if (version === revision.current) setError(''); }
      catch { if (version === revision.current) setError('操作记录未能保存，请重试。'); }
    });
  }, []);
  const record = useCallback((action: string, detail?: string) => {
    if (loaded.error) return;
    const next = [{ id: crypto.randomUUID(), at: new Date().toISOString(), action, ...(detail ? { detail: detail.slice(0, 300) } : {}) }, ...current.current].slice(0, MAX);
    current.current = next; setEntries(next); persist(next);
  }, [persist, loaded.error]);
  const clear = useCallback(() => { if (loaded.error) return; current.current = []; setEntries([]); persist([]); }, [persist, loaded.error]);
  return { entries, error, record, clear, retry: () => { if (!loaded.error) persist(current.current); }, readFailed: !!loaded.error };
}

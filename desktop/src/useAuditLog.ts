import { useCallback, useEffect, useRef, useState } from 'react';
import { persistentStorage } from './persistentStorage';

export type AuditEntry = { id: string; at: string; action: string; detail?: string };
const KEY = 'felix-audit-log-v1';
const MAX = 200;
function readEntries(): { entries: AuditEntry[]; error: string; needsRedaction?: boolean } {
  try {
    const value = JSON.parse(persistentStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(value) || !value.every(item => typeof item?.id === 'string' && typeof item?.at === 'string' && typeof item?.action === 'string' && (item.detail === undefined || typeof item.detail === 'string'))) throw Error('操作记录格式无效');
    const needsRedaction = value.some(item => item.action === '切换项目' && item.detail !== undefined);
    const entries = value.slice(0, MAX).map((item: AuditEntry) => {
      if (item.action !== '切换项目') return item;
      const { detail: _detail, ...redacted } = item;
      return redacted;
    });
    return { entries, error: '', needsRedaction };
  } catch { return { entries: [], error: '操作记录读取失败，已暂停写入以保留原始数据。' }; }
}
export function useAuditLog() {
  const [loaded] = useState(readEntries);
  const [entries, setEntries] = useState(loaded.entries);
  const [error, setError] = useState(loaded.error);
  const [readFailed, setReadFailed] = useState(!!loaded.error);
  const unread = useRef(!!loaded.error);
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
  useEffect(() => {
    if (loaded.needsRedaction) persist(current.current);
  }, [loaded, persist]);
  const record = useCallback((action: string, detail?: string) => {
    if (unread.current) return;
    // Native project IDs are absolute paths, not opaque identifiers.
    if (action === '切换项目') detail = undefined;
    const next = [{ id: crypto.randomUUID(), at: new Date().toISOString(), action, ...(detail ? { detail: detail.slice(0, 300) } : {}) }, ...current.current].slice(0, MAX);
    current.current = next; setEntries(next); persist(next);
  }, [persist]);
  const clear = useCallback(() => { if (unread.current) return; current.current = []; setEntries([]); persist([]); }, [persist]);
  const retry = () => {
    if (!unread.current) { persist(current.current); return; }
    const restored = readEntries();
    setError(restored.error);
    if (restored.error) return;
    current.current = restored.entries; setEntries(restored.entries);
    unread.current = false; setReadFailed(false);
    if (restored.needsRedaction) persist(restored.entries);
  };
  return { entries, error, record, clear, retry, readFailed };
}

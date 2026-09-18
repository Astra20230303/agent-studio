import { useRef, useState } from 'react';
import type { AuditEntry } from './useAuditLog';
import { auditExport } from './auditExport';

export function AuditExportButton({ entries, query, disabled }: { entries: AuditEntry[]; query: string; disabled: boolean }) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const save = async () => {
    if (disabled || lock.current || !entries.length) return;
    lock.current = true; setBusy(true); setNotice(''); setError('');
    try {
      const snapshot = auditExport(entries, query);
      if (!window.desktop?.saveConversation) throw Error('操作记录导出需要桌面应用');
      const result = await window.desktop.saveConversation({ filename: `felix-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.md`, content: snapshot.content });
      if (result?.ok !== true) throw Error(result?.error || '导出失败，请重试');
      if (!result.canceled) setNotice(`已导出 ${snapshot.count} 条操作记录`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div><button disabled={disabled || busy || !entries.length} onClick={() => void save()}>{busy ? '正在导出操作记录…' : `导出筛选记录（${entries.length}）`}</button>{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}</div>;
}

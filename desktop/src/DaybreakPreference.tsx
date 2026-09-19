import { useEffect, useRef, useState } from 'react';
import { updateThreadDaybreak } from './codexClient';

type Props = { threadId?: string; value?: boolean; connected: boolean; busy: boolean; onSaved: (value: boolean) => void };
export function DaybreakPreference(props: Props) {
  return <Preference key={`${props.threadId}:${props.connected}`} {...props} />;
}
function Preference({ threadId, value, connected, busy, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(false), lock = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const save = async (enabled: boolean) => {
    if (!threadId || !connected || busy || lock.current) return;
    lock.current = true; setSaving(true); setError('');
    try { const confirmed = await updateThreadDaybreak(threadId, enabled); if (alive.current) onSaved(confirmed); }
    catch (error) { if (alive.current) setError(error instanceof Error ? error.message : String(error)); }
    finally { if (alive.current) { lock.current = false; setSaving(false); } }
  };
  return <div><label title="保存会话偏好；不会授予模型访问权限或改变当前回合的访问计划。">Daybreak 偏好 <select aria-label="Daybreak 偏好" value={value == null ? '' : value ? 'enabled' : 'disabled'} disabled={!threadId || !connected || busy || saving} onChange={event => { if (event.target.value) void save(event.target.value === 'enabled'); }}><option value="" disabled>未设置</option><option value="enabled">启用偏好</option><option value="disabled">停用偏好</option></select></label>{saving && <span role="status">正在保存…</span>}{error && <span role="alert">保存 Daybreak 偏好失败：{error}</span>}</div>;
}

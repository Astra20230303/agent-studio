import { useEffect, useRef, useState } from 'react';
type Settings = { completed: boolean; failed: boolean; input: boolean; backgroundOnly: boolean };
export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [failedSave, setFailedSave] = useState<Settings>();
  const lock = useRef(false);
  const request = async (input?: Settings) => {
    const bridge = window.desktop as typeof window.desktop & { conversationNotifications?: (input?: Settings) => Promise<any> };
    if (!bridge?.conversationNotifications) throw Error('请在桌面应用中设置系统通知');
    const result = await bridge.conversationNotifications(input);
    if (!result?.ok) throw Error(result?.error || '通知设置请求失败');
    if (!result.settings || !['completed', 'failed', 'input', 'backgroundOnly'].every(key => typeof result.settings[key] === 'boolean')) throw Error('通知设置格式无效');
    return result;
  };
  useEffect(() => { let disposed = false; setError(''); setBusy(true); void request().then(result => { if (!disposed) { setSettings(result.settings); setSupported(result.supported); } }).catch(error => { if (!disposed) setError(error.message); }).finally(() => { if (!disposed) setBusy(false); }); return () => { disposed = true; }; }, [attempt]);
  const save = async (next: Settings) => {
    if (lock.current || busy) return;
    lock.current = true; setBusy(true); setError(''); setFailedSave(undefined);
    try { const result = await request(next); setSettings(result.settings); setSupported(result.supported); }
    catch (error) { setFailedSave(next); setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <><h2>会话系统通知</h2>{error && <p role="alert">{error}{!settings ? <button disabled={busy} onClick={() => setAttempt(value => value + 1)}>重试加载通知设置</button> : failedSave && <button disabled={busy} onClick={() => void save(failedSave)}>重试保存通知设置</button>}</p>}{!supported && <p role="status">当前系统不支持桌面通知。</p>}{!settings && !error && <p role="status">正在加载…</p>}{settings && <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>{([['completed', '会话完成'], ['failed', '执行失败'], ['input', '需要输入或审批'], ['backgroundOnly', '仅在应用位于后台时通知']] as const).map(([key, label]) => <label className="settings-line" key={key}><span>{label}</span><input type="checkbox" checked={settings[key]} onChange={event => void save({ ...settings, [key]: event.target.checked })} /></label>)}</fieldset>}<p>通知是否显示仍受系统通知权限控制。计划任务使用各自的通知设置。</p></>;
}

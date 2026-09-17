import { useEffect, useState } from 'react';
type Settings = { completed: boolean; failed: boolean; input: boolean; backgroundOnly: boolean };
export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);
  const request = async (input?: Settings) => {
    const bridge = window.desktop as typeof window.desktop & { conversationNotifications?: (input?: Settings) => Promise<any> };
    if (!bridge?.conversationNotifications) throw Error('请在桌面应用中设置系统通知');
    const result = await bridge.conversationNotifications(input);
    if (!result.ok) throw Error(result.error || '通知设置保存失败');
    return result;
  };
  useEffect(() => { let disposed = false; void request().then(result => { if (!disposed) { setSettings(result.settings); setSupported(result.supported); } }).catch(error => { if (!disposed) setError(error.message); }); return () => { disposed = true; }; }, []);
  const change = async (key: keyof Settings, checked: boolean) => {
    if (!settings || busy) return;
    setBusy(true); setError('');
    try { const result = await request({ ...settings, [key]: checked }); setSettings(result.settings); }
    catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  return <><h2>会话系统通知</h2>{error && <p role="alert">{error}</p>}{!supported && <p role="status">当前系统不支持桌面通知。</p>}{!settings && !error && <p role="status">正在加载…</p>}{settings && <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>{([['completed', '会话完成'], ['failed', '执行失败'], ['input', '需要输入或审批'], ['backgroundOnly', '仅在应用位于后台时通知']] as const).map(([key, label]) => <label className="settings-line" key={key}><span>{label}</span><input type="checkbox" checked={settings[key]} onChange={event => void change(key, event.target.checked)} /></label>)}</fieldset>}<p>通知是否显示仍受系统通知权限控制。计划任务使用各自的通知设置。</p></>;
}

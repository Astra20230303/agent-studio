import { useEffect, useState } from 'react';
import { cancelAccountLogin, logoutAccount, startAccountLogin } from './codexClient';
import { readAccountLoginCompleted } from './accountAuth';

export function AccountAuthPanel({ connected, busy, onChanged }: { connected: boolean; busy?: boolean; onChanged: () => void }) {
  const [mode, setMode] = useState<'chatgpt' | 'chatgptDeviceCode' | 'apiKey'>('chatgpt');
  const [apiKey, setApiKey] = useState('');
  const [login, setLogin] = useState<{ id: string; url?: string; code?: string }>();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => window.codex?.onNotification?.((event: any) => {
    if (event?.method !== 'account/login/completed') return;
    const result = readAccountLoginCompleted(event.params);
    if (!result || !login || result.loginId && result.loginId !== login.id) return;
    setLogin(undefined); setWorking(false); setMessage(result.success ? '登录已完成' : `登录失败：${result.error || '服务端拒绝'}`); if (result.success) onChanged();
  }), [login, onChanged]);
  const start = async () => {
    setWorking(true); setMessage('');
    try {
      const result = await startAccountLogin(mode, apiKey);
      if (result.kind === 'apiKey') { setWorking(false); setMessage('API Key 已设置'); onChanged(); return; }
      setLogin({ id: result.loginId, url: result.kind === 'chatgpt' ? result.authUrl : result.verificationUrl, code: result.kind === 'chatgptDeviceCode' ? result.userCode : undefined });
      if (result.kind === 'chatgpt') await window.desktop?.openExternal?.(result.authUrl);
    } catch (error) { setWorking(false); setMessage(`登录失败：${error instanceof Error ? error.message : String(error)}`); }
  };
  const cancel = async () => { if (!login) return; setWorking(true); try { await cancelAccountLogin(login.id); setLogin(undefined); setMessage('登录已取消'); } catch (error) { setMessage(`取消登录失败：${error instanceof Error ? error.message : String(error)}`); } finally { setWorking(false); } };
  const logout = async () => { setWorking(true); setMessage(''); try { await logoutAccount(); setMessage('已退出登录'); onChanged(); } catch (error) { setMessage(`退出登录失败：${error instanceof Error ? error.message : String(error)}`); } finally { setWorking(false); } };
  return <section className="settings-card" aria-label="账户认证"><h2>账户认证</h2><p>登录状态可在上方账户信息中刷新查看。</p><fieldset disabled={!connected || working || busy} style={{ border: 0, padding: 0 }}><label>登录方式 <select aria-label="账户登录方式" value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="chatgpt">ChatGPT 浏览器登录</option><option value="chatgptDeviceCode">ChatGPT 设备码登录</option><option value="apiKey">API Key</option></select></label>{mode === 'apiKey' && <input aria-label="账户 API Key" type="password" autoComplete="off" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder="粘贴 API Key" />}{login ? <div><p role="status">{login.code ? `请打开设备验证页面并输入验证码：${login.code}` : '请在浏览器完成登录'}</p>{login.url && <button type="button" onClick={() => void window.desktop?.openExternal?.(login.url!)}>打开登录页面</button>}<button type="button" onClick={() => void cancel()}>取消登录</button></div> : <button type="button" onClick={() => void start()}>{mode === 'apiKey' ? '保存 API Key' : '开始登录'}</button>}<button type="button" onClick={() => void logout()}>退出当前账户</button></fieldset>{message && <p role="status">{message}</p>}</section>;
}

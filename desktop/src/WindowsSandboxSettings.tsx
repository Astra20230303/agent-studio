import { useEffect, useState, useSyncExternalStore } from 'react';
import { checkWindowsSandbox, sandboxSnapshot, setupWindowsSandbox, subscribeSandbox } from './windowsSandbox';
export function WindowsSandboxSettings({ cwd }: { cwd?: string }) {
  const state = useSyncExternalStore(subscribeSandbox, sandboxSnapshot);
  const [mode, setMode] = useState<'elevated' | 'unelevated'>(() => sandboxSnapshot().mode || 'elevated');
  const supported = window.desktop?.platform === 'win32';
  useEffect(() => { if (supported) void checkWindowsSandbox(); }, [supported]);
  if (!supported) return null;
  return <section className="settings-card" aria-label="Windows 沙箱"><h2>Windows 沙箱</h2>
    <p role="status">状态：{({ ready: '已就绪', notConfigured: '尚未配置', updateRequired: '需要更新', unknown: '待确认' } as Record<string, string>)[state.status]}</p>
    <p>用于 Windows 上的受限命令执行。安装可能弹出系统管理员授权窗口。</p>
    <label>安装模式<select aria-label="沙箱安装模式" disabled={state.busy} value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="elevated">管理员模式</option><option value="unelevated">非管理员模式</option></select></label>
    <button disabled={state.busy} onClick={() => void setupWindowsSandbox(mode, cwd)}>设置 Windows 沙箱</button>
    <button disabled={state.busy} onClick={() => void checkWindowsSandbox()}>刷新沙箱状态</button>
    {state.notice && <p role="status">{state.notice}</p>}{state.error && <p role="alert">{state.error}</p>}
  </section>;
}

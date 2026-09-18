import { useEffect, useState, type ReactNode } from 'react';
import { initializeStorage } from './persistentStorage';
import { loadState } from './store';

export function StorageGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [recovered, setRecovered] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    setError('');
    void initializeStorage().then(keys => {
      if (disposed) return;
      // Validate before mounting App, whose effects start saving immediately.
      loadState();
      setRecovered(keys.length > 0); setReady(true);
    }).catch(error => { if (!disposed) setError(error.message); });
    return () => { disposed = true; };
  }, [attempt]);
  if (!ready) return <div role={error ? 'alert' : 'status'} className="state-save-warning">{error ? `本机数据加载失败：${error}` : '正在读取本机数据…'}{error && <button onClick={() => setAttempt(value => value + 1)}>重试读取</button>}</div>;
  return <>{recovered && <div role="alert" className="state-save-warning">本机数据已从上一份有效备份恢复，最近一次更改可能缺失。<button onClick={() => setRecovered(false)}>关闭</button></div>}{children}</>;
}

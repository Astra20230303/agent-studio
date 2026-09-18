import { useState, type FormEvent } from 'react';
import { uploadFeedback } from './codexClient';

export function FeedbackPanel({ connected, busy, threadId }: { connected: boolean; busy?: boolean; threadId?: string }) {
  const [classification, setClassification] = useState('bug');
  const [reason, setReason] = useState('');
  const [includeLogs, setIncludeLogs] = useState(true);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!connected || busy || sending) return;
    setSending(true); setStatus('');
    try { const result = await uploadFeedback({ classification, reason, threadId, includeLogs }); setReason(''); setStatus(`反馈已提交（${result.threadId}）`); }
    catch (error) { setStatus(`反馈提交失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { setSending(false); }
  };
  return <form className="settings-card" aria-label="提交反馈" onSubmit={submit}><h2>提交反馈</h2><label>类型 <select value={classification} onChange={event => setClassification(event.target.value)} disabled={!connected || busy || sending}><option value="bug">问题反馈</option><option value="feature">功能建议</option><option value="other">其他</option></select></label><label>说明 <textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={10000} placeholder="描述遇到的问题或建议" disabled={!connected || busy || sending} /></label><label><input type="checkbox" checked={includeLogs} onChange={event => setIncludeLogs(event.target.checked)} disabled={!connected || busy || sending} /> 附带服务日志</label><button type="submit" disabled={!connected || busy || sending || !reason.trim()}>{sending ? '正在提交…' : '提交反馈'}</button>{status && <p role="status">{status}</p>}</form>;
}

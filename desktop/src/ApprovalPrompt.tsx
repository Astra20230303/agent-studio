import type { ToolActivity } from './domain';
import { useEffect, useRef, useState } from 'react';
import { commandApprovalOptions, type ApprovalDecision, type ApprovalOption } from './approvalDecisions';
const labels: Record<string, string> = { accept: '本次允许', acceptForSession: '本会话允许', decline: '拒绝', cancel: '取消本轮' };
export function ApprovalPrompt({ request, onDecision, fileChanges }: { fileChanges?: ToolActivity['changes']; request: any; onDecision: (decision: ApprovalDecision) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    element.showModal();
    element.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { element.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  const params = request.params || {};
  const permissions = request.method === 'item/permissions/requestApproval';
  const file = request.method === 'item/fileChange/requestApproval';
  const command = request.method === 'item/commandExecution/requestApproval';
  const supported = permissions || file || command;
  const decisions: ApprovalOption[] = command ? commandApprovalOptions(params)
    : (permissions ? ['decline', 'accept', 'acceptForSession'] : file ? ['decline', 'accept', 'acceptForSession', 'cancel'] : []).map(decision => ({ decision, label: permissions && decision === 'accept' ? '本轮允许' : labels[decision] }));
  const submit = async (decision: ApprovalDecision) => {
    if (lock.current) return;
    lock.current = true; dialog.current?.focus(); setBusy(true); setError('');
    try { await onDecision(decision); }
    catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <dialog ref={dialog} className="approval-dialog" aria-labelledby="approval-title" aria-busy={busy} tabIndex={-1} onKeyDown={event => {
    if (event.key !== 'Tab') return;
    if (busy) { event.preventDefault(); dialog.current?.focus(); return; }
    const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('summary, button:not(:disabled)') || [])];
    const first = controls[0], last = controls.at(-1);
    if (!first) { event.preventDefault(); dialog.current?.focus(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
  }} onCancel={event => event.preventDefault()} style={{ maxHeight: '85vh', overflow: 'auto', overflowWrap: 'anywhere', boxSizing: 'border-box' }}>
    <h2 id="approval-title">{permissions ? '请求额外权限' : file ? '确认文件变更' : '确认命令执行'}</h2>
    <p>{params.reason || params.message}</p>{params.command && <pre>{params.command}</pre>}{params.cwd && <p>{params.cwd}</p>}
    {params.threadId && <small>会话：{params.threadId}</small>}
    {file && <section aria-label="待审批文件差异">{fileChanges?.length ? fileChanges.map((change, index) => <details key={`${change.path}-${index}`} open><summary>{change.path}</summary>{typeof change.diff === 'string' && change.diff ? <pre>{change.diff}</pre> : <p>此文件尚未提供差异内容。</p>}</details>) : <p>尚未收到此请求的文件差异。</p>}</section>}
    {permissions && <p>本轮允许仅用于当前回合；本会话允许可在此会话后续回合继续使用所列权限。</p>}
    {params.grantRoot && <p>写入目录：{params.grantRoot}</p>}
    {(params.permissions || params.additionalPermissions || params.networkApprovalContext) && <pre>{JSON.stringify(params.permissions || params.additionalPermissions || params.networkApprovalContext, null, 2)}</pre>}
    {!supported && <p role="alert">此请求类型尚未支持：{request.method}</p>}{error && <p role="alert">{error}</p>}
    {!decisions.length && <p role="alert">服务端未提供可用的审批选项。</p>}
    <div className="approval-actions" style={{ flexWrap: 'wrap' }}>{decisions.map((option, index) => <div key={index}>{option.detail && <p id={`approval-option-${index}`}>{option.detail}</p>}<button aria-describedby={option.detail ? `approval-option-${index}` : undefined} disabled={busy} onClick={() => void submit(option.decision)}>{option.label}</button></div>)}</div>
  </dialog>;
}

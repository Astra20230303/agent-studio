import { TaskRunDuration } from './TaskRunDurationView';
import { taskTimezones } from './taskTimezones';
import { changeTaskSchedule } from './changeTaskSchedule';
import { TaskSchedulePreview } from './TaskSchedulePreview';
import { explicitEffortLevels, effortLabel } from './reasoningEffort';
import { TaskRunConfigurationView } from './TaskRunConfigurationView';
import { orderTasks } from './taskOrdering';
import type { TaskOrder } from './taskOrdering';
import { duplicateTask } from './duplicateTask';
import { projectRepository } from './projectRepository';
import { createAutomationRepository } from './automationRepository';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, FormEvent } from 'react';
import { Bell, CheckCircle2, ChevronDown, Circle, Clock3, FileSearch, LoaderCircle, Pause, Pencil, Play, Plus, RefreshCw, Square, Search, Trash2, X } from 'lucide-react';
import { formatTaskDate, localDateInput, localZone, nextRunLabel, scheduleLabel, taskRequest, taskRunLabels, taskStatusLabels, taskTemplates } from './scheduledTasks';
import type { ScheduledTask, TaskDraft, TaskSchedule } from './scheduledTasks';
import { useModelCatalog } from './ModelPicker';
import { TaskRunActions } from './TaskRunActions';
import { TaskHistoryExport } from './TaskHistoryExportButton';
import { useDraftStorage } from './useDraftStorage';
import { isTaskDraft } from './taskDraftStorage';
import './scheduled.css';
const automationRepository = createAutomationRepository(taskRequest);

function TaskModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  return <dialog className="task-modal" ref={dialog} aria-label={title} onKeyDown={event => { if (event.key === 'Escape' && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); onClose(); } }} onCancel={event => { event.preventDefault(); onClose(); }}><header><h2>{title}</h2><button type="button" className="task-icon-button" aria-label="关闭对话框" title="关闭" onClick={onClose}><X /></button></header>{children}</dialog>;
}

function TaskEditor({ draft, providers, onClose, onSaved, onChange, storageFeedback, restored, onSuspend }: { onSuspend: () => void; restored: boolean; storageFeedback?: ReactNode; draft: TaskDraft; providers: { id: string; name: string; enabled?: boolean }[]; onClose: () => void; onSaved: () => void; onChange: (draft: TaskDraft) => void }) {
  const [form, setForm] = useState<TaskDraft>(() => structuredClone(draft));
  const catalog = useModelCatalog(form.providerId);
  const supportedEfforts = catalog.efforts[form.model];
  const effortUnavailable = !!form.reasoningEffort && supportedEfforts !== undefined && !supportedEfforts.includes(form.reasoningEffort);
  const effortOptions = explicitEffortLevels.filter(level => supportedEfforts === undefined || supportedEfforts.includes(level.value));
  const { models, loading: loadingModels, refresh: refreshModels } = catalog;
  const [onceAt, setOnceAt] = useState(() => localDateInput(draft.schedule.kind === 'once' ? draft.schedule.at : new Date(Date.now() + 3600000).toISOString()));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const edited = useRef(restored);
  const [discarding, setDiscarding] = useState(false);
  const continueButton = useRef<HTMLButtonElement>(null);
  const formElement = useRef<HTMLFormElement>(null);
  useEffect(() => { if (discarding) continueButton.current?.focus(); else formElement.current?.querySelector<HTMLInputElement>('input')?.focus(); }, [discarding]);
  const requestClose = () => {
    if (saveLock.current) return;
    if (discarding) { setDiscarding(false); return; }
    if (edited.current) setDiscarding(true); else onClose();
  };
  const [writeConfirmed, setWriteConfirmed] = useState(!restored && Boolean(draft.id) && draft.permission === 'workspace-write');
  useLayoutEffect(() => {
    const parsedOnce = new Date(onceAt);
    const schedule = form.schedule.kind === 'once' ? { kind: 'once' as const, at: Number.isNaN(parsedOnce.getTime()) ? onceAt : parsedOnce.toISOString() } : form.schedule;
    onChange({ ...structuredClone(form), schedule });
  }, [form, onceAt]);
  useEffect(() => { if (!form.model && models.length) setForm(current => ({ ...current, model: models[0] })); }, [models, form.model]);
  const patch = (fields: Partial<TaskDraft>) => { edited.current = true; setDiscarding(false); setForm(current => ({ ...current, ...fields })); };
  const patchSchedule = (fields: Partial<Exclude<TaskSchedule, { kind: 'once' | 'interval' }>>) => { if (form.schedule.kind !== 'once' && form.schedule.kind !== 'interval') patch({ schedule: { ...form.schedule, ...fields } }); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (saveLock.current) return;
    saveLock.current = true; setDiscarding(false);
    setError(''); setSaving(true);
    try {
      if (form.kind === 'agent' && (loadingModels || !models.includes(form.model))) throw new Error(catalog.error || '请从渠道模型列表中选择可用模型。');
      if (form.kind === 'agent' && effortUnavailable) throw new Error('请为此模型重新选择支持的推理强度。');
      if (form.kind === 'agent' && form.permission === 'workspace-write' && !writeConfirmed) throw new Error('请确认允许无人值守修改工作区。');
      const schedule = form.schedule.kind === 'once' ? { kind: 'once' as const, at: new Date(onceAt).toISOString() } : form.schedule;
      await automationRepository.save({ ...form, schedule }); onSaved();
    } catch (caught) { setError(caught instanceof Error ? caught.message : '保存失败。'); }
    finally { saveLock.current = false; setSaving(false); }
  };
  return <TaskModal title={draft.id ? '编辑任务' : '创建任务'} onClose={requestClose}><form ref={formElement} onSubmit={submit}>
    <fieldset disabled={saving}>
      <label>任务名称<input required maxLength={120} autoFocus value={form.name} onChange={event => patch({ name: event.target.value })} /></label>
      <label>任务内容<textarea required maxLength={20000} rows={4} value={form.prompt} onChange={event => patch({ prompt: event.target.value })} /></label>
      <div className="task-form-grid"><label>类型<select value={form.kind} onChange={event => patch({ kind: event.target.value as TaskDraft['kind'] })}><option value="agent">Agent 任务</option><option value="reminder">提醒</option></select></label>
        <label>频率<select value={form.schedule.kind} onChange={event => {
          const kind = event.target.value as TaskSchedule['kind'];
          patch({ schedule: changeTaskSchedule(form.schedule, kind, localZone) });
        }}><option value="interval">固定间隔</option><option value="daily">每天</option><option value="weekdays">工作日</option><option value="weekly">每周</option><option value="customWeek">每周多日</option><option value="monthly">每月</option><option value="once">仅一次</option></select></label></div>
      {form.schedule.kind === 'interval' ? <label>间隔分钟数<input aria-label="任务间隔分钟数" required type="number" min={1} max={10080} step={1} value={form.schedule.minutes} onChange={event => patch({ schedule: { kind: 'interval', minutes: Number(event.target.value) } })} /><small>从保存或恢复时开始计时；错过多次仅执行一次，再从实际开始时间计时。</small></label> : form.schedule.kind === 'once' ? <label>运行时间（本地时区）<input required type="datetime-local" value={onceAt} onChange={event => { edited.current = true; setDiscarding(false); setOnceAt(event.target.value); }} /></label> : <>
        <div className="task-form-grid"><label>运行时间<input required type="time" value={form.schedule.time} onChange={event => patchSchedule({ time: event.target.value })} /></label><label>时区<select aria-label="任务时区" value={form.schedule.timezone} onChange={event => patchSchedule({ timezone: event.target.value })}>{taskTimezones(form.schedule.timezone, localZone).map(zone => <option key={zone}>{zone}</option>)}</select></label></div>
        {form.schedule.kind === 'monthly' && <label>每月日期<input aria-label="每月运行日期" type="number" required min={1} max={31} step={1} value={form.schedule.monthDay ?? ''} onChange={event => patchSchedule({ monthDay: Number(event.target.value) })} /><small>当月不存在该日期时跳过该月，例如 31 日不会在 2 月执行。</small></label>}
        {form.schedule.kind === 'customWeek' && <fieldset><legend>运行日（至少选择一天）</legend>{[1, 2, 3, 4, 5, 6, 0].map(day => <label className="task-check" key={day}><input type="checkbox" aria-label={`运行日 星期${'日一二三四五六'[day]}`} checked={form.schedule.kind === 'customWeek' && (form.schedule.days || []).includes(day)} onChange={event => { if (form.schedule.kind === 'customWeek') { const days = form.schedule.days || []; patchSchedule({ days: event.target.checked ? [...days, day] : days.filter(value => value !== day) }); } }} />星期{'日一二三四五六'[day]}</label>)}</fieldset>}
        {form.schedule.kind === 'weekly' && <label>星期<select aria-label="星期" value={form.schedule.day ?? 1} onChange={event => patchSchedule({ day: Number(event.target.value) })}>{Array.from('日一二三四五六').map((day, index) => <option key={index} value={index}>星期{day}</option>)}</select></label>}
      </>}
      <TaskSchedulePreview key={JSON.stringify([form.schedule, onceAt])} schedule={form.schedule.kind === 'once' ? { kind: 'once', at: onceAt } : form.schedule} />
      {form.kind === 'agent' && <><label>执行渠道<select aria-label="任务 Provider" value={form.providerId || ''} onChange={event => patch({ providerId: event.target.value || undefined })}><option value="">跟随当前启用渠道</option>{form.providerId && !providers.some(provider => provider.id === form.providerId) && <option value={form.providerId} disabled>{form.providerId}（不可用）</option>}{providers.map(provider => <option key={provider.id} value={provider.id}>{provider.name}{provider.enabled ? ' · 当前启用' : ''}</option>)}</select></label><div className="task-model-field"><label>模型<select aria-label="任务模型" required value={form.model} onChange={event => patch({ model: event.target.value })}><option value="">{loadingModels ? '正在读取模型…' : '选择模型'}</option>{form.model && !models.includes(form.model) && <option value={form.model} disabled>{form.model}（不可用）</option>}{models.map(model => <option key={model}>{model}</option>)}</select></label><button type="button" className="task-icon-button" title="刷新模型" aria-label="刷新模型" onClick={refreshModels} disabled={loadingModels}><RefreshCw /></button></div>
        <label>推理强度<select aria-label="任务推理强度" value={form.reasoningEffort || ''} onChange={event => patch({ reasoningEffort: event.target.value ? event.target.value as TaskDraft['reasoningEffort'] : undefined })}><option value="">模型默认</option>{effortUnavailable && <option value={form.reasoningEffort} disabled>{effortLabel(form.reasoningEffort)}（不受支持）</option>}{effortOptions.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}</select></label>
        {effortUnavailable && <p role="status">当前强度不在此模型声明的支持范围内，请重新选择后保存。原配置已保留。</p>}
        <label>执行时限（分钟）<input aria-label="任务执行时限" type="number" min={1} max={120} step={1} placeholder="默认 10" value={form.timeoutMinutes ?? ''} onChange={event => patch({ timeoutMinutes: event.target.value === '' ? undefined : Number(event.target.value) })} /><small>超时后停止本次运行，最长 120 分钟。</small></label>
        <label>工作目录<input aria-label="任务工作目录" value={form.cwd || ''} placeholder="留空使用 Felix 项目目录" onChange={event => { patch({ cwd: event.target.value }); setWriteConfirmed(false); }} /></label><button type="button" onClick={() => { void projectRepository.pick().then(project => { if (project?.path) { patch({ cwd: project.path }); setWriteConfirmed(false); } }).catch(error => setError(String(error))); }}>选择任务目录</button>
        <label>执行权限<select value={form.permission} onChange={event => { patch({ permission: event.target.value as TaskDraft['permission'] }); setWriteConfirmed(false); }}><option value="read-only">只读</option><option value="workspace-write">允许修改工作区</option></select></label>
        {form.permission === 'workspace-write' && <label className="task-check"><input type="checkbox" checked={writeConfirmed} onChange={event => { edited.current = true; setDiscarding(false); setWriteConfirmed(event.target.checked); }} />允许此任务无人值守修改上述任务工作目录</label>}
      </>}
      <label className="task-check"><input type="checkbox" checked={form.notify} onChange={event => patch({ notify: event.target.checked })} />启用任务通知</label>
      {form.notify && <label>通知范围<select aria-label="任务通知范围" value={form.notificationPolicy || "all"} onChange={event => patch({ notificationPolicy: event.target.value === "failed_runs_only" ? "failed_runs_only" : null })}><option value="all">完成、失败或中断</option><option value="failed_runs_only">仅失败时通知</option></select></label>}
    </fieldset>
    {storageFeedback}
    {error && <div className="task-error" role="alert">{error}</div>}
    {form.kind === 'agent' && catalog.error && <div className="task-error" role="alert">{catalog.error}</div>}
    {discarding && <section role="alert" aria-label="放弃任务修改"><p>任务修改尚未保存，是否放弃？</p><button ref={continueButton} type="button" onClick={() => setDiscarding(false)}>继续编辑</button><button type="button" onClick={() => { if (!saveLock.current) onClose(); }}>放弃修改</button></section>}
    <footer><button type="button" disabled={saving} onClick={() => { if (!saveLock.current) onSuspend(); }}>保留草稿并返回列表</button><button type="button" disabled={saving} onClick={requestClose}>取消</button><button className="task-primary" disabled={saving || form.kind === 'agent' && (loadingModels || !models.includes(form.model) || effortUnavailable)}>{saving ? '保存中…' : '保存任务'}</button></footer>
  </form></TaskModal>;
}

export function ScheduledPage({ providers, cwd, openRequest, onOpenHandled, onOpenConversation, onRecord }: { onRecord?: (action: string) => void; onOpenConversation?: (threadId: string, title: string) => void; onOpenHandled?: (request: { id: string }) => void; openRequest?: { id: string }; providers: { id: string; name: string; enabled?: boolean }[]; cwd?: string }) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [order, setOrder] = useState<TaskOrder>('original');
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState<TaskDraft>(); const [selectedId, setSelectedId] = useState<string>();
  const [runQuery, setRunQuery] = useState('');
  const [runFilter, setRunFilter] = useState('all');
  useEffect(() => { setRunQuery(''); setRunFilter('all'); }, [selectedId]);
  const [detail, setDetail] = useState<ScheduledTask>(); const [deleting, setDeleting] = useState<ScheduledTask>();
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [savedDraft, setSavedDraft, draftStorage] = useDraftStorage<TaskDraft | undefined>({ key: 'felix-task-editor-draft-v1', empty: () => undefined, valid: value => value === undefined || isTaskDraft(value), removeEmpty: value => value === undefined }, 'current');
  const [draftSuspended, setDraftSuspended] = useState(false);
  const hasSuspendedDraft = draftSuspended && !!savedDraft;
  const restoredDraft = useRef<TaskDraft | undefined>(undefined);
  useEffect(() => { if (!draft && savedDraft && !draftSuspended) { restoredDraft.current = savedDraft; setDraft(savedDraft); } }, [draft, savedDraft, draftSuspended]);
  const mutationLock = useRef(false);
  const [loadError, setLoadError] = useState(''); const [detailError, setDetailError] = useState('');
  const [createMenu, setCreateMenu] = useState(false); const createRoot = useRef<HTMLDivElement>(null);
  const openedRequest = useRef<{ id: string } | undefined>(undefined);
  useEffect(() => {
    if (!openRequest || openedRequest.current === openRequest || loading || loadError) return;
    openedRequest.current = openRequest;
    onOpenHandled?.(openRequest);
    setError('');
    if (!tasks.some(task => task.id === openRequest.id)) { setError('通知对应的任务已不存在。'); return; }
    setDetail(undefined); setDetailError(''); setSelectedId(openRequest.id);
  }, [openRequest, tasks, loading, loadError, onOpenHandled]);
  const alive = useRef(true); const refreshId = useRef(0);
  const reload = useCallback(async () => {
    const requestId = ++refreshId.current;
    try { const result = await automationRepository.list(); if (alive.current && requestId === refreshId.current) { setTasks(result); setLoadError(''); } }
    catch (caught) { if (alive.current && requestId === refreshId.current) setLoadError(caught instanceof Error ? caught.message : '任务加载失败。'); }
    finally { if (alive.current && requestId === refreshId.current) setLoading(false); }
  }, []);
  useEffect(() => {
    alive.current = true; void reload(); const timer = window.setInterval(() => void reload(), 5000);
    const unsubscribe = window.desktop?.onTasksChanged?.(message => { if (message?.error) setError(message.error); void reload(); });
    return () => { alive.current = false; ++refreshId.current; clearInterval(timer); unsubscribe?.(); };
  }, [reload]);
  const refreshDetail = useRef<() => void>(() => {});
  useEffect(() => {
    let active = true, inFlight = false, queued = false;
    const id = selectedId;
    const refresh = async () => {
      if (!active || !id) return;
      if (inFlight) { queued = true; return; }
      inFlight = true;
      try {
        const result = await automationRepository.detail(id);
        if (active) { setDetail(result); setDetailError(''); }
      } catch (caught) { if (active) setDetailError(caught instanceof Error ? caught.message : '任务详情读取失败。'); }
      finally {
        inFlight = false;
        if (active && queued) { queued = false; void refresh(); }
      }
    };
    refreshDetail.current = () => { void refresh(); };
    if (!id) setDetail(undefined);
    return () => { active = false; };
  }, [selectedId]);
  useEffect(() => {
    if (!selectedId) return;
    if (!tasks.some(task => task.id === selectedId)) { setSelectedId(undefined); return; }
    refreshDetail.current();
  }, [tasks, selectedId]);
  useEffect(() => {
    if (!createMenu) return;
    createRoot.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => { if (!createRoot.current?.contains(event.target as Node)) setCreateMenu(false); };
    document.addEventListener('pointerdown', outside); return () => document.removeEventListener('pointerdown', outside);
  }, [createMenu]);
  const create = (kind: TaskDraft['kind'], template?: typeof taskTemplates[number]) => {
    if (hasSuspendedDraft) return;
    setCreateMenu(false); setDraft({ name: '', prompt: '', kind, cwd, model: '', providerId: providers.find(provider => provider.enabled)?.id || providers[0]?.id, permission: 'read-only', notify: true, schedule: { kind: 'daily', time: '09:00', timezone: localZone }, ...template });
  };
  const mutate = async (operation: 'runTask' | 'cancelTask' | 'deleteTask' | 'setTaskStatus', id: string, status?: 'active' | 'paused') => {
    if (mutationLock.current) return; mutationLock.current = true; setBusy(true); setError('');
    try { if (operation === 'runTask') await automationRepository.run(id);
      else if (operation === 'cancelTask') await automationRepository.cancel(id);
      else if (operation === 'deleteTask') await automationRepository.remove(id);
      else if (status) await automationRepository.setStatus(id, status);
      onRecord?.(operation === 'runTask' ? '请求运行任务' : operation === 'cancelTask' ? '请求停止任务' : operation === 'deleteTask' ? '删除任务' : status === 'paused' ? '暂停任务' : '恢复任务');
      if (operation === 'deleteTask') { setSelectedId(undefined); setDeleting(undefined); } await reload(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '操作失败。'); }
    finally { mutationLock.current = false; setBusy(false); }
  };
  const visible = orderTasks(tasks.filter(task => `${task.name} ${task.prompt}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || (filter === 'failed' ? task.runs[0]?.status === 'failed' : task.status === filter))), order);
  const matchingRuns = (detail?.runs || []).filter(run => (runFilter === 'all' || run.status === runFilter) && [run.output, run.error, run.id, run.threadId, run.configuration?.name, run.configuration?.prompt].some(value => (value || '').toLowerCase().includes(runQuery.trim().toLowerCase())));
  const anyRunning = tasks.some(task => task.runs[0]?.status === 'running');
  return <div className="scheduled-page">
    <div className="scheduled-topbar"><div className="task-create-menu" ref={createRoot} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setCreateMenu(false); }} onKeyDown={event => {
      if (event.key === 'Escape') { setCreateMenu(false); createRoot.current?.querySelector<HTMLButtonElement>('.create-task')?.focus(); }
      if (createMenu && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); const items = Array.from(createRoot.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') || []); const index = items.indexOf(document.activeElement as HTMLButtonElement); items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus(); }
    }}><button disabled={hasSuspendedDraft} className="create-task" aria-expanded={createMenu} aria-haspopup="menu" onClick={() => setCreateMenu(value => !value)}>创建<ChevronDown aria-hidden="true" /></button>{createMenu && <div className="task-create-options" role="menu" aria-label="创建类型"><button role="menuitem" onClick={() => create('agent')}><Clock3 />Agent 任务</button><button role="menuitem" onClick={() => create('reminder')}><Bell />提醒</button></div>}</div></div>
    <div className="scheduled-content"><header className="scheduled-header"><h1>已安排的任务</h1></header>
      {hasSuspendedDraft && <section aria-label="暂存任务草稿"><p>有一份未提交的任务草稿。继续编辑并保存或放弃后，可创建其他任务。</p><button type="button" onClick={() => setDraftSuspended(false)}>继续编辑任务草稿</button></section>}
      <label className="scheduled-search"><Search aria-hidden="true" /><input aria-label="搜索已安排任务" placeholder="搜索已安排任务" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div className="task-tabs" role="tablist" aria-label="任务状态" onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')); const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
        const target = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; target?.focus(); target?.click();
      }}>{[['all', '全部'], ['active', '已开启'], ['paused', '已暂停'], ['completed', '已完成'], ['failed', '最近失败']].map(([id, label]) => <button role="tab" id={`task-tab-${id}`} aria-controls="task-list" tabIndex={filter === id ? 0 : -1} aria-selected={filter === id} key={id} onClick={() => setFilter(id)}>{label}</button>)}</div>
      <label className="task-sort">排序<select aria-label="任务排序" value={order} onChange={event => setOrder(event.target.value as TaskOrder)}><option value="original">默认顺序</option><option value="next">下次运行：最早优先</option><option value="recent">最近运行：最新优先</option><option value="name">任务名称</option></select></label>
      {loadError && <div className="task-error" role="alert"><span>{loadError}</span><button onClick={() => void reload()}>重试</button></div>}
      {error && !selectedId && <div className="task-error" role="alert"><span>{error}</span><button aria-label="关闭错误" onClick={() => setError('')}><X size={16} /></button></div>}
      {loading ? <div className="task-empty" role="status">正在读取任务…</div> : <div id="task-list" className="task-list" role="tabpanel" aria-labelledby={`task-tab-${filter}`}>{visible.map(task => {
        const running = task.runs[0]?.status === 'running';
        return <div className="task-row" key={task.id}><button className="task-open" onClick={() => { setDetail(undefined); setDetailError(''); setError(''); setSelectedId(task.id); }} aria-label={`查看任务 ${task.name}`}>
          {running ? <LoaderCircle className="task-spin" /> : task.status === 'completed' ? <CheckCircle2 /> : <Circle />}<span className="task-main"><strong>{task.name}</strong><small>{scheduleLabel(task.schedule)} · {running ? '运行中' : task.status === 'active' ? nextRunLabel(task.nextRunAt) : taskStatusLabels[task.status]}</small>{task.runs[0]?.status === 'failed' && <small className="task-failed">上次运行失败</small>}</span></button>
          <div className="task-actions"><button className="task-icon-button" title={running ? '停止运行' : '立即运行'} aria-label={running ? `停止 ${task.name}` : `运行 ${task.name}`} disabled={busy || !running && anyRunning} onClick={() => void mutate(running ? 'cancelTask' : 'runTask', task.id)}>{running ? <Square /> : <Play />}</button>{task.status !== 'completed' && <button className="task-icon-button" title={task.status === 'active' ? '暂停任务' : '恢复任务'} aria-label={task.status === 'active' ? `暂停 ${task.name}` : `恢复 ${task.name}`} disabled={busy} onClick={() => void mutate('setTaskStatus', task.id, task.status === 'active' ? 'paused' : 'active')}>{task.status === 'active' ? <Pause /> : <Play />}</button>}</div></div>;
      })}{visible.length === 0 && !loadError && <div className="task-empty">{tasks.length ? '没有匹配的任务' : '暂无已安排的任务'}</div>}</div>}
      {!query && filter === 'all' && <section className="task-suggestions" aria-labelledby="task-suggestions-title"><h2 id="task-suggestions-title">建议</h2>{taskTemplates.map(template => <button disabled={hasSuspendedDraft} className={`task-suggestion ${template.icon}`} key={template.name} onClick={() => create('agent', template)}>{template.icon === 'briefing' ? <Bell /> : template.icon === 'monitor' ? <FileSearch /> : <Plus />}<span><strong>{template.name}</strong><em>{scheduleLabel(template.schedule).split(' · ')[0]}</em><small>{template.summary}</small></span></button>)}</section>}
    </div>
    {selectedId && <TaskModal title={detail?.name || '任务详情'} onClose={() => { setSelectedId(undefined); setDetail(undefined); }}>{detailError && <div className="task-error" role="alert"><span>{detailError}</span><button onClick={() => void reload()}>重试</button></div>}{!detail ? !detailError && <p role="status">正在读取记录…</p> : <>
      <dl className="task-metadata"><dt>状态</dt><dd>{taskStatusLabels[detail.status]}</dd><dt>安排</dt><dd>{scheduleLabel(detail.schedule)}</dd><dt>下次运行</dt><dd>{formatTaskDate(detail.nextRunAt)}</dd><dt>权限</dt><dd>{detail.kind === 'reminder' ? '提醒' : detail.permission === 'read-only' ? '只读' : '允许修改工作区'}</dd><dt>通知</dt><dd>{!detail.notify ? '已关闭' : detail.notificationPolicy === 'failed_runs_only' ? '仅失败时通知' : '完成、失败或中断'}</dd>{detail.kind === 'agent' && <><dt>执行渠道</dt><dd>{detail.providerId ? providers.find(provider => provider.id === detail.providerId)?.name || `${detail.providerId}（不可用）` : '跟随当前启用渠道'}</dd><dt>推理强度</dt><dd>{effortLabel(detail.reasoningEffort)}</dd><dt>执行时限</dt><dd>{detail.timeoutMinutes ?? 10} 分钟</dd><dt>模型</dt><dd>{detail.model}</dd><dt>工作目录</dt><dd>{detail.cwd || 'Felix 项目目录（默认）'}</dd></>}</dl><p className="task-prompt">{detail.prompt}</p>
      <h3>运行记录</h3><div className="task-form-grid"><label>搜索运行记录<input type="search" aria-label="搜索运行记录" placeholder="输出、错误或任务内容" value={runQuery} onChange={event => setRunQuery(event.target.value)} /></label><label>运行结果<select aria-label="筛选运行结果" value={runFilter} onChange={event => setRunFilter(event.target.value)}><option value="all">全部结果</option>{Object.entries(taskRunLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div><p className="task-muted" role="status">显示 {matchingRuns.length} / {detail.runs.length} 条运行记录</p><TaskHistoryExport key={detail.id} name={detail.name} runs={matchingRuns} query={runQuery} status={runFilter} /><div className="task-runs">{matchingRuns.length ? matchingRuns.map(run => <details key={run.id} className="task-run"><summary><span>{formatTaskDate(run.startedAt)}</span><span className={run.status === 'failed' ? 'task-failed' : ''}>{taskRunLabels[run.status]}</span><TaskRunDuration run={run} /></summary><small>{run.trigger === 'scheduled' ? '定时执行' : '手动执行'}{run.finishedAt ? ` · 结束于 ${formatTaskDate(run.finishedAt)}` : ''}</small>{run.error && <p className="task-failed">{run.error}</p>}<>{run.outputTruncated && <p className="task-muted">输出过长，仅保留末尾 200000 字符。</p>}</><pre>{run.output || (run.status === 'running' ? '正在执行，结束后保存结果。' : '无输出')}</pre><TaskRunConfigurationView environment={run.environment} configuration={run.configuration} /><TaskRunActions onOpenConversation={onOpenConversation} key={`${run.id}:${run.status}`} name={detail.name} run={run} /></details>) : <p className="task-muted">{detail.runs.length ? '没有匹配的运行记录' : '尚无运行记录'}</p>}</div>
      {error && <p className="task-error" role="alert">{error}</p>}<footer><button className="task-danger" disabled={busy || detail.runs[0]?.status === 'running'} onClick={() => setDeleting(detail)}><Trash2 />删除</button><button disabled={busy || hasSuspendedDraft || detail.runs[0]?.status === 'running'} onClick={() => setDraft(detail)}><Pencil />编辑</button><button disabled={busy || hasSuspendedDraft} onClick={() => { setDraft(duplicateTask(detail)); setSelectedId(undefined); }}>复制任务</button><button disabled={busy || anyRunning && detail.runs[0]?.status !== 'running'} onClick={() => void mutate(detail.runs[0]?.status === 'running' ? 'cancelTask' : 'runTask', detail.id)}>{detail.runs[0]?.status === 'running' ? <Square /> : <Play />}{detail.runs[0]?.status === 'running' ? '停止运行' : '立即运行'}</button></footer>
    </>}</TaskModal>}
    {draft && <TaskEditor onSuspend={() => { setDraftSuspended(true); setDraft(undefined); setSelectedId(undefined); }} restored={draft === restoredDraft.current} storageFeedback={<>
      {draftStorage.readFailed && <p role="alert">任务草稿读取失败，原始数据已保留；修复后可重试读取。<button type="button" onClick={draftStorage.retry}>重试读取任务草稿</button></p>}
      {draftStorage.saveFailed && <p role="alert">任务草稿未能保存到本机，关闭应用可能丢失修改。<button type="button" onClick={draftStorage.retry}>重试保存任务草稿</button></p>}
    </>} draft={draft} providers={providers} onClose={() => { setDraft(undefined); setSavedDraft(undefined); }} onChange={setSavedDraft} onSaved={() => { onRecord?.(draft.id ? '编辑任务' : '创建任务'); setDraft(undefined); setSavedDraft(undefined); void reload(); }} />}
    {!draft && draftStorage.readFailed && <p role="alert">任务草稿读取失败，原始数据已保留；修复后可重试读取。<button type="button" onClick={draftStorage.retry}>重试读取任务草稿</button></p>}
    {!draft && draftStorage.saveFailed && <p role="alert">任务草稿更新未能保存到本机。<button type="button" onClick={draftStorage.retry}>重试保存任务草稿</button></p>}
    {deleting && <TaskModal title="删除任务" onClose={() => { if (!mutationLock.current) setDeleting(undefined); }}><p>删除“{deleting.name}”及其运行记录？</p>{error && <p role="alert" className="task-error">{error}</p>}<footer><button disabled={busy} onClick={() => setDeleting(undefined)}>取消</button><button disabled={busy} className="task-danger" onClick={() => void mutate('deleteTask', deleting.id)}>确认删除</button></footer></TaskModal>}
  </div>;
}

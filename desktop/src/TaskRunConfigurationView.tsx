import { useState } from 'react';
import type { TaskRunConfiguration } from './scheduledTasks';
export function TaskRunConfigurationView({ configuration: config }: { configuration?: TaskRunConfiguration }) {
  const [open, setOpen] = useState(false);
  if (!config) return <p className="task-muted">此运行记录没有配置快照。</p>;
  return <section><button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>运行时任务配置</button>{open && <><dl className="task-metadata">
    <dt>任务名称</dt><dd>{config.name}</dd><dt>类型</dt><dd>{config.kind === 'agent' ? 'Agent 任务' : '提醒'}</dd>
    {config.kind === 'agent' && <><dt>渠道配置</dt><dd>{config.providerId || '跟随运行时启用渠道'}</dd><dt>模型</dt><dd>{config.model}</dd>
      <dt>推理强度</dt><dd>{config.reasoningEffort ? {low:'低',medium:'中',high:'高'}[config.reasoningEffort] : '模型默认'}</dd>
      <dt>目录配置</dt><dd>{config.cwd || '使用运行时默认项目目录'}</dd><dt>权限</dt><dd>{config.permission === 'read-only' ? '只读' : '允许修改工作区'}</dd></>}
    </dl><p className="task-prompt">{config.prompt}</p></>}</section>;
}

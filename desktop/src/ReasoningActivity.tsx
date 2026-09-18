import { Brain, ChevronRight } from 'lucide-react';
import type { ToolActivity } from './domain';
import { CopyText } from './CopyText';
import { MarkdownMessage } from './MarkdownMessage';

export function ReasoningActivity({ tool }: { tool: ToolActivity }) {
  const summary = tool.rawRecord?.item.summary;
  const text = tool.rawRecord?.item.text;
  const parts: string[] = [
    ...(Array.isArray(summary) ? summary.filter((part): part is string => typeof part === 'string' && part.trim().length > 0) : []),
    ...(Array.isArray(text) ? text.filter((part): part is string => typeof part === 'string' && part.trim().length > 0) : []),
  ];
  const labels: Record<string, string> = { inProgress: '正在思考', completed: '思考完成', interrupted: '思考已中断', failed: '思考失败' };
  return <details className="tool-row" aria-label="推理摘要">
    <summary><Brain size={14} /><span className="tool-summary">{labels[tool.status] || '思考记录'} · 推理摘要</span>{tool.status === 'inProgress' && <span className="tool-running" aria-label="思考中" />}<ChevronRight className="disclosure" size={13} /></summary>
    <div className="tool-detail">
      {parts.length ? <><CopyText source={parts.join('\n\n')} label="复制推理摘要" />{parts.map((part, index) => <div key={index} style={{ overflowWrap: 'anywhere' }}><MarkdownMessage content={part} /></div>)}</> : <p>{tool.status === 'inProgress' ? '等待服务端提供推理摘要…' : '服务端未提供推理摘要。'}</p>}
    </div>
  </details>;
}

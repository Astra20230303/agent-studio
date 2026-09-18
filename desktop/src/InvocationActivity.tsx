import type { ToolActivity } from './domain';
import { ToolResult } from './ToolResult';
import { CopyText } from './CopyText';

function display(value: unknown) { return typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
export function InvocationActivity({ tool }: { tool: ToolActivity }) {
  const call = tool.invocation;
  if (!call) return null;
  const result = call.result as { isError?: boolean } | undefined;
  const failed = tool.status === 'failed' || !!call.error || call.success === false || result?.isError === true;
  const status = failed ? '失败' : tool.status === 'inProgress' ? '运行中' : tool.status === 'interrupted' ? '已中断' : '已完成';
  return <details className={`tool-row ${failed ? 'tool-failed' : ''}`}>
    <summary style={{ overflowWrap: 'anywhere' }}>{call.server ? `${call.server} · ` : ''}{call.name} · {status}</summary>
    <div className="tool-detail">{tool.durationMs != null && <small>用时 {(tool.durationMs / 1000).toFixed(1)} 秒</small>}
      <div className="tool-copy-actions"><CopyText source={display(call.arguments === undefined ? {} : call.arguments)!} label="复制参数" />{call.result != null && <CopyText source={display(call.result)!} label="复制结果" />}{call.error != null && <CopyText source={display(call.error)!} label="复制错误" />}</div>
      {tool.progress?.length ? <div className="tool-progress" aria-label="工具进度"><h4>进度</h4>{tool.progress.map((message, index) => <p key={index}>{message}</p>)}</div> : null}
      <h4>参数</h4><pre className="tool-output">{display(call.arguments === undefined ? {} : call.arguments)}</pre>
      {call.error != null && <pre className="tool-output" role="alert">{display(call.error)}</pre>}
      {call.result != null && <><h4>结果</h4><ToolResult result={call.result} /></>}
    </div>
  </details>;
}

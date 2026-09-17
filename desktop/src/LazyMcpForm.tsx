import { Component, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';

const Form = lazy(() => import('./McpForm').then(module => ({ default: module.McpForm })));
class LoadBoundary extends Component<{ children: ReactNode; onCancel: () => Promise<void> }, { failed: boolean; error: string; busy: boolean }> {
  state = { failed: false, error: '', busy: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="approval-backdrop"><section className="approval-dialog" role="dialog" aria-modal="true" aria-label="MCP 表单加载失败"><h2>无法加载 MCP 表单</h2><p role="alert">请取消本次请求后重新加载应用。{this.state.error}</p><button disabled={this.state.busy} onClick={async () => {
      this.setState({ busy: true, error: '' });
      try { await this.props.onCancel(); } catch (error) { this.setState({ error: String(error) }); } finally { this.setState({ busy: false }); }
    }}>取消请求</button></section></div>;
  }
}
export function LazyMcpForm({ request, onSubmit }: { request: any; onSubmit: (action: string, content?: Record<string, unknown>) => Promise<void> }) {
  return <LoadBoundary onCancel={() => onSubmit('cancel')}><Suspense fallback={<div className="approval-backdrop"><section className="approval-dialog" role="dialog" aria-modal="true" aria-label="正在加载 MCP 表单"><p role="status">正在加载表单…</p></section></div>}><Form request={request} onSubmit={onSubmit} /></Suspense></LoadBoundary>;
}

import { Component, lazy, Suspense, type ComponentProps, type ReactNode } from 'react';

const Page = lazy(() => import('./ScheduledPage').then(module => ({ default: module.ScheduledPage })));
class PageBoundary extends Component<{ children: ReactNode; onBack: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <section role="alert"><p>无法加载已安排页面，请重新打开应用后再试。</p><button onClick={this.props.onBack}>返回聊天</button></section>;
  }
}
export function LazyScheduledPage({ onBack, ...props }: ComponentProps<typeof Page> & { onBack: () => void }) {
  return <PageBoundary onBack={onBack}><Suspense fallback={<p role="status">正在加载已安排页面…</p>}><Page {...props} /></Suspense></PageBoundary>;
}

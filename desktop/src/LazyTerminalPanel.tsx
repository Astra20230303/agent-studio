import { Component, lazy, Suspense, type ComponentProps, type ReactNode } from 'react';
import './terminal.css';

const Panel = lazy(() => import('./TerminalPanel').then(module => ({ default: module.TerminalPanel })));
type Props = ComponentProps<typeof Panel>;
function TerminalStatus({ open, onClose, failed = false }: Pick<Props, 'open' | 'onClose'> & { failed?: boolean }) {
  return <section className="terminal-panel" hidden={!open} aria-label="终端">
    <header><span>终端</span><button aria-label="隐藏终端" onClick={onClose}>×</button></header>
    <p role={failed ? 'alert' : 'status'}>{failed ? '无法加载终端，请重新打开应用后再试。聊天仍可继续使用。' : '正在加载终端…'}</p>
  </section>;
}
class TerminalBoundary extends Component<Pick<Props, 'open' | 'onClose'> & { children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <TerminalStatus open={this.props.open} onClose={this.props.onClose} failed /> : this.props.children;
  }
}
export function LazyTerminalPanel(props: Props) {
  return <TerminalBoundary open={props.open} onClose={props.onClose}>
    <Suspense fallback={<TerminalStatus open={props.open} onClose={props.onClose} />}><Panel {...props} /></Suspense>
  </TerminalBoundary>;
}

import type { PlanProgress } from './planning';
import './planning.css';
export function PlanPanel({ plan, delta }: { plan?: PlanProgress; delta?: { turnId: string; itemId: string; content: string } }) {
  if (!plan && !delta) return null;
  if (!plan) return <details className="plan-panel" open><summary>正在生成计划文本…</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{delta?.content}</pre></details>;
  const labels = { pending: '待完成', inProgress: '进行中', completed: '已完成' };
  return <details className="plan-panel" open><summary>任务计划 · {plan.steps.filter(step => step.status === 'completed').length}/{plan.steps.length}</summary>{plan.explanation && <p>{plan.explanation}</p>}{delta?.content && <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{delta.content}</pre>}<ol>{plan.steps.map((step, index) => <li key={index}><span className={`plan-status ${step.status}`}>{labels[step.status]}</span><span>{step.step}</span></li>)}</ol></details>;
}

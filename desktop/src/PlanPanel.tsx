import type { PlanProgress } from './planning';
import './planning.css';
export function PlanPanel({ plan }: { plan?: PlanProgress }) {
  if (!plan) return null;
  const labels = { pending: '待完成', inProgress: '进行中', completed: '已完成' };
  return <details className="plan-panel" open><summary>任务计划 · {plan.steps.filter(step => step.status === 'completed').length}/{plan.steps.length}</summary>{plan.explanation && <p>{plan.explanation}</p>}<ol>{plan.steps.map((step, index) => <li key={index}><span className={`plan-status ${step.status}`}>{labels[step.status]}</span><span>{step.step}</span></li>)}</ol></details>;
}

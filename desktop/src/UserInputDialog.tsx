import { useRef, useState } from 'react';
import './userInput.css';

type Question = { id: string; header: string; question: string; isSecret?: boolean; isOther?: boolean; options?: { label: string; description: string }[] | null };
export type UserAnswers = Record<string, { answers: string[] }>;

export function UserInputDialog({ request, onDecision }: { request: { params?: { questions?: Question[] } }; onDecision: (decision: string, answers?: UserAnswers) => Promise<void> }) {
  const questions = request.params?.questions || [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [error, setError] = useState('');
  const answer = (q: Question) => choices[q.id] && choices[q.id] !== 'other' ? q.options?.[Number(choices[q.id])]?.label || '' : values[q.id] || '';
  const submit = async (cancel = false) => {
    if (sending.current) return;
    sending.current = true;
    setBusy(true); setError('');
    try {
      await onDecision(cancel ? 'cancel' : 'accept', Object.fromEntries(questions.map(q => [q.id, { answers: cancel ? [] : [answer(q).trim()] }])));
    } catch (err) { setError(err instanceof Error ? err.message : '提交失败，请重试。'); }
    finally { sending.current = false; setBusy(false); }
  };
  return <div className="approval-backdrop"><form className="approval-dialog user-input-dialog" role="dialog" aria-modal="true" aria-labelledby="user-input-title" onSubmit={event => { event.preventDefault(); void submit(); }}>
    <h2 id="user-input-title">需要补充信息</h2>
    {questions.map(q => <fieldset key={q.id} disabled={busy}>
      <legend>{q.header}</legend><p>{q.question}</p>
      {!q.isSecret && q.options?.map((option, index) => <label className="question-option" key={index}>
        <input type="radio" name={q.id} checked={choices[q.id] === String(index)} onChange={() => setChoices(previous => ({ ...previous, [q.id]: String(index) }))} />
        <span>{option.label}<small>{option.description}</small></span>
      </label>)}
      {!q.isSecret && !!q.options?.length && q.isOther && <label className="question-option"><input type="radio" name={q.id} checked={choices[q.id] === 'other'} onChange={() => setChoices(previous => ({ ...previous, [q.id]: 'other' }))} />其他</label>}
      {(q.isSecret || !q.options?.length || choices[q.id] === 'other') && <input className="question-text" aria-label={q.question} type={q.isSecret ? 'password' : 'text'} autoComplete="off" value={values[q.id] || ''} onChange={event => setValues(previous => ({ ...previous, [q.id]: event.target.value }))} />}
    </fieldset>)}
    {error && <p role="alert">{error}</p>}
    <div className="approval-actions"><button type="button" disabled={busy} onClick={() => void submit(true)}>取消</button><button className="primary" type="submit" disabled={busy || !questions.length || questions.some(q => !answer(q).trim())}>{busy ? '正在提交…' : '提交'}</button></div>
  </form></div>;
}

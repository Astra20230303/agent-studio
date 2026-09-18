import { useState } from 'react';
import { commitReviewPrompt, COMMIT_REVIEW_LIMIT } from './commitReviewPrompt';

export function CommitReviewDraft({ root, commit, detail, disabled, onReview }: { root: string; commit: string; detail: string; disabled: boolean; onReview: (text: string) => void }) {
  const [focus, setFocus] = useState('');
  const [error, setError] = useState('');
  return <form onSubmit={event => {
    event.preventDefault(); if (disabled || !detail.trim()) return;
    try { onReview(commitReviewPrompt(root, commit, detail, focus)); setError(''); }
    catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
  }}>
    <label>评审重点（可选）<textarea aria-label="提交评审重点" maxLength={4000} value={focus} onChange={event => setFocus(event.target.value)} /></label>
    {detail.length > COMMIT_REVIEW_LIMIT && <p>差异较大，草稿将包含前 {COMMIT_REVIEW_LIMIT} 字符和完整提交 ID。</p>}
    <button disabled={disabled || !detail.trim()}>加入提交评审草稿</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}

import { useState } from 'react';
import { diffRows } from './gitDiff';

export function GitReview({ root, path, staged, diff, onReview }: { root: string; path: string; staged: boolean; diff: string; onReview: (text: string) => void }) {
  const [selected, setSelected] = useState<number>();
  const [comment, setComment] = useState('');
  const rows = diffRows(diff);
  const row = selected === undefined ? undefined : rows[selected];
  return <><pre className="review-diff">{rows.map((item, index) => item.line !== undefined ? <button type="button" key={index} aria-label={`${item.side === 'old' ? '旧' : '新'}行 ${item.line}: ${item.text}`} aria-pressed={selected === index} className={item.text.startsWith('+') ? 'added' : item.text.startsWith('-') ? 'removed' : ''} onClick={() => setSelected(selected === index ? undefined : index)}><span>{item.line}</span>{item.text}{'\n'}</button> : <span key={index}>{item.text}{'\n'}</span>)}</pre>
    <form className="git-review" onSubmit={event => {
      event.preventDefault(); if (!comment.trim()) return;
      onReview(`请根据以下 Git 审阅意见检查并修正代码：\n工作区：${root}\n文件：${path}\n差异：${staged ? '已暂存' : '未暂存'}${row?.line !== undefined ? `\n位置：${row.side === 'old' ? '旧版本' : '新版本'}第 ${row.line} 行\n差异行：${row.text}` : ''}\n审阅意见：${comment.trim()}`);
      setComment(''); setSelected(undefined);
    }}><label>{row?.line !== undefined ? `${row.side === 'old' ? '旧' : '新'}版本第 ${row.line} 行` : '文件审阅意见'}<textarea aria-label="审阅意见" value={comment} onChange={event => setComment(event.target.value)} /></label><button disabled={!comment.trim()}>加入会话草稿</button></form>
  </>;
}

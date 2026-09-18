import { useState } from 'react';
import { CopyText } from './CopyText';
export function CodeBlock({ source, language }: { source: string; language: string }) {
  const [wrap, setWrap] = useState(false);
  return <div className="code-block"><div className="code-header"><span>{language || '代码'}</span><div className="code-controls"><button aria-label="代码自动换行" aria-pressed={wrap} onClick={() => setWrap(value => !value)}>{wrap ? '取消换行' : '自动换行'}</button><CopyText source={source} label="复制代码" /></div></div><pre tabIndex={0} aria-label={`${language || '代码'}内容`} className={wrap ? 'code-wrap' : undefined}><code>{source}</code></pre></div>;
}

import { CopyText } from './CopyText';
export function CodeBlock({ source, language }: { source: string; language: string }) {
  return <div className="code-block"><div className="code-header"><span>{language || '代码'}</span><CopyText source={source} label="复制代码" /></div><pre><code>{source}</code></pre></div>;
}

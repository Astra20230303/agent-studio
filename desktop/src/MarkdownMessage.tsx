import { Fragment, useMemo, type ReactNode } from 'react';
import { Lexer, type Token, type Tokens } from 'marked';
import { ArtifactLink } from './Artifacts';
import { CodeBlock } from './CodeBlock';
import { replyText } from './messageActions';

function decode(value: string) {
  return value.replace(/&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);/gi, entity => {
    const element = document.createElement('textarea'); element.innerHTML = entity; return element.value;
  });
}
function renderTokens(tokens: Token[], depth = 0): ReactNode {
  if (depth > 100) return tokens.map(token => token.raw).join('');
  const children = (items: Token[] = []) => renderTokens(items, depth + 1);
  return tokens.map((token, index) => {
    let node: ReactNode;
    switch (token.type) {
      case 'space': return null;
      case 'code': node = <CodeBlock source={token.text} language={token.lang || ''} />; break;
      case 'codespan': node = <code>{token.text}</code>; break;
      case 'paragraph': node = <p>{children(token.tokens)}</p>; break;
      case 'heading': {
        const Heading = `h${token.depth}` as 'h1';
        node = <Heading className={`md-heading md-h${token.depth}`}>{children(token.tokens)}</Heading>; break;
      }
      case 'blockquote': node = <blockquote>{children(token.tokens)}</blockquote>; break;
      case 'hr': node = <hr />; break;
      case 'br': node = <br />; break;
      case 'strong': node = <strong>{children(token.tokens)}</strong>; break;
      case 'em': node = <em>{children(token.tokens)}</em>; break;
      case 'del': node = <del>{children(token.tokens)}</del>; break;
      case 'list': {
        const list = token as Tokens.List;
        const items = list.items.map((item, key) => <li key={key}>{item.task && <input type="checkbox" checked={Boolean(item.checked)} disabled aria-label={item.checked ? '已完成任务' : '未完成任务'} />}{children(item.tokens)}</li>);
        node = list.ordered ? <ol start={typeof list.start === 'number' ? list.start : 1}>{items}</ol> : <ul>{items}</ul>; break;
      }
      case 'table': {
        const table = token as Tokens.Table;
        node = <div className="md-table-wrap" role="region" aria-label="消息表格" tabIndex={0}><table className="md-table"><thead><tr>{table.header.map((cell, column) => <th key={column} scope="col" style={{ textAlign: table.align[column] || undefined }}>{children(cell.tokens)}</th>)}</tr></thead><tbody>{table.rows.map((row, key) => <tr key={key}>{row.map((cell, column) => <td key={column} style={{ textAlign: table.align[column] || undefined }}>{children(cell.tokens)}</td>)}</tr>)}</tbody></table></div>; break;
      }
      case 'link': node = <ArtifactLink path={decode(token.href)} label={decode(token.text)} />; break;
      case 'image': node = <ArtifactLink path={decode(token.href)} label={decode(token.text) || '预览'} preview />; break;
      case 'html': node = token.text; break;
      case 'text': node = token.tokens ? children(token.tokens) : decode(token.text); break;
      case 'escape': node = decode(token.text); break;
      default: node = token.raw;
    }
    return <Fragment key={index}>{node}</Fragment>;
  });
}
export function MarkdownMessage({ content }: { content: string }) {
  const text = replyText(content);
  const tokens = useMemo(() => { try { return Lexer.lex(text, { gfm: true }); } catch { return null; } }, [text]);
  return <div className="markdown-content">{tokens ? renderTokens(tokens) : <p>{text}</p>}</div>;
}

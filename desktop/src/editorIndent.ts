export function indentSelection(text: string, start: number, end: number, outdent: boolean) {
  if (start === end && !outdent) return { text: text.slice(0, start) + '  ' + text.slice(end), start: start + 2, end: start + 2 };
  const first = start === 0 ? 0 : text.lastIndexOf('\n', start - 1) + 1;
  const last = end > start && text[end - 1] === '\n' ? end - 1 : end;
  const lineEnd = text.indexOf('\n', last);
  const stop = lineEnd === -1 ? text.length : lineEnd;
  const lines = text.slice(first, stop).split('\n');
  let delta = 0; let firstDelta = 0;
  const result = lines.map((line, index) => {
    const count = outdent ? (line.startsWith('\t') ? 1 : line.match(/^ {0,2}/)![0].length) : 0;
    const change = outdent ? -count : 2;
    if (!index) firstDelta = change;
    delta += change;
    return outdent ? line.slice(count) : `  ${line}`;
  }).join('\n');
  return { text: text.slice(0, first) + result + text.slice(stop), start: Math.max(first, start + firstDelta), end: Math.max(first, end + delta) };
}

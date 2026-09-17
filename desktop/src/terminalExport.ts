import type { IBuffer } from '@xterm/xterm';

export function terminalText(buffer: IBuffer): string {
  const lines: string[] = [];
  for (let index = 0; index < buffer.length; index++) {
    const line = buffer.getLine(index);
    if (!line) continue;
    const text = line.translateToString(!buffer.getLine(index + 1)?.isWrapped);
    if (line.isWrapped && lines.length) lines[lines.length - 1] += text;
    else lines.push(text);
  }
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n') + (lines.length ? '\n' : '');
}

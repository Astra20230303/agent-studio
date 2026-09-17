export function diffRows(diff: string) {
  let oldLine = 0, newLine = 0, oldRemaining = 0, newRemaining = 0;
  return diff.split('\n').map(text => {
    const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(text);
    if (header) {
      oldLine = Number(header[1]); oldRemaining = Number(header[2] ?? 1);
      newLine = Number(header[3]); newRemaining = Number(header[4] ?? 1);
      return { text };
    }
    if (text.startsWith('+') && newRemaining > 0) { newRemaining--; return { text, line: newLine++, side: 'new' }; }
    if (text.startsWith('-') && oldRemaining > 0) { oldRemaining--; return { text, line: oldLine++, side: 'old' }; }
    if (text.startsWith(' ') && oldRemaining > 0 && newRemaining > 0) { oldRemaining--; newRemaining--; oldLine++; return { text, line: newLine++, side: 'new' }; }
    if (!text.startsWith('\\')) { oldRemaining = 0; newRemaining = 0; }
    return { text };
  });
}

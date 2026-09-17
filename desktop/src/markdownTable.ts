export function tableCells(line: string): string[] {
  const value = line.trim();
  const cells = [''];
  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (character !== '|') { cells[cells.length - 1] += character; continue; }
    let backslashes = 0;
    for (let previous = index - 1; previous >= 0 && value[previous] === '\\'; previous--) backslashes++;
    if (backslashes % 2) cells[cells.length - 1] = cells[cells.length - 1].slice(0, -1) + '|';
    else cells.push('');
  }
  if (value.startsWith('|')) cells.shift();
  if (cells.length > 1 && cells[cells.length - 1] === '') cells.pop();
  return cells.map(cell => cell.trim());
}
export function isTableDivider(line: string) {
  const cells = tableCells(line);
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

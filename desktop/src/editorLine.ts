export function selectEditorLine(input: HTMLTextAreaElement, number: number): boolean {
  const lines = input.value.split('\n');
  if (!Number.isSafeInteger(number) || number < 1 || number > lines.length) return false;
  const start = lines.slice(0, number - 1).reduce((offset, line) => offset + line.length + 1, 0);
  input.setSelectionRange(start, start + lines[number - 1].length);
  const lineHeight = Number.parseFloat(getComputedStyle(input).lineHeight) || 20;
  input.scrollTop = Math.max(0, (number - 1) * lineHeight - input.clientHeight / 2 + lineHeight);
  input.scrollLeft = 0;
  return true;
}

export function selectEditorLine(input: HTMLTextAreaElement, number: number, column?: number, matchLength?: number): boolean {
  const lines = input.value.split('\n');
  if (!Number.isSafeInteger(number) || number < 1 || number > lines.length) return false;
  const start = lines.slice(0, number - 1).reduce((offset, line) => offset + line.length + 1, 0);
  const precise = Number.isSafeInteger(column) && Number.isSafeInteger(matchLength) && column! >= 1 && column! <= lines[number - 1].length + 1 && matchLength! >= 1 && start + column! - 1 + matchLength! <= input.value.length;
  const from = precise ? start + column! - 1 : start;
  input.setSelectionRange(from, precise ? from + matchLength! : start + lines[number - 1].length);
  const lineHeight = Number.parseFloat(getComputedStyle(input).lineHeight) || 20;
  input.scrollTop = Math.max(0, (number - 1) * lineHeight - input.clientHeight / 2 + lineHeight);
  input.scrollLeft = 0;
  return true;
}

export function selectEditorLine(input: HTMLTextAreaElement, number: number, column?: number, matchLength?: number): boolean {
  const lines = input.value.split('\n');
  if (!Number.isSafeInteger(number) || number < 1 || number > lines.length) return false;
  const start = lines.slice(0, number - 1).reduce((offset, line) => offset + line.length + 1, 0);
  const precise = Number.isSafeInteger(column) && Number.isSafeInteger(matchLength) && column! >= 1 && column! <= lines[number - 1].length + 1 && matchLength! >= 1 && start + column! - 1 + matchLength! <= input.value.length;
  const from = precise ? start + column! - 1 : start;
  input.setSelectionRange(from, precise ? from + matchLength! : start + lines[number - 1].length);
  revealEditorSelection(input, from);
  return true;
}

export function revealEditorSelection(input: HTMLTextAreaElement, start: number) {
  const prefix = input.value.slice(0, start);
  const lineStart = prefix.lastIndexOf('\n') + 1;
  const style = getComputedStyle(input);
  const lineHeight = Number.parseFloat(style.lineHeight) || 20;
  const measure = document.createElement('span');
  Object.assign(measure.style, { position: 'fixed', visibility: 'hidden', whiteSpace: 'pre', font: style.font, letterSpacing: style.letterSpacing, tabSize: style.tabSize });
  measure.textContent = prefix.slice(lineStart);
  document.body.appendChild(measure);
  const width = measure.getBoundingClientRect().width;
  measure.remove();
  input.scrollTop = Math.max(0, (prefix.split('\n').length - 1) * lineHeight - input.clientHeight / 2 + lineHeight);
  input.scrollLeft = Math.max(0, width - input.clientWidth / 2);
}

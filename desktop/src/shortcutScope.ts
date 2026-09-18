export function canHandleAppShortcut(event: KeyboardEvent) {
  return !(event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229 || event.altKey)
    && Boolean(event.ctrlKey || event.metaKey)
    && !document.querySelector('[aria-modal="true"], [role="dialog"], dialog[open], [popover]:popover-open')
    && !(event.target as Element)?.closest?.('.xterm');
}

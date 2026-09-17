export function KeyboardSettings({ value, onChange }: { value?: 'enter' | 'mod-enter'; onChange: (value: 'enter' | 'mod-enter') => void }) {
  return <div className="settings-card"><div className="settings-line"><div><b>发送消息</b><small>适用于发送新消息和追加指令。Shift+Enter 始终换行。</small></div><select aria-label="发送快捷键" value={value || 'enter'} onChange={event => onChange(event.target.value as 'enter' | 'mod-enter')}><option value="enter">Enter</option><option value="mod-enter">Ctrl / ⌘ + Enter</option></select></div></div>;
}

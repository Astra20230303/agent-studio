import type { DesktopState } from './domain';
export const permissionOptions = [
  ['on-request', '按需审批', '默认只读，需要额外权限时请求审批'],
  ['workspace-write', '帮我审批', '允许工作区写入，由自动审查处理额外权限请求'],
  ['danger-full-access', '完全访问权限', '不启用文件沙箱，也不请求操作审批']
] as const;
export function PermissionSettings({ value, onChange }: { value: DesktopState['permission']; onChange: (value: DesktopState['permission']) => void }) {
  return <><h2>新会话权限</h2><div className="settings-card"><p>用于之后创建的远端会话。已有会话继续使用其服务端权限配置。</p>{permissionOptions.map(([key, label, description]) => <label className="settings-line" key={key}><div><b>{label}</b><small>{description}</small></div><input type="radio" name="new-thread-permission" checked={value === key} onChange={() => onChange(key)} aria-label={label} /></label>)}</div></>;
}

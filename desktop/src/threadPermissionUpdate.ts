import { readThreadPermissions } from './threadPermissions.ts';
import type { DesktopState } from './domain';

export function readPermissionUpdate(value: unknown, permission: DesktopState['permission']) {
  const settings = readThreadPermissions(value);
  const sandbox = permission === 'danger-full-access' ? 'dangerFullAccess' : permission === 'workspace-write' ? 'workspaceWrite' : 'readOnly';
  const approval = permission === 'danger-full-access' ? 'never' : 'on-request';
  const reviewer = permission === 'workspace-write' ? 'auto_review' : 'user';
  if (!settings || settings.sandbox !== sandbox || settings.approvalPolicy !== approval || settings.reviewer !== reviewer) {
    throw Error('权限变更未得到有效确认，请重新打开会话核对后重试。');
  }
  return settings;
}

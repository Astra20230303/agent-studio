import type { AuditEntry } from './useAuditLog';

export function auditExport(entries: AuditEntry[], query: string, at = new Date().toISOString()) {
  if (!entries.length) throw Error('没有可导出的操作记录');
  // Project paths were removed from stored audit details; keep older exports
  // consistent even if the caller supplies an unmigrated entry.
  const records = entries.map(({ id, at, action, detail }) => ({ id, at, action, ...(detail && action !== '切换项目' ? { detail } : {}) }));
  const data = JSON.stringify(records, null, 2);
  const fence = '`'.repeat(Math.max(3, ...Array.from(data.matchAll(/`+/g), match => match[0].length + 1)));
  return { count: records.length, content: [
    '# Felix 操作记录', '', `导出时间：${at}`, `搜索条件：${JSON.stringify(query.trim())}`, `记录数：${records.length}`,
    '范围：当前筛选匹配的本机记录，最多保留最近 200 条；不包含已清理或其他设备的历史。', '',
    `${fence}json`, data, fence, '',
  ].join('\n') };
}

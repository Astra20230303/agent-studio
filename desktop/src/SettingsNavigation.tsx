import { useState, type ReactNode } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import './settings-navigation.css';

const sections = [
  { name: '常规', keywords: '主题 外观 浅色 深色 跟随系统 默认模型 theme appearance system model' },
  { name: '权限', keywords: '审批 沙箱 只读 工作区 写入 完全访问 自动审查 permissions sandbox approval' },
  { name: '通知', keywords: '完成 失败 输入 审批 后台 notification' },
  { name: '配置', keywords: '渠道 模型 密钥 连接 provider api key base url model' },
  { name: '键盘快捷键', keywords: '发送 消息 换行 enter ctrl keyboard shortcuts' },
  { name: '电脑操控', keywords: '远程 桌面 连接 remote desktop' },
  { name: '操作记录', keywords: '审计 活动 历史 audit activity log' },
] as const;
export type SettingsSection = typeof sections[number]['name'];

export function SettingsNavigation({ onBack, children }: { onBack: () => void; children: (section: SettingsSection) => ReactNode }) {
  const [section, setSection] = useState<SettingsSection>('常规');
  const [query, setQuery] = useState('');
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = sections.filter(item => words.every(word => `${item.name} ${item.keywords}`.toLocaleLowerCase().includes(word)));
  const visibleSection = matches.some(item => item.name === section) ? section : matches[0]?.name;
  return <div className="settings-shell">
    <aside className="settings-sidebar">
      <button className="settings-back" onClick={onBack}><ArrowLeft size={18} aria-hidden="true" /><span>返回应用</span></button>
      <div className="settings-search-row">
        <input className="settings-search" type="search" aria-label="搜索设置" placeholder="搜索设置..." value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setQuery(''); }} />
        {query && <button className="icon-button" title="清除搜索" aria-label="清除搜索" onClick={() => setQuery('')}><X size={16} aria-hidden="true" /></button>}
      </div>
      <nav aria-label="设置分类">{matches.map(item => <button key={item.name} className={`settings-nav ${visibleSection === item.name ? 'active' : ''}`} aria-current={visibleSection === item.name ? 'page' : undefined} onClick={() => setSection(item.name)}>{item.name}</button>)}</nav>
      {!!words.length && <p role="status">{matches.length ? `${matches.length} 个匹配分类` : '没有匹配的设置'}</p>}
    </aside>
    <main className="settings-content">{visibleSection ? <><h1>{visibleSection}</h1>{children(visibleSection)}</> : <p>没有匹配的设置</p>}</main>
  </div>;
}

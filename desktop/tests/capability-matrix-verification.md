# Felix 能力矩阵校准（2026-09-18）

本轮只校正文档状态，不改变运行时代码。验收规则是：只有存在对应实现入口和至少一条分层验收证据，能力才标为“已接入”；真实模型渠道、系统窗口、签名发布和所有平台覆盖继续单独标为边界。

当前证据索引：

| 能力 | 实现锚点 | 验收证据 |
| --- | --- | --- |
| 线程/回合/审批/补充信息 | `desktop/src/main.tsx`、`desktop/src/UserInputDialog.tsx`、`desktop/electron/codex-server.cjs` | `turn-lifecycle-ui.cjs`、`user-input-ui.cjs`、`app-server-tools.cjs` |
| 上下文用量与压缩 | `desktop/src/ContextUsage.tsx` | `context-usage-ui.cjs` |
| Git 工作流 | `desktop/src/GitPanel.tsx`、`desktop/electron/workspace-git.cjs` | `git-*.test.cjs`、对应 UI 验收 |
| 终端/文件/浏览器 | `desktop/src/TerminalPanel.tsx`、`WorkspaceFiles.tsx`、`RemoteBrowser.tsx` | `terminal-*.cjs`、`workspace-*.cjs`、`remote-browser-ui.cjs` |
| MCP/插件/技能 | `desktop/src/McpServers.tsx`、`ExtensionsPage.tsx` | `mcp-*.cjs`、`composer-plugins-ui.cjs` |
| 本机/远程 Computer Use | `desktop/electron/remote-desktop.cjs`、`remote-desktop-mcp.cjs` | `remote-desktop-*.cjs`、`remote-reconnect.test.cjs` |
| 自动化与通知 | `desktop/src/ScheduledPage.tsx`、`desktop/electron/task-scheduler.cjs` | `task-*.test.cjs`、`scheduled-ui.cjs` |

未宣称完成：独立异步 store 抽象、完整审计日志、Electron 签名打包、多平台发布和所有真实目标环境的系统级回归。

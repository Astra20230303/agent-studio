# 命令面板会话操作验收（2026-09-18）

命令面板只负责筛选和调度，业务状态仍由主界面共享处理器维护：

- 置顶调用现有 `togglePinned`，会话列表排序和本地持久化沿用侧栏路径。
- 重命名调用现有 `renameActive`，复用远端同步、错误保留和对话框校验。
- 分叉调用现有 `forkActive`，复用连接、运行中和 pending 禁用条件。
- 停止回合调用现有 `cancel`，使用当前活动线程和 `runningTurnId`，不会停止其他线程。
- 远程桌面调用现有 `setBrowserOpen`，不重复创建连接或绕过 Computer Use 生命周期。

验收通过：

- `command-palette-ui.cjs`：搜索、空结果、Escape 焦点恢复、新会话和 Git 导航回归。
- `command-palette-actions-ui.cjs`：真实渲染器状态下置顶、重命名和远程桌面入口。
- TypeScript 编译、Vite 生产构建、提交前静态检查。

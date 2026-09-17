# Felix 桌面应用

Felix 个人 Agent 平台的桌面客户端，使用 Electron、React、TypeScript 和 Vite，为模型接入、任务执行、工具扩展及本机与远程电脑操控提供统一入口。项目定位、能力范围与实施方向见 [根 README](../README.md)。根目录 `index.html` 仅保留为早期原型。

## 安装与启动

在仓库根目录执行：

```powershell
pnpm --dir desktop install
pnpm --dir desktop build
.\desktop\start-desktop.ps1
```

启动脚本会在 Electron 包存在但可执行文件缺失时尝试下载 Electron；未安装依赖或未构建界面时会明确报错。

启动还需要项目内的 Codex 可执行程序。主进程优先使用 `.project-cache/bin/codex.exe`，其次使用 `codex-upstream/codex-rs/target/debug` 或 `target/release` 内的程序。`CODEX_APP_SERVER_COMMAND` 可覆盖路径，但必须指向项目内的文件。不会回退到系统安装的 Codex。

开发时可在两个 PowerShell 窗口中分别执行：

```powershell
# 窗口一：在 desktop 目录启动前端
pnpm exec vite --port 5317
```

```powershell
# 窗口二：同样在 desktop 目录启动 Electron
pnpm exec electron . --dev
```

## 模型与数据

- 在 **设置 → 配置** 中新增、编辑和启用模型渠道；支持模型列表读取与独立的推理强度选择。
- 模型适配器将 Responses 请求转换为兼容的 Chat Completions 请求，保持工具调用与结果回传链路。
- Provider API Key 使用 Electron `safeStorage` 加密保存在 `.project-cache/electron-user-data/provider.json`。
- Codex 配置、会话与缓存使用 `.project-cache/codex-home`；Electron 用户数据使用 `.project-cache/electron-user-data`。
- 会话界面状态保存在本应用的 localStorage；不要提交本地运行数据或密钥。

## 代码入口

| 文件 | 职责 |
| --- | --- |
| `src/main.tsx` | 应用界面、会话交互与通知处理 |
| `src/codexClient.ts` | app-server 客户端调用 |
| `electron/main.cjs` / `preload.cjs` | Electron 生命周期及 IPC 桥接 |
| `electron/codex-server.cjs` | 项目 Codex 进程启动、配置与适配器连接 |
| `electron/minimax-adapter.cjs` | 模型协议转换；文件名保留历史命名，实际用于兼容渠道 |
| `electron/local-desktop.cjs` / `.ps1` | Windows 截图与原生输入 |
| `electron/remote-desktop.cjs` / `remote-setup.cjs` | noVNC 控制、远程环境准备与隧道 |
| `electron/artifacts.cjs` | 项目内产物读取与文件变更撤销 |
| `electron/task-scheduler.cjs` | 定时任务调度与运行记录 |

## 验证

在 `desktop` 目录执行：

```powershell
pnpm build
node --test tests/artifacts.test.cjs tests/tool-bridge.test.cjs tests/provider-registry.test.cjs tests/custom-provider.test.cjs tests/remote-setup.test.cjs
```

`tests/*-ui.cjs` 包含 Playwright 界面测试；部分旧用例需要随界面变化同步更新，不能将所有脚本视为已通过的验收结果。`local-desktop.cjs` 和远程桌面真实环境测试会操作实际桌面，请在适合测试的环境中运行。

## 相关说明

- [模型工具协议桥接](docs/minimax-tool-bridge.md)
- [插件与技能集成](docs/extensions.md)
- [定时任务](docs/scheduled-tasks.md)

这些专项文档可能保留早期实现说明；具体接口与行为以当前源码及测试结果为准。

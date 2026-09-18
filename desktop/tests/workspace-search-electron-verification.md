# 工作区搜索原生验收（2026-09-18）

目的：补齐近期搜索交互的 Electron 原生运行证据。通过 Playwright 启动真实 `electron/main.cjs`，加载 Vite 生产构建、真实 preload 和主进程 IPC，不替换 `window.desktop` 或搜索实现。

运行 `node desktop/tests/workspace-search-electron.cjs` 已通过：

- 原生 IPC 读取文件、返回 revision，目录范围名称搜索与内容搜索。
- 将临时项目写入独立原生配置，刷新真实界面并进入目录。
- UI 范围选择、全字匹配及大小写选项经过 IPC 生效，排除范围外和不匹配的结果。
- 方向键选择、Enter 打开，侧栏与展开预览定位同一匹配的列范围。
- 外部修改真实文件后，刷新展开预览显示版本变化提示并清除旧标亮。

首次运行暴露测试硬编码正斜杠的跨平台断言问题，已改用 `path.join` 并重新通过；无需产品代码修正。

测试使用临时工作区和 `FELIX_DATA_DIR`，关闭自身 Electron 后清理。仅覆盖文件搜索链路，不代表模型、其他桌面工具或整个应用的原生验收完成。

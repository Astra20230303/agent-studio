# 目录范围搜索验收（2026-09-18）

计划：以浏览器当前目录为唯一范围来源，接入已有后端的目录递归搜索；文件名和内容搜索共用范围选择；结果继续使用工作区相对路径；相同关键词重新提交也执行搜索。

交付行为：默认搜索整个工作区，可切换为当前目录及子目录。切换会退出预览、清除旧选择并重查已提交关键词。清除搜索返回当前浏览目录；返回父目录后范围随当前目录更新。内容搜索选项只随内容搜索请求发送。

已通过：

- `workspace-search-scope-ui.cjs`：通过浏览器桥接真实文件实现，验证两种搜索模式的范围切换、结果路径、选择清除、预览、同词重新提交捕获增删文件、父目录范围更新、递归子目录，以及目录被移动后的错误显示和恢复。
- `workspace-containing-folder-ui.cjs`：打开所在目录与失败恢复回归。
- `workspace-search-keyboard-ui.cjs`：方向键、Enter、选择清除回归。
- `node --test desktop/tests/workspace-files.test.cjs desktop/tests/workspace-content-search.test.cjs`：6 项通过。
- TypeScript 构建、Vite 生产构建和提交前 diff 检查通过。

UI 使用 `FELIX_TEST_URL=http://127.0.0.1:5329` 和无头 Edge。搜索范围 UI 验证连接真实文件函数；未覆盖 Electron 原生窗口与 IPC 端到端运行。

# 内容搜索选项交付（2026-09-18）

## 计划与范围

为已有内容搜索增加区分大小写和全字匹配。实现顺序为文件匹配器 → IPC 参数 → 界面状态 → 真实文件及 UI 验收。

两项默认关闭，仅用于内容搜索。选项变化重新读取当前已提交关键词，退出旧预览并清除结果选择。匹配始终使用原始文本，返回原有一基行号和 UTF-16 列号、文件 revision；继续遵守扫描、文件大小和结果数量上限。每行仍只返回第一个符合条件的匹配。

全字匹配将 Unicode 字母、数字、组合字符和下划线视为单词字符，不进行自然语言分词。关键词仍为字面量，不启用用户正则表达式。

## 验收证据

- TypeScript：`node desktop/node_modules/typescript/bin/tsc -b desktop`，通过。
- 生产构建：在 desktop 执行 `node node_modules/vite/bin/vite.js build`，通过。
- 主进程语法：`node --check desktop/electron/main.cjs`，通过。
- `node --test desktop/tests/workspace-content-search.test.cjs desktop/tests/workspace-files.test.cjs`，5 项通过，覆盖大小写、Unicode 边界、列号、字面量、参数校验及原有文件访问范围/数量上限。
- `workspace-search-options-ui.cjs`，通过：浏览器通过桥接调用真实 workspaceFile 和临时文件，验证结果变化、选择清除、预览行定位、文件名搜索保持原行为。
- `workspace-search-keyboard-ui.cjs`，通过：搜索结果键盘操作回归。

UI 使用无头 Edge，`FELIX_TEST_URL=http://127.0.0.1:5329`。真实文件搜索已验证，Electron 原生 IPC 运行链路本轮仅完成代码检查，未做原生窗口验收。

# 内容搜索多处命中验收（2026-09-18）

本轮将内容搜索从“每行一个结果”扩展为“每个非重叠命中一个结果”。结果包含一基行号、一基 UTF-16 列号、命中长度和搜索时的文件 revision；侧栏结果、文件预览和展开预览复用同一命中范围。

已验证：

- 同一行多处命中、CRLF、Emoji 后 UTF-16 列号及字面量匹配。
- 结果达到 200 项时停止扫描，长行命中顺序保持稳定。
- 键盘选择第二个同文件命中并 Enter 打开。
- 侧栏和展开预览精确标亮同一个命中，而不是整行。
- 预览查找、手动跳行和文件 revision 变化会清除旧搜索标亮/定位。
- 原有文件搜索选项、键盘搜索、文件预览回归通过。

验证命令：

- `node --test desktop/tests/workspace-content-search.test.cjs`
- `FELIX_TEST_URL=http://127.0.0.1:5329 node desktop/tests/workspace-search-occurrences-ui.cjs`
- `FELIX_TEST_URL=http://127.0.0.1:5329 node desktop/tests/workspace-search-options-ui.cjs`
- `FELIX_TEST_URL=http://127.0.0.1:5329 node desktop/tests/workspace-search-keyboard-ui.cjs`
- `FELIX_TEST_URL=http://127.0.0.1:5329 node desktop/tests/workspace-files-ui.cjs`
- `node node_modules/typescript/bin/tsc -b` 和 `node node_modules/vite/bin/vite.js build`（在 `desktop` 目录）

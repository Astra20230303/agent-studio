# 文件搜索 PageUp/PageDown 验收（2026-09-18）

结果键盘导航继续复用 `listing.entries`、`activeResult` 和 `focusResult`。PageDown/PageUp 在当前索引上分别加减 5，并将索引夹紧到 `[0, entries.length - 1]`；上下键仍保持首尾循环，Home/End 仍定位首尾，Enter 仍打开当前结果。

已通过：

- 文件名和内容搜索的 PageDown/PageUp 首尾夹紧。
- 结果按钮焦点、`aria-current` 高亮和滚动目标一致。
- 输入框编辑时的原生 Home/End 行为不变。
- 方向键循环、Enter 打开、刷新清除选择、文件预览回归。
- TypeScript 编译、Vite 生产构建和 `git diff --check`。

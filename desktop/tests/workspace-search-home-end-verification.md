# 文件搜索 Home/End 验收（2026-09-18）

结果导航继续以 `listing.entries` 的单一索引和结果按钮 ref 为状态锚点：Home 聚焦索引 0，End 聚焦最后一个索引；焦点、`aria-current` 高亮和滚动目标由同一 `focusResult` 完成。上下键循环和 Enter 打开沿用原有路径。

验收通过：

- 搜索输入框仍保留原生 Home/End 文本首尾定位，编辑关键词时不会跳结果。
- 结果按钮获得焦点后，Home/End 分别跳首项/末项，更新高亮并滚动到目标。
- 文件名和内容搜索均覆盖；方向键循环、Enter 打开、刷新清除选择回归通过。
- `workspace-files-ui.cjs`、TypeScript 编译、Vite 生产构建通过。

本功能没有改变结果排序、目录范围、搜索选项、revision 或打开文件路径。

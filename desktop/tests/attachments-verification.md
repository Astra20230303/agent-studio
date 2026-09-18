# 附件与用户补充输入验收（2026-09-18）

本轮静态复查以 `attachments.ts` 的 `attachmentInput` 为共享输入锚点：同一组路径经过普通发送、追加指令和排队发送，都必须保持去重顺序、图片 `localImage` 记录和非图片路径文本记录一致。

已通过：

- `node --test desktop/tests/attachments.test.cjs`：图片大小写扩展名、重复路径去重、插件/技能组合输入及非图片字面量路径。
- `node desktop/tests/attachments-ui.cjs`：附件选择、移除、发送失败保留、普通发送、追加指令和排队消息的实际输入记录。
- `node desktop/tests/user-input-ui.cjs`：阻塞/非阻塞问题、取消、重试、遮罩字段、队列及会话归属。

能力边界已写入 README：附件已接入 app-server 输入协议，模型对非图片文件的实际读取效果取决于渠道和可用文件工具；这不等同于把文件内容直接上传到模型服务。

# Project context audit verification

修正实现：`749c26b`。早期 `d993da0`、`c95f01b` 的 ID 脱敏结论无效：Electron 实际返回绝对路径作为项目 ID，而早期测试使用虚构的 `project-a` / `wt`。

本次证据：

- `workspace-ui.cjs`：模拟主进程实际数据形态（ID 等于路径），验证打开文件夹和选择已有项目均只记录动作，不记录详情；线程/回合 cwd 保持正确。
- `worktree-ui.cjs`：创建工作树使用路径 ID，项目审计仍无详情。
- `worktree-list-ui.cjs`：重新打开工作树使用路径 ID，等待完成后仅写一次事件；更新旧验收中已过时的“忙碌中可关闭”假设，验证当前关闭保护。
- `project-audit-redaction-ui.cjs`：历史 Windows 路径立即从显示和当前持久记录移除，保留事件 ID、时间和其他动作；写入失败提示与重试、重载均通过。
- `project-audit-ui.cjs`：取消/失败不写成功记录。
- `audit-log-ui.cjs`：搜索、清空和持久化回归通过。
- `renderer-storage.test.cjs`：9 项存储测试通过。
- 生产构建通过，仍有既有包体积警告。

范围：浏览器测试模拟 Electron 桥接，数据形态由 main.cjs 和 workspace-git.cjs 的实际返回值核对。历史清理通过现有存储接口执行，不保证安全擦除旧备份或外部副本。尚未宣称完整审计日志或全部 Codex 能力完成。
# 关联会话导航验收

实现提交：`f35874e`。

计划与行为：打开 Agent 会话后，显示已加载且未归档的关联来源会话。关联从 subAgentActivity、协作接收线程和 agentsStates 推导，同一来源仅出现一次。发送消息、等待等也会形成关联，因此 UI 不把这些来源声明为父会话。选择来源复用既有 selectThread，保留各会话草稿和恢复流程。

验证通过：

- `related-threads-ui.cjs`：多来源去重、无关/归档排除、草稿隔离、重载及 390px 窗口边界。
- `agent-activity-ui.cjs`：协议事件驱动的创建/交互记录生成关联入口，点击返回后原协作记录仍存在；历史恢复回归。
- `agent-controls-ui.cjs`：刷新、中断、断线和过期状态保护回归。
- `palette-conversations-ui.cjs`：既有会话切换和草稿回归。
- `agent-activity.test.cjs`：2 项协议归并/历史恢复测试。
- 生产构建通过，保留既有 bundle 体积警告。

边界：UI 使用当前已加载的会话记录，不额外扫描服务器全部历史，不声明完整的 Agent 拓扑；测试模拟 app-server 协议，不证明真实模型的协作执行质量。验收未发现需修改产品代码的问题。

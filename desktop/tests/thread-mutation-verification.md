# 会话变更一致性与归档审计验收

- Implementation commit: `3fdb40f`
- `node desktop/tests/archived-threads-ui.cjs`: passed.
- `node desktop/tests/offline-thread-mutations-ui.cjs`: passed.
- `node desktop/tests/audit-lifecycle-ui.cjs`: passed.
- `node desktop/tests/thread-fork-ui.cjs`: passed.
- `node desktop/tests/approval-ui.cjs`: passed.
- `pnpm --dir desktop run build`: passed.
- Verified archived restore records a lifecycle event; stale search results remain discarded. Offline remote archive/delete now shows a reconnect message and leaves local history and audit state unchanged; offline local-only archive remains available.
- Private static review confirmed remote mutations are gated before local state mutation, and lifecycle callbacks share the existing audit and thread state anchors.
- No correction was required after acceptance.

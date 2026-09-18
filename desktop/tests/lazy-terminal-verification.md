# Deferred terminal loading acceptance

- Implementation commit: `1961b09`
- `pnpm --dir desktop run build`: passed (`tsc -b` and Vite production build).
- `node desktop/tests/lazy-terminal-ui.cjs`: passed.
- Verified deferred terminal loading status, hide/reopen behavior, JavaScript failure, CSS failure, draft editing, and settings navigation isolation.
- Existing terminal runtime behavior remains covered by `desktop/tests/terminal-ui.cjs`; this acceptance did not alter PTY/session coordination.
- Static review: the error boundary owns only the lazy terminal subtree and reuses the existing `open`/`onClose` state, so it cannot reset chat state or create a second terminal session.
- No correction was required after acceptance.

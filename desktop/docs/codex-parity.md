# Felix capability roadmap

Updated: 2026-09-17. Target: practical Codex desktop workflows, using the existing
Electron/React app and Codex app-server. Model quality and hosted services depend
on the configured provider; UI parity alone cannot provide them.

Reference: https://developers.openai.com/codex/app/features
Protocol reference: codex-upstream/codex-rs/app-server-protocol/src/protocol/v2/.

## Baseline

Code inspection confirms real app-server streaming, tool activity, cancellation,
thread history/fork/archive, provider settings, extensions, scheduled tasks and
desktop/browser integrations. These require workflow acceptance, not replacement
with demo implementations. Root README and CODEX_DESKTOP_PLAN describe an older
prototype and are not the capability baseline.

## Delivery order

1. User questions: render all questions/options, free text and secret inputs;
   return protocol-correct answers; preserve pending requests and retry failures.
2. Turn lifecycle: per-thread running state, steering, queued messages,
   reconnect/recovery and reliable cancellation across thread navigation.
3. Planning: real collaboration mode, plan updates, review and implementation.
4. Workspace: real project selection, attachments, file tree, preview and terminal.
5. Git: working tree status, readable diffs, review comments and isolated worktrees.
6. Permissions: full command/file/permission decisions and MCP elicitation forms.
7. Extensions: verify skills, MCP and plugin discovery/install/auth/error recovery.
8. Automation: verify persistent scheduling, wakeup, run history and notifications.
9. Agent collaboration: expose supported child-agent lifecycle and results.
10. Release: Windows packaging, recovery, accessibility and end-to-end regression.

Each item may be split into independently usable features. Prefer existing
app-server protocol; modify codex-upstream only when a required capability is
missing there. Commit upstream edits there before updating the parent gitlink.

## Commit and acceptance procedure

- Record scope and acceptance before implementation.
- Run focused checks and commit each implemented feature separately.
- Review/test the committed feature, fix findings, then commit acceptance fixes
  and evidence separately. Do not manufacture empty fixes.
- After each deliverable passes its scoped acceptance checks, commit remaining
  acceptance evidence and push to the configured tracking branch immediately.
  Verify the remote commit and report any push failure; do not force-push.
- Stage only task-owned files; keep credentials and existing local work out.
- Distinguish mocked UI/protocol checks from live model and Electron acceptance.

## Feature 1 acceptance

- Multiple choice and free-text answers reach the correct question IDs using
  `{ answers: { questionId: { answers: [value] } } }`.
- Secret input is masked; blank answers cannot be submitted accidentally.
- Cancellation sends empty answer objects in the documented response shape.
- Concurrent requests do not overwrite one another; failed sends retain answers.
- Desktop and narrow viewport show all controls without horizontal overflow.

Status: feature 1 implemented. Later features remain pending.

Acceptance (2026-09-17): TypeScript and production build passed. Playwright in
headless Edge covers protocol payloads, multiple questions, secret masking,
queued requests, transport failure/retry, cancellation, custom options and
390px/1280px layouts. Acceptance exposed a stale question after
`serverRequest/resolved`; the follow-up fix removes that request from the queue.
Run: `node tests/user-input-ui.cjs` with Vite on port 5318 (or FELIX_TEST_URL).
Screenshots: `.project-cache/ui-checks/user-input-{desktop,mobile}.png`.
These are browser tests with a mocked Electron bridge; live model questioning
and native Electron interaction remain unverified.

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

## Feature 2a: concurrent turns and steering

Implemented: independent runtime per remote thread, turn start/completion event
handling, selected-thread interruption, `turn/steer` with `expectedTurnId`,
failed submission draft retention, and active-turn restoration on selection.
Runtime is not persisted as authoritative server state. History responses cannot
overwrite newer turn events. Missing threads report an error instead of silently
creating a new conversation and losing context.

Validation: production build, four runtime race tests, and browser tests with a
mocked bridge cover two concurrent conversations, cross-thread completion,
steering payloads/rejection, cancellation routing and resumed active turns.
Commands: `node --test tests/turn-runtime.test.cjs`,
`node tests/turn-lifecycle-ui.cjs` (Vite port 5318 or FELIX_TEST_URL).
Post-commit acceptance found that a late failed completion could mark a newer
running turn as failed. The fix keeps the historical error while preserving the
current running status. Expanded browser checks also pass stop failures, a
completion arriving before the start response, and disconnect control cleanup.
Production build and 15 focused runtime/message/tool/error tests pass.
The existing `sidebar-ui.cjs` suite stops at line 81: its `.sidebar-nav` selector
also includes the footer Settings button but expects only three navigation
buttons. Both selector and footer predate this feature (baseline 5e9f023);
the full sidebar suite is therefore not claimed as passing.

Still pending in phase 2: explicit next-turn queue, reconnect UI/backoff and live
Electron/model acceptance. No claim of full phase 2 completion.

## Feature 2b: thread drafts

Each thread has an independent persisted text draft. Switching threads and
creating/forking a thread retain the source draft. Successful sends clear only
the submitted text in its source draft, preserving edits made while waiting.
Browser acceptance covers separate drafts and refresh recovery. Plugin and
attachment draft persistence is not included in this increment.
Post-commit acceptance also passes a deferred send response after the user edits
the source draft and switches to another thread: both edited drafts survive and
the source thread retains its running state. No additional product fix was needed.

## Feature 2c: connection recovery

Automatic reconnect uses bounded retries (500/1500/3000 ms), followed by a manual
retry button. The banner reports offline/connecting state. Recovery resumes the
selected thread, retains drafts and never replays turn submissions. In-flight
handshakes are shared across StrictMode effects; renderer reattachment tolerates
an already initialized server. Closing an RPC releases its adapter and child.

Acceptance: production build; four focused tests in connection-recovery.test.cjs
and codex-server-recovery.test.cjs; reconnect-ui.cjs verifies exhausted retries,
manual recovery, automatic reconnect, active-turn restore and no message replay.
turn-lifecycle-ui.cjs also passes. Browser tests use a mocked Electron bridge.
The older shutdown.test.cjs main-process harness fails and leaves live handles;
its run was stopped. Its incomplete mocks do not validate the current desktop
startup path, so full shutdown/Electron acceptance remains pending.

Post-commit fault review found that repeated `closed` events during failed
handshakes could reset retry counts indefinitely. Recovery now retains the
current retry budget until connected or explicitly retried. Five focused tests,
the production build and reconnect browser acceptance pass after this fix.

## Feature 2d: next-turn queue

Running conversations offer “本轮完成后发送” alongside direct steering. Queued
messages retain model, effort and plugin selections; dispatch is FIFO per thread
and independent of the selected conversation. Entries can be cancelled. Failed
or interrupted predecessor turns pause the queue; rejected/unconfirmed sends
retain the entry for review and explicit retry. Reload and disconnect pause
persisted work, rather than automatically replaying uncertain requests.

Acceptance: production build, two queue state tests and turn-queue-ui.cjs cover
FIFO dispatch, cancellation, failed predecessor pause, rejection/retry and
persisted queue without automatic replay. Browser bridge is mocked; live model
and native Electron validation remain pending.

Post-commit queue acceptance reproduced an early-failure race: a completion
notification preceding the start response incorrectly released the next entry.
Runtime now retains bounded turn outcomes and releases only successful turns.
Manual stop immediately pauses pending work, even if the stopped turn races to
successful completion. Build, six focused queue/runtime tests, queue browser
acceptance and the conversation lifecycle browser regression pass.

## Feature 3a: planning workflow

Per-thread “先规划/直接执行” selects real app-server collaborationMode, using
built-in instructions (developer_instructions null). Active turns lock mode
changes; queued messages retain their chosen mode. Plan progress events render
step statuses and explanations. Completed proposed plans appear in the message
timeline and restore from history. “按计划执行” prepares an editable instruction
in execution mode; the user sends it normally.

Acceptance: build, planning.test.cjs and planning-ui.cjs verify protocol settings,
history restoration, live progress and the explicit transition to execution.
Browser checks mock the bridge; model adherence and native Electron are not yet
verified. Plan mode is an engine instruction mode, not a separate sandbox.
Post-commit review fixed stale progress across turn boundaries and protected
unsent drafts from the implementation shortcut. Browser acceptance now verifies
both cases; entering a new turn clears the prior progress panel.

## Feature 4a: real project directories

The project menu opens the native folder picker and creates a conversation bound
to the selected directory. New thread/turn requests use that cwd. Existing
conversations retain their own cwd; server resume restores it. Queued turns
capture the source cwd. Switching projects starts a new conversation rather than
retargeting an existing conversation. Build, workspace.test.cjs and mocked-bridge
workspace-ui.cjs pass folder selection, request cwd and persisted display checks.
Native folder-picker and model execution acceptance remain pending.
Post-commit acceptance fixes the project label/metadata to follow the selected
conversation rather than the global project. A remote thread without a known
root shows a neutral workspace label instead of falsely claiming Felix's root.
Browser regression switches back to a preexisting thread with another directory.

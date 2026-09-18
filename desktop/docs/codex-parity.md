# Felix capability roadmap

## Pause queued messages independently

Plan and implementation: a pause control freezes the selected conversation's
unsent queue without interrupting its active turn or reclassifying an in-flight
send. Pause persists through the existing storage layer, and completion events
cannot release paused entries. Explicit resume uses the current turn state.
Three queue unit tests, full chat pause/complete/resume acceptance and production
build pass; existing FIFO, edit, storage-failure and restore workflows also pass.
Post-commit full-chat acceptance explicitly counts turn/interrupt calls (zero for
queue pause) and reloads a manually paused queue. It remains paused with no replay
until resumed. The expanded browser workflow passes without further product edits.

## Edit queued messages

Queued instructions can now be edited in a modal. Opening first persists a paused
state so completing the current turn cannot dispatch the old text. Save changes
text only, preserving attachments, skills, model and ordering; sending items are
not editable. Failed persistence keeps the editor draft and offers retry. Saved
or cancelled edits require explicit queue resume. Full chat browser acceptance
checks storage failure/retry and the actual revised turn/start text; existing FIFO
and recovery flow and production build pass.
Post-commit acceptance verifies blank text cannot save without attachments/skills,
and cancelling a changed draft preserves the original persisted text in paused
state. The full queue browser flow passes with these additional checks. No product
correction was needed for these cases.

## Real child interruption acceptance

The real app-server fixture now holds a model-spawned child's response open,
reads its running turn through thread/read(includeTurns), interrupts that exact
turn and polls until the returned status is interrupted. No child thread/resume
is issued, matching the activity controls' request path. The parent is not
interrupted. Both normal child completion and interruption tests pass against
the real executable and local controlled model endpoint. This verifies execution
cancellation, not hosted model quality or native Electron UI behavior.

## Git path and stash safety correction

Audit found that the stash delivery removed literal pathspec protection from all
Git commands and used --all, which also removes ignored runtime files. Restore
literal pathspecs except for stash, which accepts no user-supplied pathspec in this
API. Use --include-untracked so ignored files stay in place. Real repository tests
verify bracket-name staging/diff/unstaging isolation and stash/restore with ignored
runtime data. Six focused Git tests pass. Earlier claims of safe explicit-path
operations did not cover this regression; this test now does.

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

## Feature 4b: attachments

PNG/JPEG/WebP/GIF paths are transmitted as app-server localImage inputs. Other
files become explicit quoted local path references for agent file tools; they
are not claimed as uploaded or embedded document content. Attachment-only input,
removal, per-thread persisted drafts, steering and queued sends are supported.
Successful sends clear submitted attachments, while rejected sends retain them.
Build, attachments.test.cjs and attachments-ui.cjs pass protocol and mocked-bridge
acceptance across ordinary, steering and queued requests. Actual file decoding
and model vision depend on app-server/provider support and remain unverified.
Post-commit acceptance fixes attachment draft ownership on the first send from
the welcome screen, preserves selections added while the picker is pending,
and displays attachment filenames in messages/queue entries. The browser test
now starts without an existing thread and verifies failure retention and labels.

## Feature 4c: workspace file browser

Toolbar file panel follows the conversation workspace. Supports directory/root/
parent navigation, refresh, bounded text and raster-image previews, and attaching
a selected file to the composer. Realpath containment excludes .git and paths
outside the selected root. Binary content and truncated previews are explicit.
Build, workspace-files.test.cjs (real temporary files) and workspace-files-ui.cjs
(mocked bridge) pass navigation, file reading, path boundaries and attachment.
Native Electron IPC end-to-end acceptance remains pending.
Post-commit acceptance adds explicit empty-directory feedback, navigable directory
links with realpath containment on access, and bounded image reads even if the
file grows during preview. Real junction/symlink tests verify internal navigation
and rejection of external targets.

## Feature 5a: Git status and diffs

Git panel reads the current workspace repository, branch and changed paths.
Staged and working changes have separate previews; untracked text is readable.
Porcelain NUL records preserve spaces and rename source paths. Git subprocesses
use argument arrays, bounded output/time and disable external diff/textconv.
Build, workspace-git.test.cjs (real temporary repository) and git-panel-ui.cjs
(mocked bridge) pass. This increment is read-only; staging, commits, worktrees
and native Electron integration are still pending.
Post-commit acceptance fixes untracked directories to list individual files,
and enables literal Git pathspecs so special filenames cannot select unrelated
paths. Real-repository tests include a nested untracked filename with brackets.

## Feature 5b: stage and commit

Git review supports explicit per-file stage/unstage and committing the staged
index with a user-entered message. Mutation controls prevent duplicate requests,
refresh status afterward and preserve input on failure. Git errors remain
visible. No automatic push or unstaged-file inclusion occurs from the commit UI.
Build, real-repository git-write.test.cjs and browser git-write-ui.cjs pass.
Post-commit acceptance reproduced an unborn-repository unstage failure after
additional edits. The no-HEAD path now forcibly removes only the cached entry;
the real-file regression verifies newer working content remains unchanged.

## Feature 5c: isolated worktree conversations

Git panel creates a named branch from HEAD under a sibling .felix-worktrees
directory and opens a conversation rooted there. Defaults to the codex/ branch
prefix. Existing dirty files remain in the source worktree. Build, real-repo
worktree.test.cjs and mocked-bridge worktree-ui.cjs verify isolation, branch
creation, duplicate/invalid branch errors and conversation binding. Removal and
merge/handoff workflows remain pending; no worktree is deleted automatically.
Post-commit review requires both branch and literal refs/heads validation, so
Git revision shorthand cannot silently change the requested branch identity.
Real-repository regression covers shorthand and option-like branch inputs.

## Feature 6a: reliable approval decisions

Command/file approvals support one-time, session, decline and cancel responses.
Command controls respect server availableDecisions. Extra permissions, network
context, cwd and source thread are visible. Submission is guarded against double
clicks, shows transport failures and permits retry without losing the request.
Build and approval-ui.cjs verify available choices, failure/retry, session choice
and permission denial payload. MCP forms and persistent policy amendments remain
pending; native/model approval flow is not yet verified.
Post-commit acceptance adds initial focus, Tab/Shift-Tab containment and wrapped
actions for narrow dialogs. Browser regression verifies focus cycling and a
390px viewport without dialog overflow; unsupported choice sets are explicit.

## Feature 6b: MCP form elicitation

MCP primitive forms render strings, numbers/integers, booleans and string enums.
Required fields, lengths and number bounds use browser validation; submissions
preserve JSON types and failed sends preserve entered values. Decline/cancel
return null content. Unsupported complex schemas remain explicitly unavailable
instead of sending an empty acceptance. Build and mcp-form-ui.cjs pass required
input, typed response and transport retry checks with a mocked bridge. URL-mode,
array enums and complex extension forms remain pending.
Acceptance correction: cf889f7 was pushed after a build pass but before the
browser test passed, because the new test had a syntax error. The follow-up fixes
that test and actually runs it successfully; the earlier browser-pass claim was
premature. This is a delivery-process defect, not evidence of live MCP validation.

MCP validation increment: Ajv plus ajv-formats validates the final response
against the requested schema before submission. Required properties, numeric
bounds/integer types, enums and date-time formats are covered by independent
tests, including false boolean values and non-finite numbers. Production build,
two schema tests and the MCP browser workflow pass. Electron remains at its
previous locked version; only validation dependencies were added.
Post-commit review releases temporary compiled schemas after each validation to
avoid accumulating form schemas across requests/retries. Tests additionally cover
invalid schema rejection and repeated independent constraints.

MCP choice increment: titled single choices and array choices now render selects
and checkboxes, preserving wire values independently of displayed titles.
Array size and membership constraints are validated before submission. Production
build, option unit tests, primitive browser regression and choice browser acceptance
pass. The browser uses a mocked bridge; live server integration remains unverified.
Post-commit acceptance fixes required arrays with zero selections and separates
empty-string enum choices from the unselected placeholder. Browser tests verify
both payloads and missing required selection; the build, five unit tests and both
MCP browser workflows pass after the correction.

## Feature 4d: integrated terminal

Scope: launch a real interactive shell in the selected conversation workspace,
render ANSI output with xterm, resize, retain the session while hidden, terminate
and restart, and release sessions at app shutdown. A single session is bound to
its initial workspace, displayed in the terminal header. Multiple tabs remain
pending. Windows uses PowerShell and node-pty's bundled ConPTY implementation.

Acceptance: production build passes. terminal-ui.cjs connects a real PTY to the
browser through a test bridge and verifies command input/output, hide/reopen,
resize, termination and restart, with desktop/mobile screenshots. The native
terminal-electron.cjs smoke verifies Electron loading, real shell output and shell
process death after close. Full production IPC lifecycle still needs acceptance.
Post-commit acceptance: terminal-ipc.cjs now exercises the production preload and
shared IPC handlers in a real sandboxed Electron window. It verifies shell IO,
invalid-directory rejection, navigation cleanup and window-close cleanup. Native
PTY shutdown is awaited before app exit; this fixes an observed abnormal exit
when the process stopped during native cleanup. Renderer crashes also close shells.
Real-shell UI acceptance additionally verifies Ctrl+C recovery and composer
visibility. Terminal assets load on demand; the main bundle is back below 500 KB.
Multiple terminals and project switching remain future work. The existing whole
app mobile layout remains cramped; screenshots only establish terminal framing.

Terminal tabs increment: up to eight independent terminal tabs retain their shell
and output while hidden. New tabs use the currently selected conversation's cwd;
existing tabs retain their original directory. Closing a tab releases only its
shell. Real PowerShell browser acceptance covers two isolated outputs, retained
session IDs and directory binding across conversation changes. Build passes.
Acceptance correction: a background session finishing startup no longer takes
focus. Tabs support arrow/Home/End navigation with a single tab stop. The real
shell browser test verifies keyboard selection/focus and recreating a terminal
after all tabs have been closed; production build passes again.

## Git review feedback

Diff rows can be selected for review. Comments become an editable conversation
draft including repository, file, staged status, old/new line number and code
context. Existing draft text is preserved. Nothing is submitted automatically.
Build, existing Git panel regression and git-review-ui.cjs pass with a mocked
desktop bridge, covering added/deleted line references and draft append behavior.
Acceptance correction bounds line references to the declared hunk lengths so
metadata or a truncated tail cannot acquire source coordinates. Three parser
tests cover multiple hunks, empty ranges and missing-newline markers. Browser
acceptance additionally asserts no turn starts when appending feedback. Build
passes with a bundle-size warning (main bundle slightly over 500 KB).

## MCP connection management

The extensions page now exposes paginated MCP inventory, runtime/auth state,
tool discovery failures and tool descriptions. OAuth login produces a system
browser link and completion notifications refresh inventory. Configuration reload
supports error reporting and retry. Requests carry the active remote thread ID.
Production build, URL scheme validation and mocked browser acceptance pass for
pagination, OAuth handoff/completion and reload failure/retry. Third-party OAuth
and live MCP server connectivity are not yet end-to-end verified.
Acceptance correction separates inventory loading from action busy state and
ignores stale OAuth responses after completion or context changes. Links clear
when connection/thread context changes. The browser test now delivers completion
before the login response and verifies the old link does not reappear. Build and
the expanded MCP workflow pass; bundle-size warning remains.

MCP URL elicitation: URL requests show the source and full address, open an HTTP(S)
link through the system browser, and require explicit confirmation before sending
accept with null content. Decline/cancel remain available for invalid URLs.
Build and mocked browser tests pass open failure/retry, response failure/retry,
invalid scheme rejection and all three response actions. Opening the browser is
not treated as proof of remote workflow completion. Live server flow is pending.
Acceptance correction adds initial focus, keyboard containment and focus return.
Browser checks verify forward/backward Tab cycling around enabled controls and
dialog bounds at 390px. Build and the URL workflow pass after the correction.

## Agent collaboration records

Collaboration tool lifecycle items now survive live updates and history restore.
The transcript shows operation, task, model and last-known child status/result,
separately from tool-call completion. Child links select or create a local thread
entry and resume the actual remote child conversation. Build, two state/history
tests and mocked browser navigation acceptance pass. Model-driven spawning and
newer SubAgentActivity events remain unverified/unimplemented respectively.
Acceptance adds long identifier wrapping in child navigation controls and verifies
completion result updates replace the existing call record without duplicates.
The expanded browser workflow and build pass at the supported 960px window width.

## Automation workspace binding

Agent tasks now persist an optional absolute cwd, default new tasks to the active
workspace, allow folder selection/editing and show the directory in task detail.
Legacy tasks retain the Felix project default. Runner validates directory existence
and uses it for process launch and thread/start. Scheduler tests and the real
app-server integration pass with a controlled local model endpoint, asserting the
workspace in model context and persisted state. Relative file reading was rejected
by app-server policy, so actual project file access remains unverified. Existing
allowed shell execution and cancellation pass. Full scheduler-backed browser
workflow passes after correcting a multi-dialog test wait and narrow titlebar
overflow; production build passes with the existing bundle-size warning.
Post-commit acceptance rejects non-string workspace values and verifies missing,
relative and file paths fail before credentials or child startup. Write-permission
confirmation now names the saved task directory. All 15 scheduler/runner tests,
including real app-server context and cancellation checks, and build pass.

## MCP and dynamic tool records

Tool lifecycle/history now preserves MCP and dynamic calls, arguments, structured
results, duration and errors. Transcript details distinguish transport/tool failure
from successful completion, including dynamic success=false and MCP isError.
Build, two state/history tests and mocked browser lifecycle acceptance pass.
Results currently use a structured text view; rich MCP app/media rendering remains
pending, as does live tool-provider end-to-end acceptance.
Acceptance correction distinguishes explicit null from an omitted field when
merging tool updates, so cleared errors/results do not linger and null arguments
remain visible as null. Three state/history tests, browser workflow and build pass.

Tool media increment: text blocks render directly, raster image and audio blocks
offer native previews, and structured results remain expandable. MCP base64 and
dynamic data/HTTPS media are supported; executable schemes, SVG and oversized
inline payloads are not previewed. Build and parser tests pass; browser acceptance
decodes an inline PNG and verifies unsupported-media fallback. Live provider media
and audio playback remain unverified; MCP apps/resources are still pending.
Acceptance correction scopes media failure to its source so a replacement image
can render, and serializes structured output only when expanded. Browser acceptance
verifies invalid PNG followed by a valid replacement; build passes.

## Thread inventory pagination

Sidebar inventory now consumes thread/list cursors through explicit load-more and
retry controls, deduplicates pages, preserves existing local records and sorts by
pin/recency. Connection generations ignore stale list responses. Build and mocked
browser tests pass pagination, failure/retry, deduplication and order. Search still
covers loaded threads only; remote search and archived inventory remain pending.
Acceptance correction tolerates invalid list timestamps/entries and rechecks the
connection generation inside the state merge. Pagination and existing reconnect
browser regressions pass, including draft retention and no replay; build passes.

Archived conversations now have a native modal inventory, pagination, refresh and
unarchive action. Local-only records can be restored without a server request;
remote restoration updates local visibility only after success and retains local
messages. Build and mocked browser acceptance pass pagination, deduplication,
restore failure/retry and history preservation. Live server acceptance remains.
Acceptance correction keeps server-archived records visible when local cache still
says active, while retaining local metadata. The browser test reproduces this
disagreement and restores the record without duplication; build passes.

Live archive acceptance found two protocol mismatches missed by mocked tests:
ThreadSortKey uses recency_at, not recencyAt; omitted modelProviders filters by
the server default provider and can hide MiniMax conversations. Both active and
archive client requests now use recency_at and modelProviders: []. The isolated
real app-server test completes two turns through a local controlled model endpoint,
archives them, pages inventory, restores and resumes, and exercises the actual
frontend list/unarchive functions. It passes together with both browser suites
and build. Empty threads have no persisted rollout until a turn is recorded and
cannot be archived on this server; the UI reports that server error.

Live history/fork acceptance extends the same isolated app-server fixture to the
frontend listThreadTurns, listThreadItems and forkThread functions. It verifies
user/final reply content, single-item cursor traversal equivalence, fork-at-turn
content and unchanged source history. The real binary passes all checks using a
controlled local model endpoint. No product correction was required for these
interfaces. This does not establish live provider quality or full desktop UI flow.

Remote title search: sidebar queries thread/list searchTerm after a 300ms debounce,
restarts pagination when the query changes and discards outdated responses. Local
title matches remain available and server matches include unloaded conversations.
Real app-server acceptance verifies matching and empty results; browser acceptance
checks delayed stale responses and clearing search. Build passes. This is title
substring search, not conversation-body full-text search.
Acceptance correction includes debounce time in loading state and suppresses
empty-result text until loading finishes. Expanded browser acceptance and build
pass, avoiding a misleading empty state while the remote query is pending.

Startup loading increment: MCP form/schema validation loads on demand, reducing
the main production bundle from about 517 KB to 386 KB (gzip 121 KB); the 132 KB
form chunk is separate. Build no longer reports the 500 KB warning. A loading
dialog and error boundary retain the approval workflow on chunk failure, including
cancellation retry. Primitive/multiple-choice workflows and injected chunk-failure
browser acceptance pass. These size results are not startup-time measurements.
Post-commit acceptance serves the actual production dist on an isolated local
server. It asserts no form-chunk request on startup, a request on elicitation,
recoverable chunk failure, and successful form loading/submission after reload.
No further product correction was necessary; this verifies the packaged chunk
boundaries rather than relying solely on Vite development behavior.

## Live MCP transport acceptance

`node tests/mcp-live.test.cjs` launches the project app-server with an isolated
CODEX_HOME and two local stdio MCP fixtures. It verifies single-entry inventory
pagination, tool schema and authentication fields, direct thread-scoped calls,
text and structured results, tool errors followed by successful recovery, runtime
connection state, and inventory changes after config/mcpServer/reload. The real
binary passes; no product protocol correction was required. This covers direct
RPC tool transport, not model-selected tool execution, external OAuth providers,
or MCP apps/resources. The existing MCP page browser regression also passes.

## MCP resource browser

The MCP page now offers an optional full resource inventory, named resource reads,
template discovery and a URI field for parameterized resources. Text is rendered
literally; blobs use the existing restricted image/audio renderer and structured
fallback. Read failures can be retried. Refresh, connection changes and thread
changes invalidate pending reads. Build and browser acceptance pass discovery,
read retry, custom URI and literal HTML handling. The real project app-server test
also verifies resource/template inventory and reads with and without a thread ID.
Interactive MCP apps, template parameter forms and attaching resources to chat
remain pending.
Post-commit resource acceptance delays a read until after inventory refresh,
asserts that the old result stays discarded, then successfully reads a fresh
resource. The expanded browser regression passes without a product correction.

## Resource snapshots in chat

Read text resources can now be appended to the current conversation draft. The
snapshot includes server, returned URI, MIME type when supplied, and exact text
as JSON. Existing draft text is preserved and the app returns to chat without
sending. Build and browser acceptance verify provenance, literal content and the
complete snapshot reaching turn/start only after explicit submission. Binary
resource attachments and automatic live reference refresh remain pending.
Post-commit acceptance changes the URI field after reading and verifies that the
snapshot retains the returned resource URI. It also reloads the renderer before
submission and verifies exact draft persistence and turn input. Both pass without
further product changes.

## Draft storage failure recovery

Draft persistence now catches local storage write failures, retains editable
in-memory drafts and shows a persistent warning with explicit retry. Successful
writes clear the warning. Build and injected browser quota-failure acceptance
verify retained text, successful retry, continued turn submission and no uncaught
renderer errors. This does not increase the local storage quota or guarantee
persistence while storage remains unavailable.
Post-commit acceptance also verifies automatic recovery on the next edit after
storage becomes writable. The full MCP resource browser/draft browser regression
passes, including reload persistence and explicit turn submission.

## Workspace-scoped extension discovery

The extension page now discovers plugins and skills using the effective chat
workspace (thread cwd, then selected project, then application-root fallback),
instead of always querying the application repository. Build and browser tests
pass all three directory cases. The existing isolated real app-server extension
test also passes plugin install, discovery, skill enable/disable, restart
persistence and uninstall. Model use of installed skills remains separate work.
Post-commit live acceptance creates different .agents/skills entries in two
isolated projects and verifies that each skills/list request discovers its own
skill while excluding the other project's skill. The process restart test now
waits for child exit before starting the replacement. All assertions pass.

## Explicit skill selection

Installed enabled skills can be selected from their detail dialog for the current
chat. Skill drafts persist per conversation, deduplicate by path and support
removal. Start, steer and queued turns now carry structured skill inputs with
name and SKILL.md path. Skill-only messages are sendable and successful submission
clears the selected draft. Build, existing attachment tests and browser acceptance
pass selection, deduplication, reload persistence, exact turn/start input and
cleanup. Live model consumption of the skill and history restoration remain to
be accepted separately.
Acceptance corrections restore structured skill references from user-message
history and display selected skills in the queue. Expanded browser acceptance
verifies exact skill inputs for turn/steer and automatic queued turn/start;
history restoration tests and build pass. Live model consumption remains pending.

Live skill transport acceptance now runs the actual frontend userInput helper
against the project app-server with an isolated project skill and a controlled
local model endpoint through the MiniMax adapter. It asserts that a marker found
only in SKILL.md's body reaches the model request, the turn completes, and actual
thread/items/list history restores the skill name/path through restoreMessages.
`node --test tests/skill-live.test.cjs` passes. This proves skill loading and model
transport, not instruction-following quality of an external model provider.

## Git remote operations

The Git panel shows configured upstream and ahead/behind counts, fetches remote
refs and pushes the current HEAD to the configured remote branch without force.
Missing upstream and detached HEAD cannot push; errors remain visible for retry.
Build, real local bare-repository tests and browser acceptance pass different
local/upstream branch names, successful push, fetched divergence, rejected
non-fast-forward push, missing upstream and retry. Counts reflect locally known
remote refs until fetched. First publication, pull/merge UI and authenticated
network-provider integration remain pending.
Post-commit acceptance sets push.default=matching and advances an unrelated local
branch; the explicit upstream push leaves that remote branch unchanged and
preserves dirty working files. The existing Git line-review browser regression
also passes. No product correction was needed for these cases.

## Publish new Git branches

Branches without an upstream now offer a configured-remote selector and explicit
publish action. Publishing uses the same remote branch name and sets upstream
tracking through a non-forced push. The backend validates the expected current
branch, configured remote, existing HEAD and lack of upstream before publication.
Build, browser and real bare-repository acceptance pass remote selection,
published commit identity, persisted upstream, stale branch rejection, detached
HEAD rejection and existing-upstream rejection. Remote creation/configuration and
pull/merge UI remain pending.
Post-commit acceptance attempts to publish a divergent same-name remote branch.
Git rejects the publication, preserves the remote commit and leaves upstream
unset. The real-repository regression passes without further product changes.

## Fast-forward Git pull

The Git panel can fetch its configured upstream and fast-forward the current
branch, with updated/already-current feedback and retryable errors. It checks
branch identity and HEAD again after fetch and disables automatic stashing.
Build, browser and real-repository tests pass different upstream branch names,
successful updates, already-current results, stale branch rejection, dirty-file
protection and divergence rejection without rewriting commits. Merge/rebase and
conflict-resolution workflows remain pending.
Post-commit real-repository acceptance also verifies missing-upstream and detached
HEAD rejection and preservation of an unrelated staged file during a successful
fast-forward. All checks pass without additional product changes.

## Git conflict assistance

The Git panel recognizes all seven unmerged porcelain statuses, distinguishes
them from staged changes, blocks commits with unresolved index entries and offers
an explicit conflict-assistance draft containing workspace, branch and quoted
file paths. Existing draft text is preserved and nothing is submitted automatically.
Build, browser and real merge tests pass conflict identification, commit rejection,
draft handoff, staging resolved content and completing a two-parent merge commit.
This is an assistance entry point; automatic resolution and merge/rebase controls
remain pending.
Post-commit acceptance additionally creates a real modify/delete conflict,
resolves it by deleting the file, stages through the same action and completes
the merge. The index has no remaining conflicts and the file is absent from the
resulting commit. No product correction was required.

## Conflict version inspection

Opening a conflicted file now shows its index stages: common base, current side
and incoming side, with a rebase-specific explanation. Missing stages are explicit;
binary blobs and blobs over 512 KB show a fallback, and submodule stages show the
commit ID. Content is read by object ID, without external diff/textconv execution.
Build, real merge tests and browser acceptance pass exact stage text, deleted-side
absence and literal HTML rendering. Version editing and automatic choice of a
side remain pending.
Post-commit acceptance inserts real binary and oversized objects into unmerged
index stages and verifies fallback responses without text content. Browser
acceptance also verifies failed reads followed by explicit successful retry.
Both pass without further product changes.

## Sub-agent lifecycle records

Felix now retains and renders the upstream subAgentActivity item alongside older
collabAgentToolCall records. Started/interacted/interrupted/completed events show
the agent path and open the child conversation. Activity kind is independent of
item/completed delivery, so a started event does not appear as a finished task.
Build, reducer/history tests and browser acceptance pass all four event labels,
deduplication, child navigation and parent-record retention. Actual model-driven
multi-agent lifecycle acceptance remains pending.
Post-commit browser acceptance reloads the renderer, restores subAgentActivity
from thread/resume history and opens its child thread. It verifies one restored
record and passes without further product correction.

## Real multi-agent transport

Controlled-model acceptance with the real project app-server and multi_agent_v2
enabled exposed an adapter failure: child requests contain agent_message items,
which were rejected before reaching the provider. The MiniMax adapter now maps
agent messages to user-role context, preserving author, recipient and ordered
payloads. For this plain Chat Completions transport, upstream's encrypted_content
field carries the provider's plain tool-argument message; no decryption is added.
The real test now spawns a child, observes started/completed activities, resumes
the child result and restores parent history. All 14 adapter tests pass. External
provider reasoning quality and genuinely encrypted cross-provider histories are
not established by this controlled test.
Post-commit live acceptance now makes the parent call wait_agent and asserts the
child result arrives in the parent's next model request with correct sender and
recipient. It then waits for the parent turn to finish and verifies its final
response in history. The full spawn/wait/result/summary round trip passes. A
parent that already ended its turn is not immediately called again solely by
the child completion notification in this fixture.

## Context usage and manual compaction

The composer shows last reported token usage against the model context window,
with cumulative usage separately disclosed. Valid usage notifications persist on
their owning thread. A manual compact action requests thread/compact/start and
reports acceptance rather than claiming completion; requests are disabled during
active turns. Build and browser tests pass usage display, request parameters,
failure/retry and turn lifecycle guards. Actual compaction through the model
adapter, completion feedback and precise provider context accounting remain to
be verified.
Post-commit browser acceptance verifies that another thread's usage and invalid
negative counts do not overwrite the current display. A missing context-window
limit shows the count without inventing a percentage. These checks pass.

Real manual compaction acceptance now completes a turn, requests compaction and
continues the conversation through the actual app-server and MiniMax adapter with
a controlled model endpoint. It verifies contextCompaction start/completion and
the generated summary appearing in the next model request. The UI now retains
these items and renders running, completed, failed or interrupted compaction
records. Build and browser acceptance pass. Summary quality with an external
provider remains unverified.
Post-commit acceptance restores real thread/items/list history and verifies one
completed compaction record. Browser tests terminate separate compaction turns
as failed and interrupted and verify distinct labels without false completion.
These checks pass; failure notifications in this browser test are simulated.

## Send shortcut settings

Keyboard settings now offer Enter or Ctrl/Command+Enter to send, including turn
steering. The preference persists across reloads, defaults to Enter and normalizes
invalid saved values. Shift+Enter remains newline and existing IME guards remain.
Build and browser acceptance verify changing the setting, persistence, plain
Enter inserting a newline and Ctrl+Enter sending the exact multiline draft.
Post-commit browser acceptance switches back to Enter, verifies Shift+Enter
newlines and blocks submission during a simulated composition session. Native
IME interaction and macOS Command-key behavior still need platform acceptance.

## New-conversation permission settings

Settings now replace decorative permission switches with the same three real
choices used by the composer. Descriptions reflect read-only/on-request,
workspace-write/auto-review and unrestricted/no-approval configurations and
explicitly state that these defaults apply to newly created remote threads.
Build and browser acceptance verify all three choices, persistence, composer
consistency and exact thread/start sandbox/approval/reviewer fields. These tests
verify client configuration, not enforcement of each permission by the server.
Post-commit live acceptance starts the real app-server with each of the three
profiles through the production frontend client, including its omitted-permission
default. Assertions inspect the returned sandbox type, approval policy, reviewer,
workspace and restricted-profile network access; workspace-write must return
auto_review. Thread/read additionally checks thread identity and workspace.
On Windows the fixture runs both without sandbox configuration and with
windows.sandbox="unelevated": the former returns readOnly for workspace-write,
while the latter returns workspaceWrite. Both cases are asserted explicitly.
The requested default is not necessarily the effective thread permission when
Windows sandbox setup is absent; Windows sandbox setup still needs work.
This verifies effective protocol configuration rather than executing a model
tool under each policy or proving automatic review decisions.

## Effective thread permissions

The composer now displays the actual sandbox and approval reviewer returned by
thread/start, thread/resume and thread/fork. Missing response fields display an
unknown state instead of assuming the global default. The permission menu labels
its choices as new-thread defaults and shows the existing thread's approval policy.
When a requested workspace-write thread returns readOnly, a persistent notice
explains the downgrade and possible Windows sandbox or server-policy causes.
Build and browser acceptance cover actual response display, downgrade visibility
and changing defaults without relabeling or recreating an existing thread.
Post-commit acceptance also covers restored permissions, missing response fields
and resume failure. Restoration clears cached effective permissions before the
request so failure cannot leave an old full-access label presented as current.

## Change current-thread permissions

The permission menu now separately offers current-thread changes while idle and
connected. It sends sandbox, approval policy and reviewer together through
thread/settings/update, then waits for thread/settings/updated before reporting
effective permissions. Sending is blocked while confirmation is pending; RPC
rejection, disconnect and a 15-second confirmation timeout surface an error.
Notifications update the matching thread even when it is not selected.
New-thread defaults remain unchanged. Real app-server acceptance switches an
existing thread through all three profiles in both Windows fixture modes and
checks the returned settings notification. Browser acceptance verifies pending
state, unrelated-thread isolation, rejection and default preservation. These
tests establish configuration changes, not Windows sandbox tool enforcement.
Post-commit acceptance verifies confirmation timeout, disconnect, RPC rejection,
notification-before-ack ordering, temporary listener cleanup and disabling changes
during a running turn. A controlled model reply creates a persisted rollout so
real thread/resume can confirm each updated permission profile; empty threads
cannot be used for that check. Restart persistence and tool enforcement are not
established by this resume check.

## Settings navigation and search

Settings now routes to five implemented categories: general, permissions,
provider configuration, keyboard shortcuts and computer control. Placeholder
categories that previously repeated general settings are removed from this
navigation; their missing capabilities remain part of the parity backlog.
Search matches category names and setting keywords with case-insensitive,
whitespace-separated terms, routes to matching content, and supports empty
results, explicit clear and Escape. Permissions have a dedicated section.
Build and browser acceptance cover routing, Chinese/English queries, no results,
clear/Escape and preserving permission and shortcut changes across searches.
Post-commit acceptance checks 960px/1280px desktop layout and dark settings
backgrounds, plus the existing shortcut workflow. Screenshot inspection removed
duplicate native/custom search-clear controls and corrected dark navigation
selection colors. Provider inputs retain their existing horizontal text scrolling.

## Conversation and settings storage failures

Main state persistence now reports write failures without throwing through React.
Thread creation and message helpers mutate memory only; the application effect
saves committed state. A global warning remains visible in settings and chat,
with retry saving the latest in-memory snapshot. Build and browser fault injection
verify quota failures, theme changes, creating/sending a conversation and recovery
without renderer errors. Unsaved data still cannot survive closing the app;
this is failure recovery, not a larger-capacity storage migration.
Post-commit acceptance repeats the failure after manual recovery, verifies the
next state change automatically saves all pending changes, then reloads to check
the saved theme, permission default and conversation text survive.

## Attachment draft storage recovery

Attachment draft writes now catch storage errors, retain in-memory selections and
show a global warning with retry. Empty draft entries are removed, so a successful
retry persists removal of consumed attachments. Malformed top-level storage values
are ignored. Build and quota-injection browser acceptance cover editing, rejected
sends, attachment-only sends, steering, queued sends and clearing stale storage.
Until saving succeeds, refresh may restore an older attachment selection, which
the warning explicitly explains.
Post-commit acceptance reloads after recovery to ensure sent attachments do not
reappear. It also verifies automatic saving on the next edit after storage
recovers, then reloads again to confirm only the remaining selection is restored.

## Conversation Markdown export

Idle conversations can be exported to Markdown. Connected remote threads fetch
every thread/items/list page; failures abort instead of silently exporting a
partial transcript. Offline/local exports explicitly identify their loaded-only
scope. Messages preserve Markdown, attachment/skill references remain structured,
and tool or unknown items retain their raw records in safe-length code fences.
Desktop uses a native save dialog; browser development uses a Blob download.
Build, browser pagination/failure acceptance and filesystem tests verify content,
UTF-8 writes, cancellation and write errors. Attachments are referenced, not copied;
live/running exports are disabled and cross-client snapshot isolation is not proven.
Post-commit acceptance verifies local-only content and disk-error feedback.
Local/offline export now has an explicit button label, and Windows reserved
device filenames are prefixed to make the proposed save name valid.

## Find within a conversation

Conversation find matches loaded message text, attachment/skill paths and tool
records, without case sensitivity. Results are counted per record and cycle with
buttons or Enter/Shift+Enter. Ctrl/Meta+F opens the search; Escape closes it and
returns focus. The selected record is outlined and scrolled into view, with tool
details expanded. Auto-follow pauses while a query is active. The UI explicitly
limits scope to loaded records; fetching/searching unloaded history remains work.
Build and browser acceptance cover text, tool output, attachment paths, cycling,
keyboard navigation, no results and close focus.
Post-commit acceptance adds a long transcript and injects a streaming response:
the selected tool record keeps its scroll position. Starting a new conversation
clears the search field and outline. The first new-thread check used an obsolete
button name and was corrected to the current UI label before passing.

## Load history for conversation search

Connected idle threads now offer explicit full-history loading in conversation
find. All item pages are fetched before replacing displayed messages; failures
leave the existing transcript intact. Sending is blocked while fetching, and
thread switches or new runtime activity invalidate the result. The shared
pagination reader also serves Markdown export. Build and browser acceptance
verify finding a previously unloaded reply, failed reload preservation and export
regression. Unknown item types remain available in export but are not rendered
or searched by the existing message renderer.
Post-commit acceptance holds a history request, switches to a new conversation,
then releases both pages and verifies the new conversation remains empty.

## Code-block copy and fence correctness

Code blocks report successful copy and clipboard errors, support retry and discard
stale completion feedback when streamed code changes. Markdown fences now support
backticks or tildes and require a matching closing marker of sufficient length;
shorter markers inside a block remain code. Unclosed streaming blocks still render.
Build and browser acceptance verify nested fences, Unicode/special characters,
multiple independent blocks, clipboard rejection and exact copied text.
Post-commit acceptance delays clipboard completion while a code block streams
additional lines, verifies stale success is suppressed and copies the new content.

## Return to latest message

Scrolling away from the bottom exposes a return-to-latest button. It closes
conversation find, returns to the bottom and resumes following streamed replies.
The follow effect runs during layout to avoid scroll events mistaking newly
grown content for a user scroll. Build and long-transcript browser acceptance
verify search-to-latest navigation and following a newly streamed long reply.
Post-commit acceptance also scrolls upward manually, injects another reply and
verifies the reading position is preserved before returning to the bottom again.

## Copy tool details

Expanded command records offer separate command/output copy controls; MCP and
dynamic tool records expose argument, result and error copies. Structured values
use formatted JSON, while strings preserve their original whitespace. These use
the same failure/retry and stale-feedback handling as code blocks. Build and
browser acceptance verify long Unicode output, exact newlines, MCP fields,
clipboard rejection recovery and code-block regression.
Post-commit acceptance confirms an empty-output command exposes only command
copy and does not overwrite the clipboard with an empty log.

## Forward-compatible conversation records

Items without a dedicated renderer now appear as expandable raw records rather
than disappearing. Lifecycle updates merge by item ID, preserve fields omitted
from completion events and retain their turn association. Raw records can be
copied and searched alongside other tool records. Text and plan messages retain
their dedicated paths. Build, browser acceptance and existing tool-history tests
verify live/history display, merged fields, copy and search. This fallback does
not replace dedicated views or interpret unknown operations.
Post-commit acceptance verifies restoration merges omitted fields, keeps turn
identity and avoids duplicating user/assistant/plan messages as raw records.

## Web-search activity view

Server webSearch records now display search queries, open-page and find-in-page
actions, result titles and snippets, with raw records retained for unfamiliar
result fields. Only HTTP(S) URLs without embedded credentials become links.
Desktop links use the existing external-browser bridge and report opening errors.
Build and browser fixtures verify restored results, live find-in-page actions and
raw-field retention. This adds presentation for upstream records; the current
MiniMax MCP search transport remains unchanged.
Post-commit acceptance covers external-browser rejection and successful retry,
including clearing the previous error without losing the search record.

## Conversation system notifications

Desktop notification settings persist in the isolated Electron profile and
independently control completed, failed and input/approval events, plus background
only delivery. Defaults are off; scheduled tasks retain their per-task policies.
The main process observes RPC events, deduplicates them and focuses the app when
notifications are clicked. Bodies contain generic status rather than conversation
content. Build, service tests and browser settings acceptance cover persistence,
event filtering, focus suppression, duplicate events, failed save and retry.
Native OS toast delivery/permissions still require desktop acceptance; clicking
currently focuses the application without selecting the originating thread.
Post-commit acceptance resets deduplication on a new RPC connection so reused
request IDs can notify again, verifies write failures retain active preferences,
and confirms OS delivery errors do not disrupt conversation event handling.

## Notification conversation navigation

Clicking a conversation notification now emits its thread ID through preload and
selects that conversation in chat. Existing local records and drafts are reused;
unknown IDs create one local entry and use normal server resume. Archive state
is preserved. Build and browser bridge acceptance cover settings-to-chat routing,
restoration, repeated clicks, retained drafts and one subscription under StrictMode.
The native OS click itself remains outside this browser fixture's coverage.
Post-commit acceptance rejects empty/non-string navigation payloads and confirms
notification routing does not send a turn or unarchive a remote conversation.

## Follow system theme

General settings offer system/light/dark appearance. System selection follows
prefers-color-scheme changes without overwriting the saved preference, while
manual selections remain fixed. The resolved theme also sets the document color
scheme for browser controls. Build and browser media-emulation acceptance verify
live changes, reload persistence, manual override and returning to system mode.
Native Windows appearance toggling remains outside this emulated test; terminal
colors currently retain their dedicated dark palette.
Post-commit acceptance verifies invalid persisted themes fall back to light;
settings search and storage-failure recovery browser regressions also pass.

## Workspace filename search

The file panel now searches nested filenames and relative paths case-insensitively.
Results open in the existing preview/attachment flow and retain the query when
returning to the result list. Search skips .git and symlinks, bounds traversal at
20000 entries and 200 matches, and reports truncation or unreadable directories.
Build, real-filesystem tests and browser acceptance cover nested Unicode paths,
limits, workspace boundaries, preview, empty results and clearing the query.
This is filename/path search, not file-content indexing.
Post-commit acceptance verifies directory junctions/symlinks cannot broaden the
search outside the workspace. Each queued directory is re-resolved before opening
to reject redirected paths; concurrent filesystem replacement is not an atomic
snapshot guarantee.

## Workspace text editing

Complete UTF-8 previews up to 256 KB can open in a modal editor with save,
copy and confirmed discard. Saving checks the original content hash, stages a
same-directory temporary file, rechecks the target and renames it into place.
Conflicts preserve the editor buffer; truncated/binary/invalid-UTF-8 previews
do not offer editing. Build, filesystem and browser acceptance cover UTF-8 writes,
external changes, path boundaries, conflict feedback, retry and cancellation.
The hash checks are optimistic, not a cross-process lock: another writer can
still race between the final check and rename. A full IDE editor is not provided.
Post-commit acceptance covers CRLF files: editing normalizes the textarea view
but saving restores consistent original CRLF line endings. Unchanged buffers
remain clean; mixed line-ending files normalize to LF when edited.

## Reload after file editing conflicts

The editor can reload the current disk version after confirming discard of dirty
edits. A successful reload updates the baseline content, hash and line-ending
preference together; a failed read retains the entire buffer. Build and browser
acceptance cover canceled discard, read failure, successful reload and subsequent
save using the new hash rather than the stale revision.
Post-commit acceptance changes the disk response to binary and truncated text;
both reloads retain the dirty buffer and report why editing cannot be refreshed.

## File editor keyboard controls

Ctrl/Meta+S saves through the same revision-checked write flow. Tab inserts two
spaces or indents selected lines; Shift+Tab removes a leading tab or up to two
spaces. Ctrl/Meta+M switches Tab back to focus navigation, with visible status.
Save/reload share an immediate operation lock to reject overlapping actions.
Build and browser acceptance cover multiline indentation, focus escape and
shortcut save using the current revision and line endings.
Post-commit acceptance verifies newline-boundary selections, leading tabs/spaces,
empty first lines and caret insertion. A delayed save confirms repeated Ctrl+S
does not send a second write while the first request is pending.

## File editor navigation isolation

Editing sessions now live at application scope with the original workspace,
relative path and revision captured when opened. Notifications that switch the
active workspace no longer unmount the editor or retarget its save operation.
The original workspace is displayed in the dialog; preview updates are scoped
to the same root/path. Build and browser acceptance switch via the notification
bridge during an unsaved edit, preserve its text and verify the write target.
Post-commit acceptance switches workspace again before reloading disk content
and verifies the reload still reads the captured editing workspace.

## Git commit history

Git changes now links to read-only commit history, showing 30 commits per page
with author/date/subject and full commit metadata/stat/patch details. Pagination
anchors to the initial commit so new HEAD commits do not shift later pages.
Commit IDs and offsets are validated; external diff/textconv are disabled.
Git output is capped at 4 MB and larger details report a read error.
Temporary repository tests cover empty history, stable pagination after new
commits, root commit patches and invalid inputs. Browser acceptance covers
navigation, escaped patch content and pagination; production build passes.
Post-commit acceptance adds an in-place retry for failed history/detail reads.
Browser tests inject a detail failure, retry successfully, then leave a delayed
detail request and verify its stale response cannot replace the commit list.

## Git history branch selection

History can browse local branches and fetched remote-tracking branches without
checking them out. Switching branches resets pagination and detail selection;
subsequent pages retain their immutable commit anchor. The backend accepts only
HEAD or an exact enumerated branch ref. Real repository tests verify divergent
branch histories and unchanged HEAD/worktree; browser checks cover both branch
types and pagination reset. Remote history explicitly reflects the last fetch.
Post-commit acceptance deletes a selected branch externally and verifies an
explicit return-to-HEAD control recovers history without closing the panel.
Real Git and browser failure/recovery checks pass, as does the production build.

## Reopen existing Git worktrees

Git panel now lists registered worktrees with branch/detached, locked and prunable
status. Opening a valid entry starts a conversation at its resolved directory;
backend re-enumerates membership and checks the shared Git directory before
returning the project. Missing/prunable and bare entries cannot be opened.
Real repository tests verify list/open and preservation of dirty source content;
browser checks verify the selected entry request and conversation cwd. Build passes.
Post-commit acceptance distinguishes the primary local checkout from linked
worktrees by comparing Git/common directories. Locked worktrees remain openable.
A delayed open response after panel dismissal is ignored, preventing unexpected
conversation creation. Real Git tests and browser cancellation acceptance pass.

## Terminal output search

Each terminal session has a buffer search toolbar backed by xterm's search addon.
Ctrl/Meta+F inside the terminal opens search without triggering conversation find;
Enter/Shift+Enter move between matches and Escape restores terminal input focus.
Search covers retained scrollback (5000 lines), with explicit match/no-match status.
Real PowerShell browser acceptance verifies output searching and the existing
interrupt, session switching, resize and restart flows. Production build passes.
Post-commit acceptance keeps a query open while PowerShell emits a delayed match;
the search now refreshes after parsed terminal writes. Toggling the toolbar closed
uses the same selection cleanup and focus restoration as Escape. Real PTY browser
regression and build pass after these changes.

## Terminal log export

Each terminal can export its active retained buffer to UTF-8 text through a native
save dialog. ANSI presentation codes are absent and soft-wrapped rows are joined;
this is a buffer snapshot, not a complete session recording. An immediate lock
prevents concurrent exports. The UI reports success, cancellation and failures.
Real PowerShell browser tests inspect exported content; filesystem tests cover
UTF-8 writes, canceled saves and disk errors. Build passes. Native dialog clicking
has not been manually verified.
Post-commit browser acceptance exports a 400-character PowerShell output across
soft wraps and verifies one intact logical line. Injected save failure and cancel
responses recover on retry. Restart now clears the prior export notice; real PTY
regression and the production build pass.

## Workspace content search

File browsing now switches between filename and literal case-insensitive content
search. Matches show path, line, column and a bounded text snippet; opening a match
highlights its line in preview. Search skips Git internals and symlinks and accepts
complete UTF-8 files up to 256 KB, with limits of 200 results, 20000 visited entries
and roughly 32 MB read per request. Skipped entries and truncation are visible.
Filesystem tests cover line positions, literal punctuation, binary/large files,
Git exclusion and result limits; browser navigation/highlighting and build pass.
Post-commit acceptance compares the search-time file revision with the opened
preview; changed files show a refresh notice instead of highlighting a stale line.
Literal Unicode-aware matching preserves original UTF-16 column offsets even when
lowercasing a preceding character would expand it. Filesystem and browser tests
cover these cases, and the production build passes.

## Editor find and replace

The file editor supports literal search, case sensitivity, previous/next match,
current/all replacement and Ctrl/Meta+F or H to open the toolbar. Escape closes
search while retaining the edit dialog. Replacements modify only the edit buffer;
explicit revision-checked save remains required. Replacement text such as $& is
inserted literally. Browser tests verify replacements alongside existing conflict,
retry and discard behavior; Unicode offset tests and production build pass.
Post-commit acceptance checks forward/backward selection offsets and wrapping from
the first match to the last. Repeating Ctrl/Meta+F now refocuses an already-open
search input. Browser editor regression and production build pass.

## Editor undo and redo

Manual input, programmatic indentation and find/replace now share an explicit text
history. Toolbar actions and Ctrl/Meta+Z, Ctrl/Meta+Shift+Z or Ctrl+Y navigate it.
Each history direction retains at most 100 snapshots and 4M UTF-16 code units.
New edits discard redo history; successful disk reload establishes a new baseline.
Unit tests cover branching and limits; browser tests undo/redo replacements and
indentation alongside save conflict/reload regressions. Build passes.
Post-commit acceptance groups composition updates into one undo transaction.
Synthetic browser composition events verify one-step Chinese input undo/redo;
native IME interaction remains unverified. Browser tests also retain history after
save conflict and verify both history directions clear after successful reload.
Production build passes.

## Windows sandbox setup workflow

Permissions settings on Windows now query app-server readiness and expose elevated
or unelevated setup. The controller subscribes before setupStart and waits for
setupCompleted; a started response is not reported as completion. Pending setup
survives settings navigation, blocks duplicate starts, and handles failed setup
or connection loss. Completion requests reconnection/readiness refresh rather
than asserting that existing thread permissions changed. OS setup occurs only
when the user presses the setup control.
Real isolated app-server tests verify notConfigured and unelevated ready states;
browser bridge tests cover setup completion/failure/retry and navigation. Build
passes. Actual OS provisioning and sandbox enforcement remain unverified.
Post-commit acceptance preserves the requested setup mode across settings remounts.
Browser tests also deliver completion before setupStart responds and disconnect
while setup is pending: completion is not overwritten and disconnect reports an
unknown result. Build passes; OS provisioning/enforcement is still not claimed.

## Windows sandbox execution acceptance

An isolated real app-server fixture uses restricted-token (unelevated) sandboxing
and command/exec with an explicit workspaceWrite policy. A real PowerShell process
writes a marker inside its workspace; writing to a sibling fixture directory is
rejected with a sandbox-denied RPC error and leaves no file. This verifies a local
filesystem write boundary on this Windows machine, not network isolation, every
command tool, elevated provisioning or broader security guarantees.
Run: node --test tests/windows-sandbox-live.test.cjs. No provider request is made;
CODEX_HOME and all attempted writes are inside a fresh test fixture.
Post-commit acceptance also rejects workspace writes under readOnly policy. The
real unelevated setupStart/setupCompleted flow succeeds within the isolated
profile and persists windows.sandbox in its config.toml. After restarting the
server without the windows.sandbox command-line override, readiness remains ready.
This supersedes the earlier unelevated provisioning uncertainty for this fixture;
elevated provisioning and network isolation remain unverified. No product change
was required by this scoped acceptance.

## Restart workspace service from settings

Settings now provides an explicit stop-and-reconnect control to apply server
configuration changes without exiting Felix. Active/restoring/submitting turns,
approvals and sandbox setup disable it. Restart pauses queued messages and
preserves drafts; automatic recovery is suspended until the stop response, then
the normal bounded reconnect/restore flow resumes. Browser tests hold the stop
response to verify sequencing, block restart during a running turn and check the
draft afterward. Connection recovery tests and production build pass.
Post-commit acceptance adds explicit connection status beside the restart control.
A repeated click while stop is pending sends no second stop, and completion makes
exactly one new connection (no leftover automatic retry). Injected stop failure
shows an error and the recovery flow remains usable; drafts still survive.
Browser acceptance and production build pass.

## Cross-conversation content search

Sidebar search now calls app-server thread/search for persisted message content
and displays escaped matching snippets beside results. Pagination, duplicate
suppression and stale-query guards remain in place. Local loaded message text is
also matched, including offline. Scope is non-archived interactive conversations;
server support for the experimental search API is required for remote results.
A real isolated app-server/model fixture verifies searching assistant content whose
text is absent from the title. Browser tests verify snippet escaping and ignore a
late prior query. Thread pagination/retry checks and production build pass.
Post-commit acceptance preserves snippets across search pages and rejects malformed
search results with an explicit error rather than presenting an empty match list.
An offline browser fixture finds cached assistant text absent from the thread
title. Expanded browser acceptance and the production build pass.

## Archived conversation content search

The archive dialog searches titles and loaded local messages offline, and uses
thread/search with archived=true online. Escaped snippets identify remote content
matches. Clearing the query restores normal archive pagination; restoring a match
uses the existing unarchive flow and preserves local history. Searches do not add
archived records to the recent-conversation list. A real isolated app-server test
finds archived assistant content while excluding a restored conversation. Browser
search/clear/restore regression and production build pass.
Post-commit acceptance rejects multi-page cursor cycles (A→B→A), beyond an
immediately repeated cursor. A delayed search result after query clearing cannot
reappear in the archive list. Browser regression and production build pass.

## Markdown table fidelity

Table parsing now respects escaped pipes, validates header/divider column counts,
supports single-column tables and retains divider-looking body rows. Images flush
preceding tables in document order. Scroll containers are named and keyboard
focusable. Unit tests cover escaping; narrow browser acceptance verifies actual
cell content/alignment, malformed-header fallback and horizontal scrolling. Build
passes. This remains a custom Markdown renderer, not full CommonMark/GFM parity.
Post-commit acceptance retains table body rows without pipe delimiters and ends
the table before a following heading/list/quote block. A heading containing a pipe
is no longer swallowed as a table row. Narrow browser regression and build pass.

## Structured Markdown messages

Assistant messages now use the pinned marked lexer and React token rendering,
replacing the custom line parser. Semantic headings, nested ordered/unordered
lists, disabled task checkboxes, blockquotes, rules, reference links and GFM tables
are supported. Existing ArtifactLink and CodeBlock components still handle links,
images and code copy. Raw HTML is rendered as text, never injected into the DOM;
entities decode in prose while inline/fenced code stays literal. Browser tests
cover rich structures and inert scripts; prior narrow table acceptance and build
pass. The obsolete custom table parser and its isolated test were removed.
Post-commit acceptance preserves nested emphasis in link labels through the
existing artifact component. Unsafe-scheme links cannot become executable anchors.
Code-copy regression passes long/tilde/unfinished fences, exact copy and failure
retry; rich Markdown browser acceptance and production build also pass.

## Message link routing and section navigation

Markdown section links now navigate within their own message, including duplicate
heading suffixes and Unicode slugs. Web links use the desktop external-browser
bridge with visible failure/retry feedback. Only local path links trigger artifact
reads; unsupported schemes (including mailto) remain readable non-clickable text.
Credential-bearing web URLs are not activated. Unit/browser checks cover link
classification, scoped heading focus, missing anchors, external open failure/retry
and absence of artifact reads for unsupported links. Production build passes.
Post-commit acceptance clears state when a rendered link target changes and ignores
late external-open failures belonging to the old target. A browser component
fixture holds the old request, changes the URL and rejects the old request to
verify no stale failure appears. Rich message regression and production build pass.

## Artifact workspace binding

Message file links and file-change undo now carry the conversation workspace
through React context into the artifact IPC handler. Previously both operations
always used Felix's repository root. Explicit workspace roots must be absolute;
existing realpath and project-boundary checks still apply. Backend tests read and
undo same-named files in two directories without touching the other workspace.
Browser navigation verifies each conversation's artifact request root. Build passes.
Post-commit acceptance scopes file-change card state to its workspace/path/diff.
A held undo request retains the original root; after switching roots its delayed
response cannot mark the new card undone. Browser race acceptance and build pass.

## Message file preview and editor navigation

Local message file links now offer an in-app modal preview alongside download.
References ending in :line, :line:column or #Lline resolve to the existing file,
with literal filenames preferred and project boundaries enforced. The requested
line is highlighted and scrolled into view. Editable text opens the existing
revision-protected editor using the captured conversation workspace. Backend
reference tests, browser preview-to-editor acceptance and production build pass.
Post-commit acceptance fixes bare filename references such as notes.txt:2 being
mistaken for URI schemes. Out-of-range lines now show an explicit notice.
Browser acceptance covers failed refresh, unavailable edit action, shortened
files and recovery into the editor. Seven backend/classifier tests and build pass.

## Planned delivery: switch local Git branches

Expose local branches and current HEAD in the Git panel. Switching uses an
explicit enumerated local branch and checks that HEAD has not changed since the
list was read. Git's normal switch behavior preserves compatible local edits and
rejects overwrites or branches checked out in another worktree. Acceptance uses
real temporary repositories plus browser success/failure/retry and panel refresh.
Implemented and verified: three real-repository tests cover changed checkout
content, untracked preservation, overwrite rejection, stale HEAD, checked-out
worktree rejection and detached HEAD recovery. Mocked browser acceptance checks
payload, disabled current branch, failure/retry and refreshed status. Build passes.
Post-commit acceptance prevents returning to stale Git controls while a branch
switch is pending: back/close/target controls are disabled until completion.
A held-response browser test verifies this behavior and subsequent refreshed
status; existing stage/commit browser regression and production build pass.
These tests do not establish atomicity against simultaneous external Git commands
between the HEAD check and git switch, nor native Electron/provider acceptance.

## Planned delivery: track a remote branch locally

The branch panel will list fetched remote branches, excluding symbolic aliases.
Users choose an exact remote ref and a new local name; create-and-switch establishes
an explicit upstream without overwriting existing branches. Reject stale source
HEAD/remote tips and unsafe names. Verify real checkout content, tracking config,
existing-branch/dirty-file rejection and subsequent push/pull routing in isolated
repositories; browser checks cover selection, failure recovery and status refresh.
Implemented: remote ref enumeration excludes symbolic aliases; an explicit new
local name is validated and created with direct upstream tracking. Five real Git
tests pass, including actual push/pull against a temporary bare remote, dirty
checkout rejection and local switching regressions. Remote/local browser flows
and production build pass; no live hosted remote or native Electron UI claim.
Post-commit acceptance adds an actionable empty-remote message and verifies a
selected remote disappearing on refresh. Its stale selection is cleared, the
local name draft survives, submission stays disabled, and a later refreshed ref
can be selected and checked out. Browser acceptance and build pass.

## Planned delivery: stash and restore Git working changes

The Git panel will expose reversible stash and restore-last-stash actions. Stash
includes untracked files, refuses a changed branch/HEAD after status was read, and
never discards content. Restore uses Git's conflict reporting and keeps the stash
when conflicts occur. Isolated repository tests verify tracked/untracked content,
branch guards and conflict preservation; browser acceptance verifies disabled
busy controls, errors and refreshed status.
Implemented and verified: stash includes tracked and untracked workspace content,
restores it exactly, and keeps the stash on pop conflicts. Stale branch/HEAD
checks prevent acting on a changed workspace. Two isolated repository tests, the
stale-error browser acceptance, Git write/remote regressions and production build
pass.
Post-commit acceptance adds stash availability to Git status. Restore is now
disabled when no stash exists, avoiding a late error; the empty-state browser
check, two real-repository stash tests and production build pass.

## Planned delivery: merge a local branch

The Git panel will enumerate local branches and merge a selected branch into the
current branch. The operation checks the captured branch and HEAD, rejects merging
into itself, uses Git's normal fast-forward/merge behavior, and reports conflicts
without resetting files; the existing conflict viewer remains available. Real
repositories verify fast-forward, divergent merge commit, conflict preservation
and stale guards. Browser acceptance covers selection, payload, failure and status
refresh.
Implemented and verified: Git panel merges an exact local branch into the current
branch after branch/HEAD guards. Fast-forward and divergent repositories pass;
conflicting merges preserve Git's conflict state and output, while self/ stale
requests are rejected. Browser conflict acceptance, six Git backend regressions
and production build pass.
Post-commit acceptance refreshes Git status automatically after a failed or
conflicting merge while preserving the actionable conflict error. Browser
acceptance verifies both the refreshed status request and visible error; real
merge/stash regressions and production build pass.
Post-commit acceptance confirms that a failed/conflicting merge triggers an
automatic status refresh while retaining the conflict error for the user. The
browser test verifies both requests and visible feedback; production build and
four isolated merge/stash tests pass.

## Planned delivery: safely delete a local Git branch

The branch panel will offer deletion of a selected local branch. It refuses the
current branch, requires the branch to be fully merged (`git branch -d`), checks
the captured current branch/HEAD and exact branch enumeration, and refreshes the
list after success. No force-delete control is exposed. Real repository tests
cover merged/unmerged/current/stale cases; browser acceptance covers disabled
selection, error retention and refresh.
Implemented and verified: local branch deletion is limited to exact enumerated
non-current branches and delegates to `git branch -d`, so unmerged history is
protected. Two isolated repository tests cover successful deletion, current and
unmerged rejection, and stale HEAD. Browser acceptance and production build pass.
Post-commit acceptance adds explicit success feedback after branch deletion while
retaining automatic list refresh. Browser acceptance now covers protection error,
retry success and visible confirmation; real deletion tests and production build
pass.

Post-commit acceptance: git-stash-integration-ui.cjs drives the actual GitPanel
against workspaceGit and a real temporary repository via a browser bridge.
Both buttons complete, tracked/untracked contents restore, ignored runtime data
stay in place, and stash availability updates. This closes the gap left by the
previous mocked error-only UI test. Production build passes. Native Electron
IPC and model-driven Agent controls are not established by this test.

## Child-agent status and interruption

Plan: add explicit status refresh through thread/read(includeTurns), and interrupt
only the running turn returned by a fresh read of that child. Keep historical
activity distinct from queried state. Live turn notifications supersede pending
reads; interrupt acknowledgement does not imply completion. Browser acceptance
will verify target identity, late-read guards, failures and acknowledgement.
Implemented: child controls query thread/read and re-read before turn/interrupt,
using the returned running turn ID. Browser tests cover stale reads, interrupt
acknowledgement, error recovery and completion notifications; build passes.
Post-commit acceptance invalidates queried status on disconnect and disables
interrupt until refreshed. The existing activity navigation/history test now
models multiple notification subscribers like the real bridge; it passes along
with control acceptance. Actual model-spawned child interruption remains unverified.
Post-commit acceptance fixes late completion notifications from an older child
turn replacing a newer running turn in the controls. Browser ordering regression
and production build pass; interruption still re-reads before acting.

## Finish resolved merges without a tree change

Plan and implementation: status reports MERGE_HEAD presence, the panel names the
unfinished merge, and commit permits an empty staged diff only while a merge is
pending. Unresolved conflicts still block submission. Acceptance must verify a
real conflicting merge resolved entirely to ours creates two-parent history and
that an ordinary empty commit remains rejected.
Verified: real Git creates the two-parent merge commit after resolving to ours;
unresolved conflicts and ordinary empty commits remain blocked. Browser workflow
and existing write regressions pass. Post-commit acceptance removes the misleading
clean-worktree message while MERGE_HEAD exists, then verifies it returns after
completion. Browser acceptance and production build pass.

## Queue storage failure recovery

Plan: handle queue read/write failures without throwing into React, preserve
composer input when enqueue cannot persist, and never dispatch a turn unless
its sending state was saved. Failed transitions pause in-memory items; successful
submission removal stays removed in memory even if storage fails. Retry writes
the latest snapshot. A failed initial read blocks writes until recovery reads
the original queue, preventing accidental erasure. Browser fault injection,
existing FIFO/cancellation/reload regression and production build pass. Unsaved
changes can still be lost on close and previously persisted sends require user
verification after reopening; no automatic replay is introduced.
Post-commit acceptance injects quota failure into the full chat enqueue flow:
composer text remains intact, no turn/start is sent, no phantom queued item
appears, and retry clears the warning. The same run then passes normal FIFO,
cancellation, failure/retry and persisted paused-queue restoration. No additional
product change was required for this acceptance.

## Image-view tool results

Plan and delivery: imageView records now have a dedicated workspace-bound image
preview with download and reread, replacing raw JSON. Unsupported/nonlocal paths
show an error instead of causing a remote image request. Existing raw-item storage
preserves the protocol fields across history restoration. Full-chat browser
acceptance uses restored messages and real artifactRequest against a temporary
PNG: decoded image, correct root, download, missing-file retry and nonlocal path
rejection pass. Production build passes. Workspace boundary/size limits remain;
this does not add image generation capability.
Post-commit acceptance adds explicit local-image decode failure feedback to the
shared artifact renderer. Real corrupt PNG bytes now produce an alert; replacing
them with valid bytes and rereading clears it and restores a decoded image. The
expanded full-chat browser acceptance and production build pass.

## Reasoning summaries

Plan and delivery: render reasoning records as collapsed summaries, consume indexed
summary text/part notifications, preserve history, and use completed items as the
authoritative text. Invalid indices and deltas after completion/interruption are
ignored. Only server-provided summaries are displayed; absent summaries have an
explicit empty state. Unit coverage, full-chat browser streaming/disclosure/final
replacement checks and production build pass. Raw reasoning content is not shown.
Post-commit acceptance adds Markdown rendering through the existing message
renderer. Full-chat browser checks now also exercise turn interruption, actual
thread/resume history responses, default collapsed historical records, formatted
summary text and absent-summary feedback. Browser acceptance and production build
pass; provider reasoning availability remains dependent on the server/model.

## Stable merge feedback

Plan and delivery: separate mutation errors from status/diff read errors so merge
conflict feedback survives refresh without a timer. Successful merge feedback
uses the selected merge target. A real temporary repository driven through the
full browser app verifies fast-forward content, accurate target notice, conflict
state, and error persistence across refresh and diff navigation. Production
build passes.
Post-commit acceptance disables starting another merge while MERGE_HEAD exists.
The browser integration now resolves the conflict entirely to ours, stages via
the UI, checks error clearing, and completes an empty-diff merge commit with two
parents. Merge controls re-enable afterward. Existing real-Git merge regression
tests and production build also pass.

## Queue persistence during active dispatch

Plan and delivery: preserve existing sending entries during queue write failures;
only unsent entries pause. A newly attempted dispatch still requires successful
persistence. Hook browser fault injection verifies in-flight status survives
unrelated completion, rejected enqueue and save retry, while confirmed removal
is not resurrected after another failed write. Production build passes.
Post-commit full-chat acceptance holds turn/start pending while an unrelated
completion encounters quota failure. Edit/cancel remain disabled, save retry
preserves sending, acknowledged removal survives a second quota failure, and
the paused successor dispatches exactly once after explicit resume. The existing
FIFO/edit/cancel/failure/reload browser regression also passes. These tests use
a controlled app-server bridge; no additional product correction was needed.

## Independent desktop data directory

Plan: separate writable application data from installed/source files before
adding distribution packaging. FELIX_DATA_DIR accepts an absolute directory;
development retains .project-cache by default, and packaged apps select
appData/Felix. Electron profile, interactive Codex home/temp and scheduled
run/cache directories share this root. Existing data is not automatically moved;
an override selects a separate profile. Binaries/catalog/MCP runtime bundling
and an installer remain outstanding. Path tests, a real app-server scheduled
tool run using an external data directory, and production build pass.
Post-commit native acceptance copies the application into a temporary install
directory, launches real Electron with an external FELIX_DATA_DIR containing a
space, saves a reminder and localStorage value, then closes and reopens it. Both
persist correctly, app.getPath('userData') points into that profile, and no
.project-cache appears under the copied install. This does not test a packaged
installer or bundled model runtime. No product correction was required.

## Relocatable runtime lookup

Plan and delivery: FELIX_RUNTIME_DIR selects an absolute bundle containing
bin/codex(.exe), bin/node(.exe), models.json and electron MCP scripts. Packaged
apps default to resources/felix-runtime; development keeps source lookup.
Missing bundle files fail explicitly without using another installed CLI.
Interactive and scheduled servers share the lookup. Managed remote MCP command
and args update on relocation while other settings remain intact. Configuration
regression, a copied real app-server initialize/model-list check, scheduled
tool execution and production build pass. Runtime assembly and installer remain
outstanding; the smoke test does not establish model response quality.
Post-commit acceptance starts both copied MCP scripts with the copied Node binary
and checks initialize/tools-list responses. Existing custom MCP commands, remote
enabled=false and startup timeout survive managed path updates; repeating the
update is byte-stable. All eight runtime/config/scheduled-run tests pass. This
verifies bridge startup, not remote desktop actions or network search results.

## Runtime bundle assembly

Plan and delivery: pnpm run bundle:runtime [absolute-output] assembles the local
Codex executable, the invoking Node binary, model catalog, MCP scripts and Codex
license. Default output is .project-cache/felix-runtime. Existing destinations
are refused; inputs and model catalog are checked before creating output. A
manifest records platform, architecture, reported versions, sizes and SHA-256.
The relocation test now consumes this builder and checks hashes before starting
real app-server and both MCP bridges. Runtime artifact was built locally and
startup checks pass. This is local assembly, not a redistributable release:
Node/third-party license collection, installer and signing remain outstanding.
Post-commit acceptance adds pnpm run verify:runtime [directory], checking required
manifest entries, host platform/architecture and every file hash/size. Tests
detect a modified MCP script and an incomplete manifest, then verify recovery.
The generated local artifact passes verification. Hashes detect accidental
corruption relative to the manifest; they do not provide publisher authenticity.

## Runtime license collection and failed assembly

Plan and delivery: include Codex NOTICE and the complete Node LICENSE downloaded
from the official repository tag matching the bundled executable version. Record
the source URL and hash both documents; verification requires them. Download or
copy failure does not leave a completed-looking output directory. The existing
runtime smoke test still starts the assembled binaries and bridges successfully.
Rust dependency license inventory and release packaging remain outstanding.
Post-commit acceptance injects a disk failure after the first binary has actually
been copied; cleanup removes the partial directory while preserving its sibling
file. A fresh .project-cache/felix-runtime-licensed artifact was generated with
eight manifest entries and passed the CLI integrity verifier. Bundling now needs
network access to the official versioned Node license source.

## Windows desktop directory package

Plan and delivery: pnpm run bundle:desktop [output] [runtime] assembles Electron,
production UI, main/preload assets, recursively copied runtime npm dependencies
and a verified runtime into a Felix.exe directory package. Existing destinations
are refused and partial failures cleaned up. Electron and npm license files are
preserved with their packages. Real packaged Electron starts the UI, initializes
its bundled app-server/model catalog and executes a native PTY shell command.
Default artifact: .project-cache/felix-desktop. This is an unsigned directory
build, not an installer; model-provider credentials and system Git/browser tools
remain external requirements. Release license audit remains outstanding.
Post-commit acceptance copies the entire directory outside the repository into
a temporary path containing spaces, clears runtime/Node path overrides, and
repeats UI, bundled model-list and terminal checks. A saved reminder survives a
real close/relaunch, with no data cache created beneath the install resources.
This was tested on the development Windows host, not a clean Windows VM.

## Local HTTP model providers

Plan and delivery: Provider save and connection validation now share URL parsing
that accepts HTTP on localhost, IPv4 loopback and IPv6 loopback, while remote
providers still require HTTPS. Userinfo, query strings and fragments remain
rejected. Existing credentials/encryption behavior is unchanged; a key field is
still required (local servers can use a placeholder). URL boundary and provider
registry regression tests pass. A new desktop directory artifact was assembled
for full packaged conversation acceptance.
Post-commit packaged acceptance found that a fresh Codex home had no minimax
provider registration: model/list worked but thread/start failed. Interactive
startup now explicitly registers its local Responses adapter. The relocated
desktop configures a local controlled Provider, performs a real Get-Content tool
call, validates its output at the model endpoint, then restores the response in
the UI after restart. This passes with danger-full-access; read-only Windows
execution was rejected by app-server policy and is not claimed as supported by
this test. The model endpoint is controlled, so this proves integration rather
than hosted model quality. Artifact: felix-desktop-provider-fixed.

## Independent interactive adapter ports

Plan and delivery: interactive startup requests an OS-assigned loopback port,
waits for listening and supplies the actual endpoint to app-server. Concurrent
start calls share one promise; stop aborts pending startup and closes active
adapter connections. Main-process IPC awaits startup. Real app-server lifecycle
tests verify two profiles use distinct ports, both initialize/list models,
pending startup cancels, and stopping/restarting one leaves the other running.
Post-commit acceptance rebuilds the directory package, occupies former fixed
port 15821 with an unrelated HTTP service, and repeats real local-provider tool
execution plus UI history restoration after restart. The test passes with the
dynamic-port artifact; provider isolation no longer depends on that port being
free. Existing full-access test limitations still apply.

## Packaged read-only conversation after sandbox setup

Investigation: the earlier read-only failure used a fresh, unconfigured Windows
sandbox. Packaged acceptance now optionally runs windowsSandbox/setupStart in
unelevated mode before creating the read-only thread. With FELIX_TEST_SANDBOX=
read-only, actual Get-Content execution, tool result and restored conversation
all pass. Sandbox settings now automatically query readiness after successful
setup instead of remaining unknown and requiring manual refresh. Browser setup
failure/retry/early completion checks and production build pass. This does not
establish elevated sandbox provisioning or network isolation.
Post-commit negative acceptance found that setup persists configuration but the
existing process can still execute direct command/exec without write isolation.
The UI now explicitly requires reconnecting to activate isolation. Acceptance
restarts the packaged process after setup, verifies real read-only model tool
execution, then attempts a write: it returns a nonzero permission-denied result
and no file is created. Browser feedback regression and production build pass.
Read success before restart alone must not be interpreted as sandbox enforcement.

## Sandbox readiness across service connections

Plan and delivery: retain the existing restart control in settings, invalidate
cached sandbox readiness when app-server disconnects and query current readiness
after connection succeeds. In-progress setup subscriptions are cleaned up on
disconnect and retain the unknown-result error. Browser restart acceptance checks
unknown while stopped and ready after reconnection, alongside draft preservation
and busy-turn protection. Sandbox workflow regression and production build pass.
Post-commit race acceptance delays a readiness response across invalidation and
a newer query: old ready cannot overwrite new notConfigured. A second test
disconnects pending setup, verifies both subscriptions are removed, and delivers
late completion/acknowledgement; status stays unknown with the disconnect error.
Both pass without additional product correction.

## Keyless local model services

Plan and delivery: loopback Providers may omit API keys; save/activate, model
listing, interactive and scheduled dispatch accept that state. Remote Providers
still require credentials. UI distinguishes keyless local services from missing
remote credentials. Existing saved keys remain preserved on blank edits, and
keyless requests omit Authorization. Registry/boundary/scheduled regression,
production build and a relocated packaged keyless conversation with actual tool
output and history restoration pass. Artifact: felix-desktop-keyless.
Post-commit acceptance runs the real scheduled tool fixture in authenticated and
keyless modes, asserting the exact Authorization behavior at the local endpoint.
Both complete and persist their output. Model-list coverage verifies keyless
local access and rejects missing remote credentials before network dispatch.
All six targeted acceptance/regression tests pass.

## Provider deletion

Plan and delivery: inactive Providers can be deleted with explicit confirmation,
removing their stored encrypted credential from the registry. Both renderer and
main process refuse deletion of the active Provider. Deleting an edited entry
clears its editor/model selection. Registry tests cover active/missing IDs,
credential removal and failed persistence leaving the original registry intact.
Production build passes.

Provider deletion post-commit acceptance: the full settings UI verifies cancellation
sends no deletion, storage errors retain the item/editor and permit retry, active
Provider deletion stays disabled, and successful deletion clears the selected
editor. Delete uses a labelled Lucide icon. Browser acceptance and build pass.

## Manual Provider model IDs

Plan and delivery: Provider settings can explicitly use a manual model ID when
the service omits model listing. Saved manual Providers supply their configured
ID to the app catalog without a /models request. Manual IDs are trimmed and
validated; automatic mode continues requiring a fetched selection. The UI states
that saving does not validate inference availability. Browser 404/manual-save/
edit/mode-switch coverage, registry regression and production build pass.
Post-commit acceptance adds host-side registry assertions for trimmed persistence,
manualModel metadata, absent secrets on keyless local services and newline ID
rejection. The full settings browser fixture and registry tests pass together;
manual inference availability remains a server-side concern.

## Overlapping conversation history

Plan and delivery: restoring repeated server item IDs updates the existing row
at its original position instead of duplicating assistant/user/plan messages or
locally saved tools. Later completed tool records replace provisional output.
Tool/reasoning tests and full-chat complete-history loading with overlapping
records pass; production build passes.
Post-commit acceptance covers overlap with existing cached tools, preservation of
the prior snapshot and authoritative empty text replacing provisional content.
Empty text handling was corrected. Runtime fixture cleanup now retries transient
Windows file locks after child exit. All 19 selected registry, history, sandbox
race and runtime tests, full-chat history acceptance and production build pass.

## Per-conversation model selection

Plan and delivery: each conversation persists its selected model. New threads
snapshot the default; legacy threads use the default until restored or selected.
Resume imports the server model only when no local selection exists. Composer,
turn/start and queued input use the conversation choice; choosing another thread's
model no longer changes the global default. Browser acceptance verifies two-thread
isolation, reload, outgoing request and queue model snapshot. Build passes.
Provider credentials remain global; unavailable models require a new selection.
Post-commit acceptance changes the Provider catalog and verifies the conversation
retains its selected model, displays its ID as unavailable and disables sending
instead of silently choosing a different model. Browser acceptance and build pass.

## Per-conversation reasoning effort

Plan and delivery: each conversation persists reasoning effort alongside model.
New threads snapshot the default; resume imports a supported server effort only
when no local selection exists. Ordinary turn/start and queued messages use the
conversation effort. Browser acceptance verifies high effort survives reload and
appears in actual turn/start arguments and the queue snapshot. Build passes.
Post-commit acceptance switches to another thread after choosing high effort:
the other thread stays low, returning restores high, and the global default
remains low. The expanded browser flow passes without further product changes.

## 会话分叉并发与设置继承

计划和交付：顶部会话分叉与消息级分叉共用忙碌锁，运行中、加载中或断线时禁止重复请求；异步完成后若用户已切换会话，分支仍保存到最近会话但不会抢回当前视图。分支继承每会话模型、推理强度、规划模式、项目和工作区，清除上下文用量、权限请求及旧权限快照；消息级历史分支另清除后续计划进度，并重置为可发送的空闲状态。单元验收覆盖深拷贝、历史截断和临时状态清理；生产构建通过。

## 历史记录异常条目容错

计划和交付：会话历史恢复跳过空值、原始值和非对象 `item`，避免服务端异常记录触发渲染器异常；后续合法消息仍正常恢复，既有本地快照不被修改。历史、推理、规划相关 13 个单元测试和生产构建通过。

提交后验收修正：进一步拒绝缺少有效 ID 的记录及无效 item 包装，过滤空或非对象内容块，对非数组 content 和非字符串文本容错。14 个相关测试、模拟桥接的完整聊天历史加载验收与生产构建通过；后续合法文本及去重工具输出仍可见。

## 拉取并合并上游

计划与交付：新增显式拉取合并操作，获取配置的远端上游后允许合并分叉历史。检查分支和 HEAD，要求干净工作区，禁用自动 stash；冲突后刷新现有冲突处理界面。真实临时远端仓库测试验证双亲提交、不同上游分支名称、过期 HEAD、未提交文件保护、已最新与冲突状态；仅快进回归与生产构建通过。

提交后验收：模拟桥接的完整应用测试验证合并入口的未提交修改保护、分支与 HEAD 参数、冲突刷新、再次合并禁用，以及冲突协助草稿包含文件路径。测试通过，无额外产品修正；真实仓库操作由 git-pull-merge.test.cjs 覆盖。

## 聊天插件工作区绑定

计划与交付：聊天插件目录使用当前会话工作区，不再查询固定默认目录。目录切换重建选择器，关闭旧弹窗并忽略旧请求结果。浏览器模拟桥接验收覆盖两个工作区、延迟返回和选择新目录插件；生产构建通过。

提交后验收：无已知工作区的远端会话以空 cwds 查询目录，不借用默认项目。扩展浏览器测试和既有插件搜索、安装、键盘、错误重试、布局及插件引用发送回归通过；这些是模拟目录/协议验收，不证明实际第三方插件安装。无需额外产品修正。

## Provider 模型目录刷新竞态

计划与交付：Provider 变化启动新模型列表请求，不再被尚未结束的旧请求丢弃。以请求版本判断结果，刷新时清空旧目录，旧成功或失败不改变新请求状态，组件卸载使结果失效。模拟桥接浏览器测试验证迟到的旧成功结果不能覆盖新 Provider 模型；生产构建通过。

提交后验收：旧请求失败不清除新请求的加载状态，当前请求错误可见且手动刷新可恢复。扩展竞态测试及每会话模型隔离、重载、发送和队列快照回归通过。无需额外产品修正。

## 模型目录搜索

计划与交付：模型选择器支持按 ID 忽略大小写筛选、自动聚焦、空结果提示和重新打开清空查询。搜索不更改模型选择，点击结果才应用。模拟桥接浏览器测试与生产构建通过；主 JS 包略超过 500 KB，构建仍成功。

提交后修正：Escape 关闭模型搜索后将键盘焦点还给选择模型按钮，取消搜索不改变选中模型。扩展浏览器验收、Provider 目录竞态回归和生产构建通过。

## 每会话插件草稿

计划与交付：插件选择按会话持久化，导航不再清空，首次发送迁移欢迎页选择。发送成功仅清理源会话已发送插件，排队成功清空已入队选择；保存失败可见并可重试。模拟桥接浏览器验收覆盖切换、重载、真实客户端 mention 参数和延迟发送后源会话清理；生产构建通过（主包体积警告仍在）。

提交后验收：模拟 localStorage 写入失败，确认错误和重试入口可见、磁盘仍保留旧选择；恢复存储并重试后移除操作正确落盘，重载不会复活旧插件。扩展草稿验收与既有插件交互/发送回归通过，无额外产品修正。

## 消息中的插件引用

计划与交付：普通发送及队列消息保存插件名称与 ID，并显示插件标签；历史恢复解析 plugin:// mention，去重并忽略其他引用。12 个历史解析测试、模拟桥接的发送标签及完整历史恢复验收、生产构建通过。浏览器断言调整为包含插件标签的消息容器，避免把新增标签误判为正文缺失。

提交后修正：本机 Markdown 导出加入插件名称与 ID，避免界面已有记录在导出时丢失。扩展导出浏览器验收和生产构建通过。

## 应用级键盘导航

计划与交付：Ctrl/Command+Shift+O 新建会话、Ctrl/Command+K 搜索会话、Ctrl/Command+Shift+L 聚焦消息，设置中列出快捷键。忽略弹窗、终端、组合输入、重复及已处理按键。浏览器验收覆盖新会话与草稿保留、隐藏侧栏搜索、消息聚焦和组合输入保护；生产构建通过。

提交后修正：初始保护遗漏原生 dialog；现在同时识别打开的原生 dialog、ARIA dialog 和 modal。真实归档窗口打开时不创建会话；模拟终端目标及重复按键不触发。浏览器验收改为等待实际焦点切换，扩展测试与构建通过。macOS 原生快捷键行为尚未实机验证。

## 删除闲置 Git 工作树

计划与交付：列表提供路径确认后删除附属工作树，保留分支提交。后端限定当前仓库登记目标并检查 realpath、HEAD、锁定、当前/主工作树及未提交/未跟踪/忽略文件，最终调用非强制 git worktree remove。真实临时仓库保护与删除测试、生产构建通过。既有会话记录保留，已删除目录无法继续执行工作区任务。

提交后验收：模拟桥接浏览器覆盖取消无请求、失败保留确认、成功重试与列表刷新、发送 expectedHead。真实仓库创建/重新打开及脏源目录保护回归通过。所有实际删除仅针对临时测试仓库；无需额外产品修正。

## 工作树身份与操作反馈

计划与交付：工作树清单增加主工作树和当前工作树标识，UI 提前禁用对应删除按钮；列表操作忙碌期间禁用该子页返回和关闭，避免丢失反馈。真实仓库身份断言、延迟删除浏览器验收和生产构建通过。

提交后验收：删除结束后返回与关闭按钮恢复可用，实际返回 Git 主面板成功。扩展浏览器测试通过，无额外产品修正。

## 可搜索应用命令面板

计划与交付：标题栏或 Ctrl/Command+Shift+P 打开命令面板，中文名称与英文关键词筛选九项现有操作，支持方向键、Enter 执行和 Esc 取消。原生模态框隔离背景输入，取消恢复原焦点。浏览器验证搜索、空结果、新建会话草稿保留及 Git 导航；生产构建通过。

提交后验收：方向键选择后 Enter 聚焦会话搜索；模拟组合输入 Enter 不执行；390px 窗口中命令对话框未越界。命令面板扩展验收与已有应用快捷键回归通过，无额外产品修正。macOS 和原生 IME 仍需实机验证。

## 命令面板快速切换会话

计划与交付：命令面板加入未归档本机会话命令，按标题、工作区和英文关键词筛选；同名会话显示工作区，选择后使用既有会话切换与独立草稿。归档会话不重复列出。浏览器验收覆盖同名工作区筛选、归档排除和两会话草稿隔离；生产构建通过。

提交后验收：命令面板基础操作、会话快速切换、同名工作区、归档排除和草稿隔离回归全部通过；生产构建通过，窄窗口布局沿用对话框边界验证。无需额外产品修正。

## 应用内会话重命名

计划与交付：使用原生 dialog 替代 window.prompt，支持空值校验、前后空白裁剪、远端同步和错误重试；保存中不可重复提交或关闭，成功后更新本机标题和侧栏。浏览器验收覆盖本机输入、远端失败保留、重试和保存中关闭保护；生产构建通过。

提交后验收：重命名 dialog、命令面板快捷操作和 Markdown 导出回归全部通过；错误不会覆盖原标题，保存期间 Escape 无法关闭。无需额外产品修正。

## Markdown 导出异常记录容错

计划与交付：完整服务端历史导出跳过空值和原始值，非对象包装保留为原始记录，非数组用户内容安全导出为空文本；合法未知类型仍保留。模拟桥接完整分页导出验收加入脏条目，生产构建通过。

提交后修正：抽离 conversationMarkdown 纯函数，处理 undefined 内容块及非字符串正文，保留 JSON 字段而非输出 [object Object]。独立脏记录测试、完整导出浏览器回归和构建通过。本轮未交付每会话 Provider 路由或图片生成结果专用视图，这两项仍待实现。

## 图片生成结果专用视图

计划与交付：按上游 ImageGenerationItem 字段显示生成中、完成、失败与额度错误，展示修订提示词；有效 PNG/JPEG/WebP base64 可预览下载，缺少内嵌结果时使用已有工作区文件预览边界。浏览器以协议记录验证 PNG 解码、下载、文本转义与状态，生产构建通过。此交付仅为结果展示，不新增图片生成 Provider 或证明实际模型生成能力。

提交后验收：同 ID 图片生成生命周期由生成中变为完成，历史重载保留单条记录及 base64 结果；既有真实临时图片文件读取、下载、缺失/损坏重试和非本地路径拒绝回归通过。无需额外产品修正。实际生成服务端到端仍未验证。

## 非阻塞用户问题

计划与交付：isBlocking=false 问题显示为可展开回答区域，不遮挡编辑；阻塞请求独立排队。回答绑定原请求 ID，保留失败输入并允许重试。模拟桥接浏览器覆盖混合请求、编辑不中断、正确回答路由及原有问题回归；生产构建通过。未提供 isBlocking 的旧请求仍按阻塞处理。

提交后验收：扩展模拟桥接浏览器测试，服务端通过 serverRequest/resolved 提前解决非阻塞问题后，回答区域移除，未提交输入没有发送，既有回答数量保持不变。测试通过，无额外产品修正。

## 定时任务 Provider 执行隔离

后续路由计划：适配器先支持明确渠道 ID 的地址，再接入线程创建、恢复、分支和 UI 选择；不能仅保存标签或依赖全局启用状态。

计划：先修复任务密钥固定但地址动态变化的问题；每会话 Provider 选择和路由仍未交付。每次任务启动读取一份完整渠道配置，该次工具调用与后续模型请求使用同一地址和密钥，子进程仅收到本地适配器占位凭据。

交付验证：真实 Codex 子进程执行临时工作区只读命令，在第一次模型请求时切换全局渠道，第二次请求仍发送到原渠道并使用原凭据。带密钥和免密本地渠道均通过，缺少密钥、无效目录、取消清理回归通过（5 项测试）。

提交后验收：使用两个本地 HTTP 模型服务连续执行两次真实 Codex 任务，切换配置后第二次仅访问新服务并携带新凭据，输出分别来自对应服务。6 项测试全部通过，无额外产品修正。测试验证渠道隔离与执行链，不代表真实云模型质量或每会话 Provider 路由已完成。

## 明确渠道 ID 的适配器路由

交付：/providers/{id}/v1/responses 从注册表读取指定渠道的地址和凭据，缺失渠道返回 404，不回退到全局渠道；旧地址仍使用当前启用渠道。两个真实本地 HTTP 服务并发验证隔离、删除渠道和兼容路径。注册表及进程恢复回归通过；恢复测试更新为当前异步启动接口。本轮尚未把线程生命周期接入新地址。

提交后验收：远端渠道缺少密钥返回 401，无效路径与附加查询返回 404，不产生全局渠道请求。路由、注册表、异步进程恢复与定时任务真实子进程回归共 9 项通过，无额外产品修正。

## 会话自动绑定 Provider

计划与交付：新会话绑定创建时启用的渠道 ID，主进程保存映射；恢复与分支覆盖线程级适配器地址，发送按绑定渠道校验，删除渠道不回退。真实 Codex 子进程验证两个会话并发走独立 HTTP 服务，重读映射后恢复及分支沿用原渠道，删除后发送失败。尚未交付会话渠道 UI 和手动切换；旧会话首次恢复时采用当前渠道。

提交后验收：当前启用渠道 B 被删除时，已绑定 A 的会话仍能完成真实回合；A 删除后才明确失败。线程路由回归通过，生产构建通过（仅保留既有主包体积警告）。无额外产品修正。

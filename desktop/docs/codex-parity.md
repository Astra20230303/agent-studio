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

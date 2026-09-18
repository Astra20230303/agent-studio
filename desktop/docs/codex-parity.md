# Felix capability roadmap

## Focus workspace search from the keyboard

Ctrl/Command+P opens the workspace file panel, closes Git review and focuses its
search input. Repeating the shortcut preserves the current query and draft.
Ctrl/Command+Shift+P remains the command palette. The shared shortcut scope blocks
dialogs, terminal targets, repeats and IME composition; settings document the new
binding. Browser shortcut/isolation acceptance and production build pass.

Post-commit Windows Electron acceptance confirms native Ctrl+P focuses the search
without opening print UI and preserves a typed query on repeated use. Preview,
download and restart regression passes. Native macOS Command+P remains untested.

## Open a search result's containing folder

Selected workspace files provide an open-containing-folder action. It clears the
search and opens the file's parent inside the workspace panel; both filename and
content search use the same parent resolver as ordinary upward navigation.
Windows separators and root-level files are handled without navigating beyond
the workspace. Browser name/content/root navigation acceptance and build pass.

Post-commit acceptance simulates an unavailable parent directory, verifies its
error and successful refresh after recovery, and confirms navigation does not add
attachments. Existing workspace workflow regression passes; no correction needed.

## Explain workspace preview decoding failures

The workspace panel now reports invalid UTF-8 and image decode errors, matching
expanded preview feedback. Image failures belong to the specific preview object;
this prevents a post-render reset from erasing a fast decoder error. Refreshing
with repaired data clears the error and restores the image; valid text restores
editing. Browser decoder/recovery and encoding-status acceptance and build pass.

Post-commit correction ties failure to the image source rather than the wrapper
object: replacing metadata for the same failed source does not erase the error
when the browser reuses its image element. Expanded decoder acceptance, workspace
workflow regression and build pass.

## Keep saved previews authoritative

Workspace preview updates from a completed save invalidate older pending reads,
including their errors, so stale disk responses cannot overwrite the saved text.
A shared editable-preview predicate is used by the workspace panel, expanded
preview and editor reload: complete text plus a nonempty revision is required;
truncated, encoding-invalid, binary and image payloads cannot enter editing.
Browser delayed-read and contradictory-payload acceptance and build pass.

Post-commit acceptance rejects an older pending refresh after a saved update and
verifies the saved text remains visible without the stale error. Workspace
navigation/search/attachment and preview/editor keyboard/save regressions pass.
No further product correction was required.

## Block duplicate writes from copy controls

Shared CopyText controls now lock synchronously while a clipboard write is
pending, expose busy status and re-enable after success or failure. Changing
source content invalidates old feedback but retains the pending lock until the
underlying write settles. Browser mocked-clipboard acceptance covers same-tick
duplicate clicks, source replacement, stale completion and failure/retry; build
passes. The lock is per control, not a global clipboard transaction.

Post-commit acceptance verifies an old rejected write cannot display an error for
replacement content, and the new content can then be copied. Tool command/output,
MCP data and exact preview-copy regressions pass. No correction was needed.

## Expand workspace files into the shared preview

The workspace file panel opens the same deferred preview as conversation files,
making search, copying, line navigation and image controls available there.
Content search forwards its line and revision; the preview compares the revision
of its own read before locating that line. Already-stale results omit the line.
Closing restores the panel action without changing attachment selection. Browser
workspace navigation/search/attachment regression and production build pass.

Post-commit acceptance changes the file between panel preview and expanded read,
verifies the stale-line warning and absent old highlight, then manually navigates
using the current text. Expanded workspace tests and preview/editor workflow
regression pass without further product correction.

## Native desktop preview acceptance

The copied production app now has real Electron acceptance for deferred preview
JS/CSS loaded over file URLs, outside-project text reads via production IPC,
search and focus restoration. A pasted image is opened and zoomed, then saved
through Electron's native download handler to a fixture destination; its bytes
match the stored original. External-profile persistence and restart regressions
pass. This validates a copied production app with local dependencies, not a
signed installer or clean-machine deployment. Clipboard writes are not exercised
by this native acceptance.

Post-commit Electron acceptance reopens the persisted clipboard attachment after
restart, confirms fit mode, removes its fixture file and verifies the missing-file
error with no stale download link. Restoring the file and refreshing recovers the
image and download action. The native regression passes without product changes.

## Go to a line in file previews

Preview text has a line-number control and Ctrl/Command+G. Range validation,
displayed line count, active highlight and scrolling all use the rendered line
array. Valid jumps close text search and focus the selected text; invalid or
out-of-range input preserves the previous location with an error. Truncated
previews label their limited range. Browser keyboard/navigation, existing editor
workflow, narrow-layout acceptance and production build pass.

Post-commit correction gives a selected empty final line a visible box without
adding text to the document. Browser acceptance verifies its geometry and exact
text, plus rejection of zero, negative, fractional, exponential and unsafe integer
inputs. Expanded acceptance and build pass.

## Download original preview images

Decoded image previews expose a download link using their loaded source bytes and
the file basename. Zoom only changes display dimensions; no canvas re-encoding
or second disk read alters the downloaded image. Browser acceptance downloads a
zoomed PNG and compares every byte with its original data URL. Build passes.

Post-commit real-file attachment acceptance verifies basename-only download names,
no download link after decode failure, and byte-for-byte restored downloads after
repair/refresh. Narrow-window preview regression passes. No correction was needed.

## Copy file preview text exactly

Read-only previews offer copy using the loaded text, with an explicit partial-copy
label for truncated files. The shared copy control reports clipboard errors and
permits retry. Rendering no longer appends a newline absent from the original,
so selection and copy agree even with highlighting, CRLF and Unicode content.
Clipboard-mocked browser acceptance, real-file preview regression and build pass.

Post-commit acceptance verifies empty content, trailing newlines, BOM/CRLF and
blank-only files preserve exact rendered and copied text. Narrow-window preview
layout regression also passes. No further product correction was required.

## Responsive file preview layout

Preview-specific layout prevents editor footer flex rules from putting search
controls beside the file body. Search wraps above independently scrolling text;
long paths wrap and the dialog stays within the viewport in both dimensions.
Browser geometry acceptance covers desktop, 390px width and short landscape
windows, including actionable search/close buttons. Styles remain in the deferred
preview CSS. Production build passes.

Post-commit narrow-window image acceptance confirms original-size and zoomed
images scroll within their viewport without widening the dialog; fit and close
remain actionable. Production deferred-resource/loading/failure/cancellation
regression passes. No further product correction was required.

## Preserve focus through file editing

The file editor explicitly focuses its text area on opening and closes its native
dialog before restoring the connected opener on unmount. Preview-to-editor
transitions return to the original message link after editing, rather than an
unmounted preview button. Browser acceptance covers initial focus, clean Escape,
declining to discard dirty content and confirming discard. Build passes.

Post-commit browser acceptance simulates a failed Ctrl+S write, verifies retained
text and editor focus, then retries successfully and checks focus returns to the
message link. Both write attempts carry the original revision and unchanged edit
text. No further product correction was required.

## Load file preview code on demand

The file preview, text search and image controls now load only when a file is
opened. Main JS decreases from 499.98 to 494.88 kB; preview JS (6.19 kB) and image
CSS form deferred resources. Loading/failure uses a closable native modal with
opener-focus restoration. Import failures explicitly require reopening the app:
browser module failure caching makes a same-URL retry unreliable. Production HTTP
acceptance verifies no startup preview requests, deferred JS/CSS, failure closure,
reload recovery and draft retention. Attachment workflow and build pass.

Post-commit production acceptance cancels while the module request is held, then
releases it and checks that no dialog reappears. Reopening succeeds using the
loaded module, with draft and focus intact. No product correction was required.

## Inspect images at original size and zoom

Image file previews provide fit-to-window, original size and incremental zoom
controls, dimensions and scale status. Fit mode limits both width and height;
explicit scales use a keyboard-focusable scrolling viewport. Zoom starts from
the actual fitted display size and is bounded at 10–800 percent (fit may be
smaller). New image payloads reset dimensions, errors and scale. Browser tests
cover rendered dimensions, scrolling, mode changes and payload reset; real-file
attachment/error recovery regression and production build pass.

Post-commit acceptance checks actual fitted-size zoom, both scale boundaries and
a narrow viewport fitting below ten percent. The latter prompted a correction:
entering explicit zoom now clamps to the documented minimum. Expanded browser
acceptance and production build pass.

## Find text in read-only file previews

File previews support Ctrl/Command+F, literal search, case sensitivity, match
counts and cyclic previous/next navigation. Enter/Shift+Enter move from the search
input; Escape closes search and returns focus to the preview. Matching and active
highlight use shared editorMatches UTF-16 offsets. Only the active match is
highlighted, limiting markup for repetitive files. Line references retain their
existing target highlight; truncated previews label the search scope explicitly.
Real-file browser acceptance and production build pass.

Post-commit acceptance covers wraparound, composing Enter, literal punctuation
beside Chinese/emoji text and excluding content beyond the preview boundary.
Existing file-link preview/line-reference regression passes. No product correction
was needed.

## Complete bounded UTF-8 text previews

The file reader accumulates partial reads up to a shared 256 KiB preview/edit
limit and probes one extra byte. Detected growth or shrinkage rejects stale size
metadata. Truncated UTF-8 omits an incomplete trailing character; malformed
encoding is explicitly reported and never editable. Only complete valid text
receives a content revision. Preview UI reports byte counts and editing limits.
Seven reader/file tests cover short reads, multibyte boundaries, invalid/binary
content, size changes and existing edit/path protections. Build passes. Same-size
concurrent rewrites are not a snapshot guarantee; save still checks content hash.

Post-commit real-file browser acceptance confirms a split Chinese character is
omitted without a replacement glyph, byte-limit status is visible and editing is
unavailable. Invalid UTF-8 shows its specific warning; repairing and refreshing
restores editing and clears the warning. No product correction was needed.

## Preview draft attachments before sending

Draft attachment names now use the same preview button and path resolution as
conversation history. Preview and removal are separate accessible controls;
opening a preview neither removes the file nor changes its draft ownership.
Shared styles support wrapping long names. Real-file browser acceptance verifies
draft preview, unchanged selection, explicit removal and independent history
references. Drop/paste regressions and the production build pass.

Post-commit keyboard acceptance found focus was lost when the preview unmounted.
The preview now closes its native dialog and restores the connected opener on
cleanup. Enter-open/Escape-close acceptance passes, as do attachment-only send,
steering/queue regressions and the production build.

## Open attachments from conversation history

Attachment names in user messages open the existing file preview on demand.
Absolute attachments use their own parent directory, so selected files outside
the project and stored clipboard images can be inspected; relative references
use the conversation workspace. No background attachment reads are introduced.
The existing reader supplies image/text/binary handling, refresh, text editing
and path checks (image preview limit 10 MB; text preview 256 KB). Browser tests
use real temporary files for external text, clipboard PNG, missing-file retry
and history reload. Production build passes.

Post-commit correction adds a visible decoding error to image file previews.
Real-file acceptance corrupts then repairs the PNG and verifies refresh removes
the error and restores decoded pixels. Attachment send/steer/queue regression and
the production build pass.

## Reorder paused messages

Paused queue messages offer move-up/move-down actions. Shared neighbor resolution
drives button availability and immutable queue updates: movement stays within the
same conversation, does not wrap and cannot cross an unpaused or sending item.
Other conversations retain their positions. The existing save-before-dispatch
path persists order; failed writes retain the original order. Four queue tests,
browser persistence-failure/retry and reordered turn/start payload acceptance,
and the production build pass. Resume remains an explicit user action.

Post-commit acceptance verifies serialization/restoration retains the new order
and attachments while pausing all restored entries, and inverse movement restores
the original order. Browser in-flight acceptance confirms neither the sending
message nor its paused successor can cross that boundary, including during a
storage failure. No product correction was required.

## Queue editor lifecycle follows the current queue

The editor is identified by message ID and resolved against the current paused
queue item. Removing the item, changing queue scope or transitioning to sending
closes the editor and clears stale edit state, so another queue's resume action
remains available. Returning to the original queue does not restore an abandoned
edit. Browser component acceptance covers scope and status transitions without
unintended saves; full queue workflow regression and production build pass.

Post-commit acceptance verifies ordinary item refresh preserves typed content and
saves to the same message ID, while clearing and refilling the queue neither
reopens the editor nor blocks resume. In-flight dispatch/persistence-failure
regression also passes. No additional product correction was required.

## Remove attachments from queued messages

Queue editing now lists attachment filenames and full paths, and permits removing
an invalid or unwanted attachment before retrying a paused message. Edits remain
local to the dialog until persistence succeeds; cancellation preserves the saved
selection. Empty text requires a remaining attachment or skill. Browser acceptance
verifies failed-save retention, retry persistence and the actual turn/start input
excluding the removed image while retaining the other image. Build passes.

Post-commit acceptance removes every attachment from an empty-text draft and
verifies saving is disabled. Cancel/reopen restores the original text and files.
Expanded browser acceptance and three queue lifecycle tests pass. Static review
also normalizes the filename separator expression to match the existing list.

## Preserve consecutive service warnings

Global service warnings now queue in arrival order instead of replacing an unread
warning. One warning is shown at a time with a pending count; dismissal targets
its stable ID. The close button stays mounted between warnings for keyboard use.
Warnings remain session-local, while thread-scoped warnings retain their existing
conversation persistence. Browser acceptance covers ordered delivery, pending
counts, literal text and background-thread isolation; production build passes.
Upstream image preparation still logs failures without emitting these notifications.

Post-commit browser acceptance verifies identical messages remain separate events,
new arrivals preserve the current warning, and Enter dismisses one warning while
retaining button focus for the next. All warning acceptance cases pass; no further
product correction was needed.

## Paste JPEG, WebP and GIF images

Clipboard image saving now detects PNG/JPEG/WebP/GIF from bytes, reuses attachment
decoders in the background worker and preserves original bytes with the correct
extension. Unsupported, truncated and oversized content is rejected before disk
writes. Animated WebP/GIF retain all encoded frames; validation covers the first
frame. Renderer acceptance covers each supported MIME type, unsupported SVG,
pending-save send blocking, source-draft ownership and save errors. Thirteen
image validation/storage/worker tests and the production build pass.

Post-commit acceptance sends JPEG/WebP/GIF through the real worker, verifies
byte-for-byte saved content and runs attachment preflight on each output.
Truncated, unsupported and oversized inputs leave no extra files. All five worker
tests pass; real Electron PNG clipboard, external data directory and restart
regressions also pass. No additional product correction was needed.

## Copy structured tool results

Tool results provide a copy action using the same complete text serialization as
the expanded structured view. Serialization remains on demand for collapsed
results. Copy is locked while pending, errors are visible and retryable, and a
completion for an older result cannot label an updated result as copied. Browser
acceptance covers long nested output, exact view/copy equality, failure/retry and
delayed completion after result replacement. Production build passes.

Post-commit acceptance verifies null, false, zero and empty content objects retain
their literal JSON representation when copied. Tool media/envelope regression
tests pass without additional product correction.

## Validate legacy migration before writes

Legacy import validates all missing native records before writing any candidate.
A malformed late record reports its storage key and leaves earlier candidates
unwritten, so repairing the source and retrying imports the intended snapshot.
Existing native records take priority even if their obsolete browser copies are
corrupt. Eight storage tests pass. This prevents validation-driven partial imports;
disk failure during writes still uses the existing per-record retry behavior.

Post-commit real Electron upgrade acceptance seeds a corrupt legacy queue and
valid history/drafts. Startup identifies the queue error, creates no native store
and preserves browser drafts. Repairing the queue and clicking retry migrates all
records; cleared-browser-storage, write-failure and backup recovery regressions
also pass. No additional product correction was needed.

## Keyboard model selection

Model search now exposes a combobox/listbox with one active result driving
highlight, scrolling, active-descendant and Enter selection. Arrow keys cycle
through filtered models; selection returns focus to the model button. Empty,
loading or failed catalogs cannot select a model. Opening resets search and
starts at the current model when available. IME key events are ignored.
Browser search, catalog-race and per-thread/queued model tests and build pass.

Post-commit acceptance verifies composing Enter/Escape/arrows preserve the open
picker and highlighted model. During catalog refresh, arrows and Enter cannot
select stale entries and no active descendant is exposed. Both regressions pass.

## Stable command palette selection

Command selection follows command ID rather than list position, so live thread
reordering cannot silently change the Enter target. Highlight, active descendant,
scrolling and execution derive from the same selected result. Removed selections
fall back to the first result; query changes reset selection. Home/End select the
first/last result and arrow keys still wrap. Browser component acceptance covers
reorder/removal/filtering and execution; app command regression and build pass.

Post-commit acceptance exercises every navigation key and Enter with an empty
result set: no active descendant, highlight or execution remains. Clearing the
filter restores the first result, and ArrowUp wraps to the last. Tests pass with
no additional product correction.

## Conversation search shortcut scope and plugin references

Conversation find and application shortcuts share one scope predicate: handled,
repeated, composing/IME and Alt-modified keys, modal dialogs and terminal targets
do not trigger app navigation. Ctrl/Command+F also leaves Shift-modified shortcuts
alone. Search includes plugin names and IDs alongside text, files, skills and
tool records. Browser acceptance covers guards, plugin matches, cyclic navigation,
streaming scroll retention and conversation reset; app shortcut regression and
production build pass.

Post-commit acceptance opens the application's rename dialog and confirms Ctrl+F
keeps focus inside it without opening background search. Closing the dialog
restores normal search. Paginated full-history loading and failed-reload transcript
retention regression pass; no additional product correction was needed.

## Load scheduled tasks on demand

The scheduled page and its stylesheet now load only when opened. A local Suspense
boundary preserves the app shell during loading; a failed resource load offers
return to chat without resetting drafts. Production request interception verifies
no scheduled JS/CSS on chat startup, delayed loading, explicit failure and draft
retention. Task Provider/catalog/save regression passes. The production entry JS
drops from about 521 kB to 492 kB; shared chunks and the deferred page still count
toward total application size. Build passes without the previous chunk warning.

Post-commit real Electron acceptance restarts the external profile, opens the
deferred page through file URLs, observes the actual JS request and installed
stylesheet, and displays the persisted task. Native attachment and restart
regressions pass. No additional product correction was needed.

## Persist effective model changes

The main process observes thread/settings/updated and saves the engine-confirmed
model to the existing Provider binding. Previously only lifecycle operations
updated this record, so selecting another model for a later turn could revert on
cold resume. Unknown threads, mismatched Providers, malformed models and updates
during migration are ignored. Disk failures preserve the effective in-memory
model and emit a thread warning without misreporting an accepted turn as failed.
A later confirmation or lifecycle save retries persistence.

Real Codex acceptance changes the model after Provider migration, verifies the
HTTP model request, restarts the process and verifies the next request retains
that model. Nine notification/failure/migration tests and production build pass.

Post-commit real-engine acceptance forks after the model change and confirms the
fork's HTTP request uses that model. A separate thread/settings/update then
changes the source model without sending a turn; its applied notification updates
the binding, and cold resume plus the next HTTP request retain the new setting.
No additional product correction was needed.

## WebP and GIF attachment preflight

WebP/GIF attachments now decode first-frame pixels in the image worker using
sharp/libvips, with a 16 MiB input cap, 16 Mi-pixel limit and a 10-second native
pipeline timeout. Decoder caching is disabled and native concurrency is one.
GIF logical screen dimensions are checked before decoding because the decoder
can normalize them to a smaller first-frame extent. Format mismatches fail.
PNG/JPEG retain their existing validators. Animation beyond the first frame is
not validated or presented as a video input.

Build, decoder/worker tests and browser failure/repair checks pass. A real Codex
process delivers PNG, JPEG, WebP and GIF to the local HTTP model with correct
decoded pixels. Windows directory packaging includes sharp's architecture-specific
native module and DLLs. Relocated packaged acceptance verifies valid WebP/GIF
reach Provider validation, corrupt images are rejected by production IPC, and
bundled app-server, native terminal and reminder restart regressions still pass.

Post-commit acceptance generates two-frame WebP/GIF animations, confirms both
frames exist and verifies the first-frame pixel extent/color. Mislabeled PNG
content fails under either extension. An actual 4097-by-4097 WebP is rejected by
the pixel limit. All four decoder tests pass; no product correction was needed.

## Background image processing

Attachment validation and clipboard PNG validation/storage now execute in a Node
worker, keeping pixel decoding off Electron's main thread. One worker runs at a
time with at most eight accepted jobs, a 15-second execution timeout and a 192 MiB
V8 old-generation limit in addition to the existing byte/pixel/decoder limits.
Each job gets a fresh worker; timeout or abnormal exit rejects its request and
allows subsequent jobs to proceed. Application shutdown rejects queued work and
terminates the active worker. No model request is dispatched before validation.

Seven worker/decoder/storage tests, build and production Electron clipboard,
attachment, rejection and restart acceptance pass. Fault fixtures prove timeout,
queue backpressure, abnormal exit recovery and cancellation while the parent
event loop remains responsive. Native clipboard acceptance waits for the actual
attachment chip before checking its durable record. Forced termination during a
clipboard write can leave an unreferenced file; attachment cleanup remains open.

Post-commit production Electron acceptance submits two memory-heavy JPEG checks
and confirms window-state IPC responds before both validations finish; both then
report the expected decoder memory-limit error. The real Codex image transport
test now uses the worker service and verifies PNG/JPEG pixels at the HTTP model.
No additional product correction was needed in these acceptance checks.

## JPEG attachment decoding preflight

JPEG/JPG attachments now receive strict jpeg-js pixel decoding before turn/start
or turn/steer, with a 16 MiB file limit, 16 megapixel limit and 128 MiB decoder
memory budget. The packaged desktop includes the pure-JavaScript decoder. PNG
validation remains in place; WebP/GIF still only receive readability checks.

Build and file tests pass valid uppercase JPEG extensions, truncated/corrupt
content, excessive dimensions and oversized files. Browser acceptance wired to
the actual validator retains text and attachment on rejection, then dispatches
exactly once after repair. A real Codex process accepts preflighted PNG and JPEG
and delivers both images to a local HTTP model with their decoded pixels intact.

Post-commit acceptance exercises the production Electron preload and main-process
IPC: corrupt JPEGs are rejected for both start and steer before app-server access.
A crafted frame within the pixel limit hits the decoder's memory budget instead
of allocating without a bound. PNG repair/send, clipboard storage and external
profile restart regressions pass. No additional product correction was needed.

## Native conversation and draft storage

Desktop conversations/settings, text/attachment/plugin/skill drafts and the turn
queue now live under the application data directory's renderer-storage folder.
Startup imports missing records from legacy localStorage before mounting the app;
existing native records take precedence and old browser records remain untouched.
Browser-only development keeps its localStorage fallback.

Each store validates JSON, writes a unique temporary file, fsyncs it and renames
it into place, retaining the previous valid record as a backup. Ordinary writes
use async IPC and coalesce pending snapshots; queue changes require synchronous
main-process persistence before exposing a transition that can dispatch work.
Shutdown drains accepted writes. Startup recovers a corrupt primary from backup
with a visible warning; unreadable primary and backup block startup and offer
retry instead of overwriting records with an empty app state.

Build, six filesystem tests, four title tests and browser state/draft/attachment/
plugin/queue regressions pass. Real Electron validates migration of all six
stores, native writes, clearing localStorage, multiple restarts, corrupt-primary
recovery and the existing external-profile/clipboard workflow. Records are
independent snapshots bounded to 64 MiB each, not a transaction across stores or
a guarantee against disk failure/power loss. An interrupted unacknowledged write
may lose the latest change; restored queues remain paused for review.

Post-commit real Electron acceptance blocks the actual draft destination with a
directory, verifies the save failure preserves editor text, then repairs the
destination and retries successfully. Corrupting both primary and backup blocks
the composer without changing either file; restoring the primary and using the
startup retry opens the preserved conversation and draft. No additional product
fix was needed for these acceptance cases.

## Switch an existing conversation's Provider

Idle conversations can switch Provider without replacing their thread ID, local
history or drafts. The main-process router checks the engine's thread status,
unsubscribes and resumes with an explicit Provider definition. A distinct engine
Provider name confirms the override took effect before the binding is persisted.
Concurrent operations are blocked during migration; failure restores the previous
engine configuration, and failed rollback blocks requests until service restart.
The selector is disabled for running conversations and nonempty message queues.
Migration keeps the current model if available in the target catalog, otherwise
selects the first available target model and applies it to both engine and UI.

Build, four migration fault/concurrency tests, browser migration/reload/catalog
checks and a real Codex process test pass. Two local HTTP model services verify
new address and credentials, previous assistant history in the new request,
binding reload, fork inheritance and switching back. This validates routing and
history transfer, not the quality of any hosted model.

Post-commit acceptance found custom models reverted to the engine default after
cold resume. Bindings now persist the confirmed model and supply it on resume and
fork; rollback restores the previous model too. A real process exit/restart and
next HTTP request prove target model, address, credentials, prior history, sandbox
and approval policy survive. Browser navigation during a delayed migration keeps
the destination draft separate and restores the source's target model on return.
Six concurrency/fault tests cover active/pending operations, ignored overrides,
write failure and failed rollback. Build and new-thread Provider regression pass.

## Paste clipboard screenshots

PNG clipboard images are validated and saved with unique names under the Felix
data directory, then added to the originating attachment draft. Normal text paste
is left to the editor. PNG decoding, CRC, byte and pixel limits use the shared
preflight validator. Save errors remain visible without adding a broken path.

Build, storage/validator tests and real Electron acceptance pass IPC byte transfer,
actual PNG files, attachment display and restart persistence. Browser acceptance
holds a save across conversation navigation and verifies source-draft ownership;
failed saves add nothing and text paste is not intercepted. Post-commit review
preserves an existing file if exclusive creation ever reports a name collision.
Clipboard images currently require PNG; other formats use the attachment picker.
Saved images are retained for history/draft references; automatic cleanup of
unreferenced attachment files is not implemented.

Pending clipboard saves block sending, steering and enqueueing in their source
draft until all saves finish. A synchronous send guard also covers Enter before
the disabled state renders; other conversations remain usable. Post-commit
browser acceptance passes delayed saves, failure recovery and two overlapping
saves: finishing the first keeps sending disabled, finishing the second releases
it, and neither dispatches a turn automatically. Real Electron file storage and
restart persistence regression also passes.

## Drag files into the composer

The composer accepts dropped local files through Electron webUtils.getPathForFile,
adds them to the current attachment draft and deduplicates paths. File drags show
an outline; dropping prevents browser navigation and never sends automatically.
Missing native paths produce an error and add nothing. Text-only drags retain
normal editor behavior. Existing attachment removal, persistence and send paths
remain in use.

Build and browser acceptance pass multiple files, repeated drops, navigation
prevention, per-draft ownership, no turn dispatch and missing paths. Post-commit
real Electron acceptance uses a real File from a file input, resolves its spaced
local path through the production preload, dispatches a drop into the actual
composer and checks its attachment chip. A virtual File returns an empty path.
The external-profile restart regression also passes. Physical OS drag gestures
were not automated; this covers the native File bridge and DOM drop workflow.

## Image attachment preflight and draft retention

Before turn/start or turn/steer reaches app-server, Felix checks local image
readability and validates PNG pixels/CRC with pngjs. PNG input is bounded to
16 MiB and 16 megapixels before decoding. Missing/corrupt images return a visible
send error instead of reaching the engine as omitted-image text. The desktop
bundle includes the decoder; other formats currently receive readability checks
only. Files can still change after preflight; this is not a byte snapshot.

Post-commit browser acceptance connected to the real validator exposed lost text
on first-send thread creation. Text drafts now migrate with attachments and clear
only in the originating thread after success. Corrupt PNG blocks dispatch and
retains both text and attachment; repairing it permits exactly one dispatch.
Attachment/steering/queue and storage-failure browser regressions, real PNG/JPEG
transport, validator tests and build pass. Upstream image-preparation warning
notifications remain separate unfinished work.

## App-server warning notifications

The protocol's warning notification is now visible: global messages remain in
a dismissible banner, and thread-targeted messages persist as literal system
records in that thread. Warnings for unloaded threads create a background local
entry without changing selection. Subsequent warnings reuse that entry; invalid
or blank message fields are ignored.

Build and browser acceptance pass literal HTML handling, dismissal, background
routing, persistence across reload, repeated target IDs and invalid messages.
Notifications are injected through the browser bridge for this acceptance.
Inspection confirms image_preparation currently logs processing failures and
substitutes placeholder text without emitting this warning notification. Image
processing errors therefore still need a separate upstream notification path;
this delivery does not claim that gap is closed.

## Real multimodal attachment transport

Acceptance now exercises the production userInput serializer, a real Codex
app-server process, the Responses-to-Chat adapter and a controlled local model
endpoint. Browser-generated PNG and JPEG files (including a spaced filename)
reach one request as two image_url data payloads alongside the original prompt.
Both payloads decode to 128x128 images with the expected green/red pixel regions;
the endpoint receives the expected Authorization and the completed reply returns.
The process is stopped and awaited, and HTTP/browser resources are closed.

Initial acceptance exposed an invalid legacy test PNG: Codex replaced that image
with an explicit processing-error text. Valid browser-generated assets pass;
this was a fixture defect and required no product change. Three attachment/live
tests pass. This proves image transport, not hosted vision quality, generation,
audio input or video support. Corrupt-image feedback in the UI remains a gap.

## Scheduled run result export

Finished task runs offer copy and UTF-8 text export with task name, start time,
status, error and original output. Running results disable both actions. Export
uses the desktop save dialog with a task-specific title; cancellation produces
no success notification and failures remain visible for retry.

Acceptance: the production-build UI backed by TaskScheduler verifies identical
copy/export payloads, save failure/retry, cancellation and failed runs without
output retaining their error. Full task CRUD/recovery/layout regression and build
pass. Clipboard and save-dialog responses are mocked in this browser acceptance;
actual UTF-8 writing is covered by the shared terminal export backend tests.

## Main-process workspace usage checks

Worktree removal now checks main-process terminal directories and the active
scheduled agent task immediately before starting Git removal. Terminal directory
ownership lasts until the PTY actually exits, including asynchronous close.
Canonical native paths handle Windows short-name aliases and subdirectories.
Tasks without an explicit cwd protect the default project directory.

Acceptance: a real temporary Git repository refuses removal while terminal/task
usage is present and removes successfully after release. A real PowerShell PTY
test verifies protection before and during close, then release after exit. A real
TaskScheduler with a held runner verifies protection from run start to completion.
Build passes. These are pre-removal checks, not a cross-process lease: external
processes and new work started after Git removal launches remain outside scope.

## Worktree protection for conversation activity

The worktree panel disables deletion when another local conversation is running,
sending, restoring or retains queued input in that directory or a subdirectory.
Confirmation rechecks current activity; a turn starting after confirmation opens
disables deletion immediately. Windows drive/UNC paths match case-insensitively.

Acceptance: browser notifications start a background turn with a differently
cased Windows subdirectory, disable both deletion controls without an IPC call,
then complete the turn and permit normal cancellation/failure/retry/removal.
Reloaded paused queues also protect the directory. Real temporary Git repository
creation/deletion/data-protection regressions and production build pass.
This is renderer activity protection, not a cross-process directory lock: other
windows, external tools, terminal processes and scheduled runs are not covered.

## Authoritative thread Provider restoration

Thread start, resume and fork now return the Provider ID after its binding has
been persisted by the main process. The renderer uses this response for new,
restored and forked conversations. This closes the legacy-thread race where an
independent binding read completed before resume established the binding. Late
compatibility reads cannot overwrite an already resolved Provider.

Acceptance: the real app-server routing fixture checks returned Provider IDs for
all three lifecycle operations alongside actual endpoint/credential isolation.
The browser restores Beta from resume while holding a binding read, then releases
an outdated Alpha result and verifies Beta remains selected and persisted.
Production build passes with the existing bundle-size warning.

## Scheduled task model catalogs

Task editors now query models independently for their selected Provider instead
of borrowing the active chat catalog. Changing Provider retains the old model
as unavailable until a valid model is selected. Failed reads are visible, block
agent-task saving and support refresh/retry. Legacy tasks explicitly show that
they follow the globally active Provider; missing bindings display their ID.

Acceptance: browser checks select Beta, inject catalog failure, retry and verify
the saved Provider/model pair. The production-build UI with a real TaskScheduler
passes CRUD, run/cancel/failure, output persistence, restart, legacy unbound-task
editing and responsive/dark checks. Acceptance found and fixed titlebar overflow
at 390px by reducing window-button widths on the narrow scheduled page. The
build retains its existing main-bundle size warning. Hosted inference remains
outside this UI acceptance.

## Provider-scoped model catalog and credential checks

The conversation's bound Provider (or the new conversation's selection) now
supplies the model catalog and send-time credential check. Previously these
still used the globally active Provider, blocking a valid bound conversation
or offering unrelated models. The main process resolves explicit IDs through
the registry, including manual model IDs, without fallback for missing entries.

Post-commit acceptance: the full browser workflow selects Beta while globally
active Alpha has no credentials, sends Beta's distinct model, reloads, and sends
again on the original remote thread with Beta credentials checked. This uses a
mocked desktop bridge. Existing catalog race, new-thread selection and binding
restoration browser checks pass. Real app-server routing and registry regressions
also pass; production build passes with the existing bundle-size warning.
Migration of an already loaded thread to a different Provider remains pending:
changing only the binding file cannot retarget the engine's loaded endpoint.

## Scheduled tasks bind to a Provider

Agent scheduled tasks now persist a validated `providerId`. Each run resolves
that Provider at startup and keeps its credentials and endpoint for the entire
run, so changing the global active Provider does not reroute an existing task.
Legacy tasks without a binding remain compatible. The real routing acceptance
passes for two local Providers, including authorization headers, and a removed
bound Provider fails explicitly without fallback.

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

提交后验收：浏览器模拟两个已配置渠道，新会话切换到 Beta 后 thread/start 携带 providerId=Beta；远端线程创建后会话渠道选择器锁定。生产构建与浏览器验收通过，无额外产品修正。历史线程显示绑定渠道但本轮未提供迁移入口。

提交后验收：浏览器以无 providerId 的本地历史线程重载，threadProvider IPC 返回 Beta 后会话渠道选择器更新为 Beta 并保持禁用；生产构建和此前新线程选择回归通过。无额外产品修正。
## 本机操作记录

设置页新增“操作记录”，使用与会话草稿相同的持久化桥接，按时间倒序保存最近 200 条结构化事件。当前记录新建/切换会话、渠道切换、工作区服务重启以及回合开始/结束；不记录消息正文、附件内容或密钥。支持关键词搜索、清空和写入失败重试；原生存储对记录数组、字段类型和数量进行校验，损坏或超限数据不会覆盖原文件。

验收：`audit-log-ui.cjs` 覆盖持久化、搜索、清空、动作记录和正文不落盘；`renderer-storage.test.cjs` 覆盖上限和严格校验；生产构建通过。该记录是本机操作追踪，不宣称为跨设备或服务端审计日志。
## 审计事件覆盖扩展

在本机操作记录基础上，补充会话生命周期和安全操作事件：重命名、归档、删除、分叉、会话权限修改，以及服务请求审批结果。事件只保存动作类型和受限标识，不保存消息正文、问题答案、命令内容或密钥；写入仍经过同一串行持久化队列和原生数据校验。

验收：`audit-lifecycle-ui.cjs` 验证重命名与归档事件顺序及正文隔离；`audit-log-ui.cjs`、`renderer-storage.test.cjs` 和生产构建回归通过。

修正验收：补齐侧栏归档和消息级分叉记录；会话切换详情改用本机 ID，避免自动标题或消息内容进入审计日志。生命周期、审批失败重试、存储校验和生产构建回归通过。

会话变更一致性修正：归档恢复纳入审计；断线时远端归档/删除不再伪造本地成功，纯本机会话仍可离线归档。浏览器与构建验收通过。
## 附件选择阶段图片预检

Electron 附件选择现在复用发送阶段的 PNG、JPEG、WebP、GIF 校验器，在损坏、超限或像素过多的图片进入草稿前给出解码错误。非图片文件不经过图片解码，继续作为普通附件保留；多选时只移除失败图片，不影响同批其他文件。

实现提交：`191cf73`。
验收：`attachment-picker-preflight-ui.cjs`、`attachments-ui.cjs`、`attachment-preflight-ui.cjs`、`attachment-storage-ui.cjs` 和生产构建通过。实际图片字节校验仍由主进程完成，浏览器测试模拟 IPC 返回并覆盖 UI 保留规则。

Provider 配置审计：保存、启用和删除成功后记录不含密钥、地址或模型正文的事件；失败和取消不记录成功动作。相关 UI、注册表和生产构建验收通过。

## 项目上下文审计

项目选择器现在由 App 层统一处理：成功打开文件夹或切换已有项目后创建对应工作区线程，并写入 `切换项目` 本机审计事件。项目事件仅保存动作和时间，不保存项目 ID、名称、绝对路径或其他工作区内容；取消选择和选择器失败不记录成功事件。

实现提交：`d993da0`。
修正提交：`c95f01b`，补齐从 Git 面板创建工作树后的项目切换审计。
验收：`workspace-ui.cjs`、`project-audit-ui.cjs`、`worktree-ui.cjs`、`audit-log-ui.cjs` 和生产构建通过。验收记录见 `desktop/tests/project-audit-verification.md`。

项目审计验收纠正（749c26b）：主进程选择文件夹、创建及打开工作树均将绝对路径作为项目 ID，旧测试的虚构 ID 未覆盖真实数据形态。取消此前“保存 ID 即脱敏”的结论。现在项目事件不写详情，历史项目事件加载后移除详情并通过串行存储队列保存，失败保留错误并支持重试。Windows 路径形态、已有项目选择、工作树创建/重新打开、历史清理及重试均已验收。清理针对当前操作记录，不保证擦除旧存储备份或外部副本。
## Agent 关联会话导航

计划与交付（f35874e）：打开 Agent 会话后，可直接返回有协作记录的来源会话；从已加载记录推导并去重，排除归档会话，显示工作区以区分同名来源。复用既有切换、服务端恢复和独立草稿。由于协作可能是发送消息或等待，入口明确标为关联会话，不声称父子关系。

验收：关联导航、实时协议活动、Agent 控制、命令面板会话切换、2 项协议单元测试和构建通过；重载、草稿隔离、窄窗口均已覆盖。仅覆盖已加载历史，不额外扫描服务端所有会话，也不证明真实模型协作执行。详见 tests/related-threads-verification.md。

## 会话恢复失败重试

计划与交付（fa5c6e4）：远端会话恢复失败显示持久错误及重试入口，成功前阻止发送并暂停该会话队列，保持草稿可编辑；其他会话不受影响。重试成功后使用确认的工作区，不自动重发消息。提交后清理退出恢复流程时的忙碌标记，防止切换本机会话后服务操作仍被锁定。

恢复重试、队列 FIFO/防重放、关联导航和生产构建验收通过。包含迟到失败与草稿隔离测试，使用模拟 app-server；详见 tests/thread-restore-retry-verification.md。

## 通知设置失败重试

实现 146b153：初次读取失败提供原地重试；保存失败保留已确认设置并可重试原提交，等待期间禁用编辑及重复保存。校验四项设置均为布尔值，拒绝异常响应。notification-settings-ui.cjs 覆盖加载失败、保存失败、延迟保存、重试参数一致、页面重开及格式错误恢复；conversation-notifications.test.cjs 验证持久化和通知过滤；生产构建通过。UI 模拟 IPC，不声明系统通知实际展示已实机验证。提交后扩展格式错误验收通过，无额外产品修正。

## 命令面板按项目新建会话

计划与交付（cd6ca39）：命令面板列出已保存项目，按名称/路径搜索，以本地或工作树及完整路径区分同名项目；执行后复用项目切换流程，创建绑定项目与 cwd 的空白会话并聚焦输入。原会话草稿保留，审计不记录路径。

验收：palette-projects-ui.cjs 覆盖同名筛选、工作树绑定、一次创建、草稿保留、取消无副作用和重载；command-palette-ui.cjs、palette-conversations-ui.cjs、workspace-ui.cjs 回归及生产构建通过。提交后无需产品修正。仅列出已保存项目，不扫描磁盘或验证目录当前存在。

## 归档恢复并发与关闭保护

计划与交付（05a4ab0）：归档恢复使用独立锁，列表刷新或连接变化不会解除恢复锁；恢复进行中禁止关闭按钮和 Escape，防止丢失错误/成功反馈。失败解锁并保留条目供重试，远端会话在离线时不发恢复请求。

archive-restore-lock-ui.cjs 用延迟 IPC 验证断线重连、关闭保护、失败重试和一次成功回调；archived-threads-ui.cjs 验证搜索、分页及历史保留，生产构建通过。模拟桥接验证不代表所有实际网络故障已覆盖。
提交后验收：app-shortcuts-ui.cjs 与 offline-thread-mutations-ui.cjs 回归通过，弹窗快捷键隔离和离线会话保护保持有效，无额外产品修正。

## 会话列表响应校验

实现 465b766：普通列表与归档列表共用 threadPage 校验；拒绝非数组列表和非字符串分页游标，过滤无效 ID，清理非字符串标题、预览、工作区和片段。无效页面不覆盖已有列表，保留重试入口；兼容旧 threads 数组响应。

验收：3 项 thread-page.test.cjs、thread-list-ui.cjs、archived-threads-ui.cjs 和生产构建通过。提交后归档测试加入空条目、对象标题/路径、无效游标、失败保留条目和刷新恢复，全部通过。没有新增产品修正；测试覆盖模拟协议数据，不代表所有服务端异常组合。

## 侧栏工作区标识与窄窗口完整验收

95d497b 增加会话工作区副标题和可访问描述，支持区分同名会话。92f9a32 更新旧侧栏验收夹具并修复 600px 工作模式标题栏横向溢出，保留全部菜单和窗口按钮。完整 sidebar-ui.cjs、工作区副标题专项测试与构建通过，截图已检查。测试使用模拟服务，不等于全部原生窗口环境验收。

## 用户消息原文复制

实现 12a37c3：用户消息提供复制按钮，直接复制已保存正文，保留空白、换行和 Markdown，不拼接附件/技能/插件路径；空正文禁用。成功提供可访问反馈并自动复位，剪贴板失败显示提示并允许重试，重复待完成请求被锁定。

user-message-copy-ui.cjs 覆盖原文保真、键盘操作、失败重试、空正文和反馈复位；生产构建通过。剪贴板在浏览器测试中模拟，不宣称所有原生系统权限场景已验证。
提交后验收：message-actions.test.cjs 的 4 项复制/分叉回归通过，无额外产品修正。

## 会话查找输入法保护

实现 8378546：查找输入框在 composition 会话、isComposing 或 keyCode 229 时不处理 Enter/Escape，避免确认候选词导致结果跳转或关闭。失焦、关闭和会话重置会清除组合输入状态。

验收：conversation-find-ui.cjs 先复现 keyCode 229 确认触发错误跳转，修复后通过；提交后补充失焦及关闭重开恢复普通 Enter 操作。首次失焦夹具遗漏聚焦，补正为真实聚焦→组合输入→失焦顺序后通过。conversation-history-find-ui.cjs、app-shortcuts-ui.cjs 与生产构建通过。覆盖浏览器合成输入法事件，尚未代表全部原生输入法实机验收；构建仍有既有大包提示。

## 独立存储适配器：第一阶段

实现 1ead359：createAsyncStorage 注入原生桥接和浏览器存储，每个实例独立持有快照；persistentStorage 仅负责连接运行环境。读取返回最新本地意图，异步写入完成才确认持久化，失败向调用者传播。写入立即发送给主进程，由既有主进程顺序写入和退出 flush 负责落盘；队列保留同步确认接口，普通异步接口拒绝队列写入。初始化复制响应快照，避免后端对象变更隐式修改缓存。

验收：5 项 async-storage 单测验证并发确认、失败恢复、实例隔离、初始化重试、迁移优先级、浏览器配额失败及队列保护；9 项原生存储单测通过。state-storage、draft-storage、queue-storage 浏览器回归通过，生产构建通过（既有大包提示）。renderer-storage-electron 在临时安装目录与独立 profile 中验证真实迁移、清空浏览器存储后读取、原生保存重试、备份恢复和损坏数据启动保护，全部通过。

这是底层适配器抽离，尚未完成领域级 ThreadStore、项目与自动化接口的统一；不代表签名安装包和全部平台发布验收。

## 会话读取失败保护

实现 4847aaf：loadState 不再把读取或解析失败静默转换为空会话；校验顶层对象、会话/消息正文结构及项目/自动化数组。StorageGate 在挂载会自动保存的 App 前执行读取校验，失败保留原始数据并显示重试入口；缺省字段仍可使用默认值，旧标题迁移保持兼容。

验收：state-load-recovery-ui.cjs 覆盖损坏 JSON、null/数组顶层、空会话条目、异常消息正文、项目/自动化容器损坏和底层读取抛错，均不挂载编辑器且无自动写入；修复数据后重试恢复原消息与主题。4 项标题兼容单测、state-storage-ui.cjs、生产构建通过；真实 renderer-storage-electron 迁移、重启、保存重试、备份恢复和损坏启动保护回归通过。此处为核心结构保护，并非全部领域字段的完整 schema；领域级状态接口抽离仍待继续。

## 异步应用状态仓库

实现 24184f5：StateRepository 提供异步 load/save，支持注入同步或异步键值后端；store.ts 只保留纯状态解码和会话变换。StorageGate 完成读取验证后把快照传给 App，App 不再重复访问存储。保存先捕获快照，再等待持久化确认；拒绝沿现有保存失败提示与重试流程处理，过期保存反馈仍受 effect 清理保护。

验收：4 项 state-repository 单测验证延迟加载、失败/损坏读取重试、保存确认与快照隔离，4 项标题兼容测试通过；state-load-recovery-ui 增加成功恢复时仅读取一次的断言，通过。state-storage-ui、生产构建、真实 renderer-storage-electron 迁移/重启/备份恢复回归通过。当前是整个应用快照的仓库边界，尚未替代远端会话操作与项目/自动化各自的领域服务接口。

## 删除会话等待确认与失败重试

实现 2ed779c：删除确认使用原生模态框，默认聚焦取消；远端删除完成前锁定按钮及 Escape，同步锁阻止重复请求。失败保留对话框、错误和原会话供重试；仅成功后移除本地会话并记录一次删除操作。离线远端删除仍不请求服务，用户可取消回到会话。

验收：delete-thread-ui.cjs 使用延迟模拟协议响应验证重复点击、等待期间 Escape、失败不删除/不记录审计、原地重试与成功关闭。提交后增加空闲 Escape 取消、焦点回到触发按钮、Ctrl+F 模态隔离；均通过。offline-thread-mutations-ui、app-shortcuts-ui、完整 sidebar-ui 与生产构建通过。此轮验证使用模拟删除接口，不代表服务端实际永久删除和全部网络故障验收。

## 统一归档并发与当前会话保护

实现 7acaafc：工具栏与侧栏共用 archiveConversation 和按本地会话 ID 的同步请求锁。重复点击只发一次归档请求，失败解除锁并允许重试。成功只清除被归档会话的选中状态和对应远端标识；等待期间切换到另一会话时，其选择、正文与草稿保留。工具栏不再继续显示已归档的当前会话。

验收：archive-concurrency-ui.cjs 覆盖同 tick 重复点击、跨入口重复请求、等待期间切换、失败重试及一次成功审计；补充两条会话归档后正文与草稿持久化断言通过。offline-thread-mutations-ui、archived-threads-ui 和生产构建通过。thread-archive-live.test.cjs 使用隔离 profile、真实 app-server 与本地模型替身验证归档、分页和恢复通过；不代表真实云模型或全部网络故障矩阵。

## 归档/删除与待发送队列生命周期

实现 ae3cad7：归档或删除前先用同步队列接口持久化暂停目标会话的排队消息；队列保存失败则不发远端 mutation。操作请求期间以会话 ID 加入发送锁，回合完成、重连或队列 effect 不会派发下一条。归档失败保留暂停队列和会话供重试；归档成功保留暂停队列，等待用户明确继续；删除成功才清理目标会话队列。发送中的会话仍被拒绝归档/删除。

验收：thread-lifecycle-queue-ui.cjs 对归档、删除分别注入队列配额失败、延迟远端响应、失败响应和回合完成通知，验证零 mutation、无派发、正文保留、归档保留队列及删除清理队列。archive-concurrency-ui、delete-thread-ui、turn-queue-ui、queue-inflight-ui 与生产构建通过。协议为模拟桥接，真实 app-server 的归档恢复由前一交付覆盖；未宣称远端删除与队列的全部网络故障矩阵。

## 损坏队列整份保护

实现 2f37a2c：restoreQueue 对坏 JSON、非数组、无效条目、重复/空标识及无效插件/附件/技能字段抛出错误，不再返回空队列或静默过滤。useTurnQueue 的既有读取失败锁因此生效：拒绝写入和派发，保留原始数据，修复后可重试读取；成功恢复仍全部暂停，未知发送结果保留检查提示。

验收：5 项 turn-queue 单测，queue-storage-ui 的坏 JSON/容器/条目与正常记录混入坏附件场景通过，验证暂停和重试不覆盖原始字节、修复后恢复正文且不自动发送。turn-queue-ui、thread-lifecycle-queue-ui 与生产构建通过。此轮故障注入针对渲染端恢复边界，并非所有存储硬件故障验收。

## 技能选择保存重试

实现 f58e228：技能草稿保存失败提供“重试保存技能选择”，重试当前全部会话的最新技能快照；失败期间仍保留内存选择与会话隔离，清空选择同样可重试持久化。

验收：skill-storage-ui.cjs 注入配额失败，覆盖重复失败重试、删除一项、切换会话、恢复写入、刷新后读取及清空后重试；其他会话选择保持不变。skill-composer-ui.cjs 的选择去重、纯技能发送、追加指令和队列派发回归通过，生产构建通过。此轮补齐写入重试入口，不包含技能草稿损坏读取的完整保护。

## 技能草稿读取保护与合并恢复

实现 e9888bc：技能草稿整份校验，读取或解析失败暂停写入并显示“重试读取技能选择”。失败期间允许内存选择；读取修复后的记录时，以这些最新选择（包括明确清空）覆盖对应会话，保留其他会话恢复出的记录，再启用保存。

验收：skill-read-recovery-ui 的坏 JSON/null/数组/混合坏条目均保持原始字节，失败重试不覆盖；恢复合并保留编辑、清空和其他会话技能。实际 App 的重试按钮与恢复技能标签通过；skill-storage-ui、skill-composer-ui 和构建回归通过。本轮覆盖渲染端读取保护，原生磁盘损坏仍由启动存储保护处理。

## 共用草稿存储与读取失败恢复

实现 9eb6ffd：消息、附件、插件、技能四类草稿共用 useDraftStorage，类型包装仅声明键名、有效值与空值策略。整份读取校验失败暂停写入并提供对应重试入口；失败期间的编辑与明确清空保留，修复后合并未编辑会话的数据。消息/附件/插件仍删除空条目，技能维持既有空数组格式。保存失败重试和迟到反馈隔离保持一致。

验收：draft-read-recovery-ui 覆盖消息/附件/插件的坏 JSON、null、数组、混合坏条目，以及最新编辑、清空和其他会话合并，实际 App 三种重试入口通过。skill-read-recovery-ui、draft-storage-ui、attachment-storage-ui、skill-storage-ui、plugin-drafts-ui 和生产构建通过；真实 renderer-storage-electron 迁移、重启、保存重试、备份恢复与损坏启动保护通过。此抽离统一草稿持久化，不等于所有远端领域服务接口已完成。

## 会话置顶操作记录

实现 9385646：侧栏与命令面板共用置顶处理入口，记录置顶/取消置顶动作，不记录标题、正文、路径或其他详情。操作记录说明同步更新。

验收：pin-audit-ui 验证侧栏置顶、命令面板取消、各一次记录、隐私字段缺失、刷新状态与记录恢复；提交后增加按取消置顶搜索，通过。audit-log-ui、audit-lifecycle-ui 与生产构建通过。这里只补齐置顶动作覆盖，完整审计范围仍待逐项核对。

## 按回合隔离停止请求

实现 d5fa15c：useTurnInterrupt 按会话/回合锁定中断请求，等待期间停止按钮禁用并标记 busy。失败在对应会话回合显示持续提示，可再次点击停止重试；迟到错误不显示到另一会话或后续回合。请求确认不冒充回合完成，运行状态仍由协议事件更新。

验收：turn-interrupt-ui 覆盖同 tick 重复点击、跨会话独立停止、迟到失败隔离、返回重试、完成事件隐藏按钮及下一回合使用新 turn ID；turn-queue-ui 与生产构建通过。本轮为模拟桥接故障注入，不代表所有真实工具进程中断语义已验证。

## 真实流式回合中断与继续验收

验证实现 55ff8e5：隔离 profile 启动真实 app-server，本地 HTTP 模型替身持续保持首个响应流；收到 agentMessage delta 后中断，断言 turn/completed 状态为 interrupted。随后同一会话启动新回合并正常完成，thread/turns/list 保留两个正确状态。

提交后验收改用 Felix codexClient.interruptTurn 封装调用真实服务端，补充 thread/resume 验证中断状态与后续完整正文，均通过；turn-interrupt-ui 回归通过。此项只验证模型流中断、会话继续及历史恢复，未执行外部工具进程，因此不宣称所有子进程终止语义或云模型网络取消已验证。无产品修正，未重复构建。

## 会话后台命令管理

实现 094bef0：远端会话提供后台命令折叠区，手动刷新、分页查看命令与工作目录，逐项终止。列表/终止失败保留状态供重试，请求锁阻止重复操作；断线禁用请求，切换会话使用独立组件实例隔离迟到响应。终止返回 false 时明确提示已退出。

最初真实测试证明 turn/interrupt 后 PowerShell 进程仍存活；上游 unified_exec 明确保留后台进程，因此新增独立管理入口。command-interrupt-live 在隔离 profile 中让真实 app-server 执行写 PID 后等待的 PowerShell 命令，验证回合 interrupted、后台列表可发现进程、专门终止接口后 PID 不再存活且未写入结束标记、同会话下一回合完成及历史恢复。

验收：background-terminals-ui 覆盖读取失败重试、分页、重复终止、终止失败重试、会话隔离及已退出反馈；生产构建通过。提交后 live 测试改用 Felix listBackgroundTerminals/terminateBackgroundTerminal 封装，并确认终止后列表不再包含该进程，全部通过。测试覆盖 Windows 直接命令进程和本地模型替身，不证明全部平台、孙进程树或云端环境终止语义。

## 后台命令资源快照

实现 13bf95f：后台命令展示系统 PID、CPU 百分比和 RSS 内存（MiB），说明数据来自最近一次刷新。保留零 CPU/内存，多核 CPU 不限制为 100%；缺失、负值、非数值和非有限数显示未知，避免错误解释为零资源占用。

验收：2 项指标格式单测、background-terminals-ui 的有值/缺失/刷新变化及终止回归、生产构建通过。提交后真实 command-interrupt-live 检查服务端 PID/资源字段可选契约与实际格式化输出，并继续验证进程退出和会话恢复，通过。指标可用性取决于平台和服务端采样，本轮不保证所有系统都有 CPU/RSS 数据。

## 后台命令展开与重连刷新

实现 4a27cc6：面板展开时自动读取；连接恢复且面板展开时补一次刷新。折叠不自动请求。连接变化使旧读取/终止响应失效，但保留请求锁直到原操作结束，随后刷新，避免重连触发重复终止。断线明确标注列表可能过期，刷新失败保留可见快照及错误。

验收：background-terminals-refresh-ui 覆盖首次展开、读取跨重连、锁释放后刷新、折叠重连无请求、重新展开、刷新失败不循环请求；提交后补充终止跨重连，旧错误被隔离，新列表确定最终状态。background-terminals-ui 与生产构建通过。此轮连接变化由浏览器夹具模拟，不等于全部实际网络故障场景。

## 操作记录读取失败恢复

实现 1c8f630：操作记录读取失败新增重新读取入口；使用同步读取锁阻止记录/清空覆盖原始数据。修复后恢复历史并重新启用记录，旧项目详情仍经现有脱敏处理。界面说明读取恢复前的新操作不写入记录，不虚构补记历史。空字符串按损坏数据处理。

验收：audit-read-recovery-ui 验证失败重试不覆盖、读取锁期间新建会话不写入、修复读取后项目路径脱敏及再次新建会话正常记录。首次测试因新对话按钮与同名会话冲突而失败，选择器限定导航后通过。audit-log-ui、project-audit-redaction-ui 和生产构建通过。原生文件损坏仍由启动存储保护处理，本轮为已启动渲染器的读取恢复。

## 上下文压缩跨会话请求保护

实现 ce4e468：压缩请求状态提升至 App 生命周期，按远端会话记录 pending/成功提示/错误；切换会话卸载展示组件不解除请求锁。不同会话可以独立请求，迟到反馈只显示在所属会话，失败可重试。请求已受理与压缩完成仍分别展示，运行中禁用规则保持。

验收：compaction-navigation-ui 覆盖 A/B 并发、返回 A 保持禁用、B 迟到错误隔离及重试；context-usage-ui 与生产构建通过。提交后 compact-live.test.cjs 验证真实 app-server 手动压缩完成且下一回合收到摘要，通过；本地模型替身不代表所有云模型兼容性。

## 审批原生模态与提交焦点保护

实现 2940f12：命令/文件/权限审批使用 showModal 原生模态框，背景不可交互；Escape 不隐式决策。提交前焦点转移至弹窗，全部按钮禁用时 Tab 保持弹窗焦点，空闲时保留首尾按钮循环，关闭后恢复原焦点。保留服务端选项与现有提交锁。

验收：approval-ui 覆盖背景程序化聚焦、Escape、延迟提交期间 Tab 与命令面板快捷键、失败重试、权限拒绝载荷和 390px 布局；生产构建通过。初次改动暴露原生 Tab 循环会经过浏览器界面，补回显式循环后通过。提交后 app-shortcuts-ui 回归通过；此轮未改变审批协议或执行权限。

## 多审批队列隔离验收

验证 29a8db9：第一条审批响应未返回时收到 serverRequest/resolved，下一条独立挂载并获得焦点、解除等待；旧响应失败不污染下一条，重复点击只发送一次对应 ID 的决策。已有实现满足测试，无产品修正。

提交后增加重复 serverRequest 通知去重、旧响应迟到成功不移除下一条及完整 ID 顺序断言；approval-queue-ui 与 approval-ui 通过。此轮仅测试改动，未重复构建。服务端事件使用模拟桥接，真实工具审批执行由既有工具链验证覆盖。

## 文件变更审批差异

实现 9c10859：审批弹窗按 threadId、turnId、itemId 从文件工具事件匹配路径和差异，迟到补丁实时更新；没有数据时明确提示，差异作为纯文本渲染。

验收发现新增文件展开项被原按钮焦点循环跳过，已修正为包含 summary，提交期间仍保持弹窗焦点。approval-file-changes 单测验证跨会话/回合/条目与工具类型隔离；file-approval-diff-ui 验证迟到补丁、缺失差异、HTML 字面量、键盘展开收起和 390px 布局；approval-ui、approval-queue-ui 与生产构建通过。此轮使用模拟服务端事件，未验证真实文件写入审批全过程；构建保留已有体积提示。

## 真实文件审批与写入验收

验证 979b734：启动实际 app-server，使用本地固定响应模型及支持 apply_patch 的 gpt-5.4 工具配置，read-only 工作区触发文件审批。真实通知经过 Felix applyToolEvent 与 approvalFileChanges，审批前获得对应路径/差异且文件不存在；允许后准确写入。

提交后补验 decline：文件未创建，工具状态 declined；accept 为 completed，两者均发出对应 serverRequest/resolved 清理审批队列。两个真实测试、文件审批界面与审批队列回归通过，无产品修正。首次 MiniMax 配置未提供独立 apply_patch，改用声明该工具的配置；首次目标位于受保护 CODEX_HOME 内而写入失败，将配置目录与工作区分离后通过。测试不调用云模型，不证明所有模型兼容性；此轮仅测试及文档变更。

## 后台命令终止操作记录

实现 de370d5：仅服务端 terminated=true 时记录“终止后台命令”，不保存命令、目录或进程标识；失败和已经退出不伪造终止成功。记录确认结果先于界面连接代次判断，因此切换会话或重连后的真实成功仍保留记录，旧界面反馈仍被隔离。

验收：background-terminals-ui 覆盖失败重试、重复点击、跨会话迟到成功、已退出不记录、刷新后操作记录搜索；background-terminals-refresh-ui 覆盖重连迟到成功只记录一次且界面重新读取，迟到失败不记录；audit-read-recovery-ui 通过。生产构建通过，保留已有体积提示。此轮扩充操作记录覆盖，不代表完整审计覆盖已完成。

## 应用状态与保存生命周期抽离

实现 21fa03e：useDesktopState 接管应用快照、不可变更新、保存失败与重试，主界面已迁移；可注入 StateRepository 验证异步行为。每次提交的状态立即交给原生存储，不增加渲染器保存队列，保留关闭窗口前原生 flush 的可见性。

验收：desktop-state-ui 验证旧成功不清除新失败、旧失败不污染新成功、重试最新快照及连续函数式更新；state-storage-ui、state-load-recovery-ui、state-repository 单测和真实 Electron 迁移/重启/损坏存储保护通过。生产构建通过，保留体积提示。此次完成共享状态生命周期抽离，领域级 ThreadStore、ProjectStore 与 AutomationStore 仍待继续，不将此 hook 等同于完整领域接口。

## 异步会话变更服务

实现 99a4f58：createThreadMutations 提供可注入远端的 rename/archive/remove，主界面已迁移；远端确认后才对最新应用状态执行目标会话变更。队列持久化暂停、操作锁、连接检查和审计继续由调用流程协调。

验收：五项领域测试覆盖远端失败不修改、重试、跨会话迟到响应、本地操作无 RPC、已删除会话不复活；archive-concurrency-ui、thread-lifecycle-queue-ui、delete-thread-ui、rename-thread-ui 通过。真实 app-server 归档分页恢复测试通过（验证客户端协议路径，不等同整个服务的真实端到端界面）。生产构建通过。首次重命名测试命令误用了不存在的 rename-ui.cjs，修正为 rename-thread-ui.cjs 后通过。本轮完成变更服务边界，完整 ThreadStore 的读取/创建/恢复等接口仍待整合。

## 归档恢复服务整合

实现 e7907cb：归档弹窗等待异步 onRestore，主界面通过 ThreadMutations.restore 完成远端确认及本地合并；恢复前捕获输入快照，优先保留最新本地会话内容，不改变当前选择，成功后记录审计。弹窗保留恢复锁、重连保护与失败重试。

验收：七项会话服务测试覆盖恢复失败、remoteId 去重、本地历史保留、输入快照隔离与离线本地恢复；archive-restore-lock-ui、archived-threads-ui 和生产构建通过。真实 app-server 归档测试已直接调用新服务，验证远端取消归档与本地插入、当前选择保留同时成立。此轮完成恢复变更接口，完整会话读取/创建服务仍待继续。

## 完整历史读取服务

实现 15847c6：createThreadHistory 提供可注入分页读取的 readAll，会话查找完整历史与 Markdown 导出经客户端统一使用。校验数据数组和非空字符串游标，拒绝重复游标，任一页失败不返回部分历史；保留未知条目供展示层兼容处理，不声称逐项消息结构全部验证。

验收：thread-history 单测覆盖并发游标隔离、无效页面/游标、循环检测、失败后从头重试；conversation-history-find-ui 和 conversation-export-ui 通过，后者新增第二页异常游标不得生成部分导出。真实 app-server 测试直接调用新服务逐条分页，返回 ID 顺序与完整结果一致。生产构建通过，已有体积提示保留。

## 历史条目损坏保护

实现 6ba5bb7：自动恢复与加载完整历史在进入状态更新前校验条目对象、ID、类型及已知消息正文；整批异常保留已有消息并提示重试。未知工具类型仍兼容，导出继续保留自身容错策略。

验收：history-validation 单测覆盖坏条目和附件/未来工具兼容；conversation-history-find-ui 验证第二页缺失 ID 不覆盖原消息；thread-restore-retry-ui 验证异常正文阻止发送、草稿保留及修复后恢复。history-dedup-ui 原先期待跳过坏条目而超时，按新行为改为先拒绝坏数据、修复后去重与插件引用恢复，通过；导出回归和生产构建通过。当前校验不是所有工具载荷的完整协议校验。

## 自动化读取仓库

实现 70bee8c：任务列表和详情通过可注入 AutomationRepository 读取，校验展示所需任务字段、日期、时区/频率、运行记录及详情 ID；重复列表 ID 或异常响应不替换已有数据。页面已有加载错误与重试入口承接仓库错误。

验收：automation-repository 单测覆盖坏列表、重复 ID、详情串项及传输失败；scheduled-ui 使用真实 TaskScheduler 验证创建、状态切换、运行/取消、失败、定时提醒、重启恢复和窄屏。提交后追加坏列表保留原任务、错误详情保留已有记录和修复重试，通过。生产构建通过。此为自动化读取边界，保存和执行等变更接口仍待整合；不等于签名打包和跨平台发布完成。

## 自动化变更接口与提交锁

实现 c5d11a6：AutomationRepository 补齐保存/运行/取消/删除/状态切换，任务页面已迁移全部变更调用；保存捕获草稿快照。编辑提交与页面变更使用同步 ref 锁，防止同一事件循环中的重复请求，等待服务确认后才关闭或刷新。

验收：仓库测试覆盖载荷、草稿隔离、等待确认和失败传递；真实 TaskScheduler 驱动 scheduled-ui 与生产构建通过。task-mutation-lock-ui 注入延迟响应验证同一轮连续点击/submit 仅一次、处理中 Escape、失败后重试成功；首次编辑选择器与应用菜单重名，限定任务弹窗后通过。页面操作锁仅覆盖当前页面实例，跨窗口幂等仍由原生调度服务负责。

## 任务仅失败通知

实现 a7147ca：任务编辑器保留总通知开关，新增“完成、失败或中断”与“仅失败时通知”选择。调度器校验并持久化 notificationPolicy，旧任务无策略仍按原规则通知；Electron finished 处理通过 shouldNotifyTask 过滤，仅失败策略不通知成功或主动中断。关闭总开关优先。

验收：task-notifications 验证旧行为、关闭通知、各终态、调度器重启持久化、成功静默、失败触发及恢复全部通知；task-scheduler 共 13 项测试通过。scheduled-ui 在真实调度器驱动界面选择失败策略，编辑与服务重启后仍保留，完整页面回归通过；生产构建通过。测试验证通知触发条件，不代表操作系统通知中心的所有配置均能弹出通知。

## 任务通知打开结果

实现 040bc42：Electron 任务通知 click 恢复/显示/聚焦窗口，通过专用 preload 事件传递任务 ID；主界面切换已安排页面并打开对应详情。任务已删除时明确提示，重复点击可重新打开。

验收修正已处理请求在返回页面时重放的问题：页面确认消费后清除父级请求，新的成功跳转清除旧的不存在提示。task-notification-navigation-ui 验证跳转、重复点击、任务不存在、手动返回不重放及原聊天草稿仍持久化；scheduled-ui 与生产构建通过。原生窗口恢复逻辑已接线，本轮浏览器模拟桥接事件，未实测 Windows 通知中心点击和系统焦点策略。

## 从任务结果继续会话

实现 a62e598：成功任务运行器已有 threadId，运行记录类型和仓库校验补齐该字段；结果操作提供“打开运行会话”，复用主会话选择/恢复流程。没有会话 ID 的提醒或旧记录不展示入口，已有同 remoteId 会话直接复用，新会话用任务名称展示。

验收：task-run-conversation-ui 验证指定远端 ID 恢复、原聊天草稿保留、重复打开不重复建会话、恢复错误提示与修复重试；scheduled-ui 全流程及生产构建通过。此轮浏览器使用模拟会话桥接，未新做真实任务运行后追加模型回合测试。失败任务目前仍可能没有持久化 threadId，入口按实际数据展示。

## 任务会话真实持久化修正

实现 7cefcde：真实运行器原先 ephemeral=true 且使用独立 CODEX_HOME，运行记录虽有 ID，主应用无法恢复。改为非临时会话并使用应用 dataRoot/codex-home，单次任务 TEMP/TMP 仍独立；失败和中断附带已创建 threadId，调度器保存到运行记录。

验收：task-runner 的带密钥/本地免密真实工具执行后，启动第二个 app-server 从共用目录恢复会话并检查助手结果，均通过。测试最初仍断言旧配置路径且恢复进程未配置 minimax，修正为应用实际目录和提供渠道定义后通过。提交后补验真实中断错误含 threadId、失败记录的部分输出/会话 ID 重启保留；运行器/调度器共 18 项与任务会话界面回归通过。此轮修改原生代码，未重新构建渲染器。尚未验证所有渠道的后续模型回合，已有旧临时任务历史无法凭 ID 追溯恢复。

## 真实任务会话续聊

验证 ccd18fb：实际 TaskRunner 执行工具任务、退出专用进程后，由第二个 app-server 恢复持久会话并发送下一回合。本地模型替身断言收到原任务助手结果及新用户请求，服务端完成新回合并在恢复历史中返回后续回复。带密钥及本地免密两条路径通过。

提交后验收补充原回合 ID 保留、恰好新增一个回合、交互续聊不增加调度运行记录且不覆盖原任务输出，均通过。首次测试进程未设置应用本来已有的 web_search=disabled 导致适配器拒绝工具；对齐应用启动配置后通过，无产品修正。此轮只更新测试和文档；验证本地模型协议链路，不等于所有云渠道端到端均通过。

## 任务会话渠道绑定

实现 536be4a：任务运行器创建持久会话后、启动回合前调用 onThreadCreated；主进程使用执行时捕获的 providerId/model 写入 ThreadProviderRouter。续聊恢复使用原渠道绑定，避免全局渠道切换后静默改路由。绑定保存失败使任务失败，不执行模型回合，仍保留已创建会话 ID 供诊断。

验收：带密钥/本地免密真实任务验证模型请求前绑定落盘；重建路由器且默认渠道变更后恢复参数仍为原渠道/模型。提交后新增真实服务绑定失败测试，模型请求数为零且错误带会话 ID；thread-provider-routing 真实全局切换/恢复/分叉回归通过。本轮原生变更未重新构建渲染器；旧任务未保存的渠道绑定不自动推断。

## 自动化任务推理强度

实现 41bf06d：Agent 任务编辑器新增模型默认/低/中/高设置，仓库和调度器校验并持久化；执行回合传入 effort，未设置的旧任务不覆盖模型默认。提醒不保留此 Agent 配置。

验收：真实 TaskRunner + app-server + 本地模型替身断言首回合和工具后续请求的 reasoning_effort=high；完整运行器/调度器 19 项通过。提交后补验三档保存、清回默认、非法值拒绝及提醒清除配置；scheduled-ui 选择高档并在服务重启后检查保留，生产构建通过。各外部模型支持的具体强度仍取决于渠道，未验证所有云模型。

## 固定间隔自动化

实现 b1907b9：任务新增 interval 频率，支持每隔 1–10080 整数分钟执行；编辑器和任务列表展示已接入，仓库/原生校验拒绝越界值。保存和恢复从当前时间计时，自动执行在开始前推进下次时间；停机错过多次仅补执行一次，从实际开始时间计算下一次，不并发补跑。

验收：task-scheduler 验证重启、过期跳过、暂停恢复和非法间隔，共 14 项通过；生产构建通过。提交后 scheduled-ui 从编辑器选择 15 分钟，检查重启持久化和列表显示，全流程通过。首次测试使用精确频率标签未匹配，改用现有页面使用的标签定位后通过。应用仍需运行才能触发调度，不声称系统关机期间执行。

## 自动化管理操作记录

实现 d2801fd：任务创建/编辑/暂停/恢复/删除及请求运行/请求停止接入应用操作记录；仅异步服务确认成功后记录，刷新列表失败不把已受理操作当作失败。记录只含动作，不含名称、提示词、目录、模型输出；运行/停止使用请求语义，不冒充执行完成。

验收：task-mutation-lock-ui 验证失败不记录、重复点击只发一次、重试成功分别留下暂停与编辑动作且无 detail；scheduled-ui 真实调度器全流程断言七类动作及隐私字段，刷新后仍存在。生产构建通过。自动运行结果仍在任务运行历史中，完整应用审计覆盖继续核对。

## 项目选择仓库

实现 8caba9c：ProjectRepository 封装桌面项目选择和默认目录读取，聊天发送/项目菜单及任务目录选择已接入；校验原生项目 ID、名称、绝对路径、环境和 Git 元数据，取消返回 null，异常响应拒绝进入状态，返回快照与桥接对象隔离。

验收：项目仓库单测覆盖 Windows/POSIX/UNC 路径、异常响应、取消及错误传播；project-audit-ui 新增坏项目保持当前会话、修复后重选且只记一次成功；palette-projects-ui 和 scheduled-ui 回归通过。生产构建通过。本轮不验证目录实际存在性，该检查仍由原生选择器/执行服务负责；完整 ProjectStore 的其他操作继续整合。

## 移除最近项目

实现 a0c4281：项目菜单提供移除最近项目入口，不触发文件删除或远端会话操作。移除前为引用该项目或继承当前项目的本地会话固化 cwd，保留自定义目录，移除项目引用及当前项目选择；保留会话、消息与草稿并记录不含路径的动作。

验收修正空列表原先生成无路径占位项目的问题，现为空列表保留打开文件夹入口。recent-projects 单测覆盖引用/继承/自定义目录及远端隔离；界面验证刷新后列表移除、会话目录和草稿保留、动作一次记录，项目选择及命令面板回归与生产构建通过。

## 模型目录响应校验

实现 d4a343c：聊天与任务编辑共用模型目录校验，拒绝非数组、空目录、非字符串及空白 ID，保留合法 ID 顺序并去重。错误显示后可刷新重试，保留当前选择，任务在目录无效时禁止保存。

验收：model-catalog 单测、model-search-ui、task-provider-catalog-ui 通过，覆盖损坏响应、错误恢复、选择保留及重复选项；model-catalog-race-ui 补测迟到的损坏响应不影响新 Provider 目录。生产构建通过，保留现有包体大小警告。目录仅提供模型 ID，尚不能据此判断模型支持哪些推理强度；本轮未验证云端模型能力。

## 渠道配置与会话迁移目录校验

实现 654e3a5：渠道设置连接及已有会话迁移统一调用模型目录校验。损坏目录不进入配置列表，不发送迁移 RPC；错误后保留原渠道、会话历史和草稿，可重新连接/切换。

验收：provider-catalog-validation-ui 覆盖损坏响应、去重、已有选择后失败禁存及恢复选择；thread-provider-migration-ui 覆盖无效目录零迁移及修复重试。manual-model-ui 与 thread-provider-catalog-ui 回归通过，后者修正旧相对路径夹具以符合当前项目仓库契约。生产构建通过。模型能力字段尚未接入，不能声称已按模型限制推理强度。

## 聊天模型默认推理强度

实现 8a995f1：聊天选择器新增模型默认，恢复默认按钮不再固定设为低。显式 default 状态随会话/全局偏好及队列保存，避免与未设置的继承状态混淆；请求不发送 default 字符串，通过 collaborationMode 的 null reasoning_effort 清除前一回合显式强度。旧低/中/高状态及新会话原有低强度初始化保持兼容。

验收：thread-model-ui 验证高强度切回默认、刷新保持、全局与会话隔离，以及队列实际发送 null；planning 单测和界面回归通过。task-runner 的真实 app-server 先执行 high 任务，再恢复并以默认续聊，带密钥和本机免密两种路径均确认不再发送 high，全部 7 项通过。验收连接补齐应用已启用的 experimentalApi 声明。生产构建通过。模型默认由运行配置和模型决定，不意味着关闭推理；未声称所有云端模型兼容。

## 远端会话默认强度恢复

实现 2d6e037：首次恢复远端会话时，将协议 reasoningEffort 的显式 null 转成模型默认，避免错误继承全局低/中/高；字段缺失维持旧兼容路径，已有本地选择不被恢复响应覆盖。

验收：task-run-conversation-ui 在全局 high 下打开默认任务会话，确认默认及持久化，原聊天仍 high；任务聊天选择 medium 后失败重试恢复仍保留 medium。thread-model-ui 回归通过。task-runner 两种认证路径的真实 app-server 断言恢复默认返回 null，全部 7 项通过；生产构建通过。更广的模型强度能力发现尚未完成。

## 工作区服务重启记录

实现 7f26d1b：重启审计移至同步锁后的实际流程，记录请求重启、停止成功或停止失败；不再点击即记录含糊的重启动作。停止成功不等于重连成功，记录按该边界命名，不含错误详情和草稿内容。

验收：service-restart-ui 验证运行中禁止操作、重复事件仅一次请求、异步停止确认前无成功记录、失败无成功记录、重试成功及刷新持久化；草稿和连接时序回归通过。audit-lifecycle-ui 和生产构建通过。本轮为桥接响应的界面验收，不声称新增真实进程或系统级覆盖。

## 复制自动化任务

实现 0642437：详情新增复制任务，打开无 ID 的新建草稿，白名单复用提示词、渠道、模型、推理强度、目录、权限、通知和调度；不复制状态及运行记录。保存才创建新任务，取消无写入；工作区写权限需重新勾选。已过期的一次性时间调整为当前一小时后，未来时间及周期安排保持，名称追加副本且不超长。

验收：duplicate-task-ui 覆盖取消、表单复用、写权限确认、无源 ID/历史和仅成功创建审计；duplicate-task 单测使用真实调度器执行原提醒后复制，断言新 ID、空历史、独立编辑及重启保留，并覆盖未来/每周/间隔配置快照。重启比较按 JSON 持久化语义省略 undefined。任务重复变更锁回归与生产构建通过。保存副本遵循现有新建任务语义，处于开启状态。

## 最近失败任务筛选

实现 58995a4：任务页新增最近失败标签，以最新运行记录 failed 判断，不混淆开启/暂停/完成的调度状态；支持搜索组合及现有键盘标签导航。成功、运行中、中断或从未运行的任务不因历史失败继续显示。

验收：task-failure-filter-ui 覆盖三种调度状态、搜索、恢复后动态移出、空列表及 Home/End；scheduled-ui 真实调度器全流程验证失败进入、后续中断移出，并通过 CRUD、提醒、时区、重启和异常重试回归。首次新增定位误用另一个示例名称，修正后通过。生产构建通过。

## 未保存任务编辑保护

实现 bc3a17b：任务编辑在用户修改后，取消/关闭/Escape 先提示继续编辑或放弃；再次 Escape 撤回提示，恢复表单焦点。保存中保持同步关闭锁，成功保存直接退出；自动模型加载不标记用户编辑。当前按发生过编辑判断，即使改回原值也会提示。

验收：task-editor-close-ui 覆盖未编辑直接关闭、三种关闭入口、确认焦点、内容保留、明确放弃、一次性时间修改和正常保存；首次断言使用标签定位未匹配但 DOM/可访问树确认内容仍在，改为文本框名称后通过。重复保存锁、复制任务、真实调度器完整界面与生产构建通过。本轮不包含应用退出/刷新后的任务草稿持久化。

## 任务列表排序

实现 f4410c6：新增默认顺序、下次运行最早优先、最近运行最新优先和名称排序，组合现有搜索及状态筛选。下次运行仅排序已开启且有时间的任务，暂停/完成/未安排放末尾；最近运行无记录放末尾。排序不修改源任务数组，相同时间保持原顺序，名称按中文 locale 和数字顺序比较。

验收：task-ordering-ui 覆盖四种顺序、状态/搜索组合及更新后的自动重排；单测验证时区时间点、稳定顺序和缺失记录。真实调度器 scheduled-ui 完整回归与生产构建通过。排序偏好在离开任务页面后重置，尚未持久化。

## 任务详情配置核对

实现 678faae：任务详情展示执行渠道、推理强度及通知策略；无指定渠道显示跟随当前启用渠道，未选强度显示模型默认，通知关闭优先于通知范围。提醒不显示模型执行字段，找不到指定渠道时显示 ID 和不可用标记。展示的是当前保存配置，不冒充历史运行实际参数。

验收：task-metadata-ui 覆盖动态配置刷新、默认值、不可用渠道、通知开关及提醒；scheduled-ui 真实调度器保存 high/仅失败策略后重启，详情正确显示，完整任务回归通过。生产构建通过。

## 任务运行配置快照

实现 84f9f45：每次开始运行时保存名称、提示词、类型、模型、指定渠道/目录、推理强度和权限的白名单快照，随运行记录持久化；详情支持展开查看，旧记录明确显示没有快照。记录的是运行时任务配置，未指定渠道或目录保留跟随默认的语义，不声称已解析实际渠道/目录。

验收：真实调度器运行后修改配置、再次失败运行并重启，旧新记录分别保留正确配置；界面展示旧提示词/模型，仓库拒绝损坏快照并兼容旧记录。完整 scheduled-ui、运行会话入口回归及生产构建通过。快照随现有最多 50 条历史保留，不复制密钥或运行历史本身。

## 实际任务执行环境

实现 a1bcaed：执行器解析并固定渠道和有效工作目录后，通过调度器在模型进程启动前持久化 environment；只保存 cwd 和可用的 providerId，不保存服务地址或密钥。详情快照展开后展示实际值，成功/失败/中断共用该记录。目录或渠道解析失败发生在环境捕获前，不编造实际值。

验收：真实 app-server 两种认证路径验证模型工作前已有环境、切换全局渠道不改变记录；调度器失败及重启仍保留环境，白名单排除注入密钥。新增写入失败阻止进程启动、仓库旧数据兼容和异常环境校验；详情界面、完整任务流程和生产构建通过。兼容旧的无 ID 渠道回调时明确显示未提供渠道 ID。

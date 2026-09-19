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

## 运行结果导出包含历史配置

实现 30477e1：复制和保存结果共用格式化函数，优先使用运行时名称，包含起止时间、结果、触发方式、会话 ID、配置快照及实际渠道/目录。无快照旧记录明确标注，提醒不编造模型配置；仅格式化白名单字段。打开运行会话也使用历史名称。

验收：单测覆盖改名隔离、错误输出、旧记录/提醒及不序列化额外密钥字段；界面验证旧记录复制带历史名称与实际环境。真实调度器验证复制/导出一致且包含原提示词和模型，导出失败/取消/重试和完整任务回归通过；生产构建通过。提示词、路径和输出按用户主动导出原样包含，不做内容脱敏。

## 任务级执行时限

实现 d83f4ca：Agent 任务支持 1–120 整数分钟时限，留空默认十分钟；原生保存与执行器均校验，提醒不保留时限。详情、复制、运行配置快照及结果导出均接入。执行器原有内部 timeoutMs 注入仍用于测试覆盖，正常运行采用任务设置。

验收：24 项调度器/真实执行器测试通过，覆盖越界、清空恢复默认、重启持久化；真实 app-server 等待模型时确认注册 60000ms 定时器，主动调用捕获回调验证超时错误、会话 ID 保留及子进程清理，未实际等待一分钟。真实任务编辑保存 25 分钟后重启详情显示正确。复制、历史快照及导出保留 25 分钟的补充验收通过；生产构建通过。

## 原生任务历史恢复校验

实现 c4592d5：调度器启动在任何恢复写入前校验运行记录、配置快照和解析环境，拒绝空或重复任务/运行 ID、非法状态/时间/字段及越界时限；异常进入已有读取失败状态，原始文件不覆盖。合法旧记录可无快照/环境。

验收：原始文件字节保持及禁止保存测试通过，完整快照、环境、时限边界和旧运行中记录恢复通过；18 项调度器/快照测试、9 项真实执行器测试及真实任务界面全流程通过。本轮仅原生 CJS 变更，无新增渲染构建产物；数据修复后仍需重启服务读取。

## 修复任务存储后原位重试

实现 9d918de：列表读取在已有 loadError 时重新校验磁盘，修复后清除错误并执行旧运行中记录的中断恢复；仍损坏或缺失继续报错并禁止写入。健康状态不重读磁盘，避免外部编辑覆盖内存任务。任务页手动重试和已有轮询都能触发恢复，修复成功后原有调度继续。

验收：19 项调度器及存储校验测试通过，涵盖同实例修复、缺失文件保护和健康读取隔离；task-storage-retry-ui 直接连接真实调度器，从损坏文件报错到修复后点击重试恢复列表，无须替换实例。完整 scheduled-ui 回归通过。本轮原生读取逻辑变更，不修改渲染产物。

## 自动化运行实时输出

实现 99deea3：执行器向调度器上报助手文本及命令/文件变更输出快照，内存保留末尾 200000 字符，250ms 合并任务变更通知，打开详情可在运行结束前查看。终态优先采用最终输出，无最终输出时保留已收到预览；迟到回调不覆盖终态，列表继续省略输出正文。

验收：真实 app-server 两种认证路径确认上报文本与最终输出一致；合并通知、长度、失败保存及迟到隔离测试通过。scheduled-ui 验证运行中预览、禁止复制未完成结果、停止后保留及重启恢复；首次未展开折叠记录的可见性断言修正后通过，15 项调度器回归通过。预览不逐片写盘，异常退出前的未保存输出不保证恢复。本轮只修改原生 CJS 输出通路，沿用现有详情展示。

## 实时输出定期保存

实现 5461f35：运行输出变化后两秒合并写入现有原子任务存储；失败提示一次并每两秒重试，即使没有新文本也继续重试。保存失败不打断模型任务，内存预览继续更新。终态清除通知和保存定时器，统一保存最终结果。

验收：17 项输出/调度器测试通过；复制运行中磁盘快照到独立恢复目录验证中断状态及部分输出，模拟写入失败确认原文件保留、合并提示和无新文本重试。实际两秒计时验证运行中落盘，完成后再等待 2.2 秒无额外写入；完整 scheduled-ui 回归通过。未测试真实断电，最后一次成功保存后的输出仍可能丢失。

## 任务会话 ID 提前保存

实现 b734c37：执行器创建持久会话并完成渠道绑定后，在 turn/start 前回调调度器保存 threadId。运行中输出保存及异常退出恢复因此可保留会话入口；终态没有返回 ID 时保留已有值。

验收：真实 app-server 两种认证路径在零模型请求时检查 tasks.json 已保存 ID；运行中磁盘快照恢复为 interrupted 后仍有 ID。13 项执行器/输出测试通过，新增保存回调失败断言零模型请求且错误保留 ID；会话入口及完整任务界面回归通过。本轮原生 CJS 变更，运行中会话入口仍沿用禁用策略，恢复为中断后可打开。

## 最终结果写盘失败保留与重试

实现 f7969f1：任务终态不再使用通用变更回滚，写盘失败保留内存中的最终状态、输出及会话 ID，并标记待保存。列表请求、调度时钟、后续变更及关闭尝试重试；新运行先完成待保存结果，防止覆盖或重复执行。成功落盘后仅发一次 finished 通知。

验收：20 项调度器/进度相关测试通过，补充完成/失败/中断三类终态的写盘失败、部分输出保留和重试保存；恢复后调度不重复执行一次性任务，完成通知一次。10 项真实执行器和完整 scheduled-ui 回归通过。待保存结果仍在内存，持续磁盘故障期间强制退出仍可能丢失最后未保存结果。

## 任务运行历史查找

实现 7afec34：任务详情新增运行结果筛选及搜索，匹配输出、错误、运行/会话 ID 和历史名称/提示词；忽略大小写及首尾空格，显示匹配数量，刷新保持条件，关闭重开清空条件。导出、会话入口及配置查看仍可用于筛选后的记录。搜索范围为当前任务已保留的历史。

验收：task-history-search-ui 覆盖输出/错误/历史提示词/会话 ID、状态组合、无匹配、新记录刷新和重开复位；完整真实调度器界面回归通过，修正原有已中断断言同时匹配新增 option 的问题。生产构建通过。

## 长输出截断提示

实现 0545720：执行器裁剪前记录 outputTruncated，经实时回调、错误/最终结果和调度器持久化传递；任务详情与复制/文件导出提示仅保留末尾 200000 字符。渲染仓库及原生读取校验可选布尔字段，兼容无标记旧记录，不根据旧文本长度猜测截断。

验收：超长实时预览及重启记录保持标记，详情和复制内容显示提示。真实 app-server 接收超过上限的本地模型输出，验证保留尾部及进度/最终标记一致；完整 scheduled-ui、相关单测和生产构建通过。长度沿用 JavaScript 字符串长度（UTF-16 单元），不代表字节数。

## 高频任务列表减少历史正文传输

实现 2d72f00：原生列表在原有省略 output 基础上，省略每条运行的 configuration 和 environment；保留运行 ID、状态、时间、触发方式、会话 ID、错误和截断标记。详情接口及磁盘记录完整保留，历史内容仅按详情读取。

验收：真实调度器五条各含 20000 字符提示词的运行记录，原列表 122482 字节，新列表 21397 字节（约减少 82.5%），详情 1122542 字节完整保留；返回对象修改不污染原状态。真实 scheduled-ui、历史查找/复制/元数据界面及 20 项仓库/调度器测试通过。数字为测试样本，非真实用户负载基准；本轮原生 CJS 变更。

## 任务详情刷新合并

实现 f50d109：同一选中任务最多保留一个进行中的详情请求，连续列表更新合并为一次后续读取；列表更新不再使已有请求失效，避免慢详情在实时通知下持续加载。切换或关闭详情后忽略旧响应。

验收：浏览器受控延迟测试覆盖六次连续通知、首次响应可见、旧任务迟到失败隔离、当前任务失败后重试恢复与关闭后的迟到成功；历史搜索、元数据以及真实调度器完整 scheduled-ui 回归通过，生产构建通过（保留既有包体积警告）。本轮未实现底层请求取消或超时；不返回的请求仍需关闭重开详情。

## 独立会话查询仓库

实现 cf6ba96：ThreadRepository.query 统一普通/归档列表、游标分页及内容搜索，注入协议读取函数并返回一致的已校验页面；界面不再各自解析搜索载荷。两个搜索范围均拒绝非字符串或空白会话 ID、非字符串片段和无效页面，保留既有界面重试、分页循环检测和迟到响应隔离。

验收修正：将实例组装放到 threadQueries，保持 codexClient 协议层可独立加载。六项查询/页面单测、普通列表与归档界面、跨重连恢复锁及生产构建通过；归档界面新增损坏结果保留旧内容与修复重试。真实 app-server + 隔离 profile + 本地模型替身验证新仓库普通/归档查询及正文搜索范围，并回归归档/恢复/分页。此轮抽离查询接口，会话启动、回合流及完整 ThreadStore 仍需继续整合。

## 恢复会话身份与回合快照校验

实现 ae83209：恢复前核对 thread.id 与请求一致、turns 数组和可选配置字段类型；回合必须具备非空唯一 ID 与 items 数组，拒绝损坏状态和多个运行中回合，再校验消息条目。完成全部校验前不清除恢复错误、不写入渠道/工作目录及消息；失败继续阻止发送并保留重试入口。兼容缺省回合状态与未知工具类型。

验收：四项恢复/历史校验单测、四项运行状态测试、恢复失败界面、历史去重和排队发送回归通过，生产构建通过。界面注入错误会话 ID、缺失 turns、损坏回合和目录，确认消息、草稿、目录与渠道不被污染；修复后使用确认目录发送。真实 app-server 恢复归档后会话并经新校验读取助手消息通过。排队测试替身原先缺失真实协议要求的会话 ID，补齐后 FIFO/取消/失败重试/持久化无重放通过。未宣称覆盖全部服务端协议字段。

## 旧消息分支位置查找保护

实现 ff96391：无回合 ID 的旧消息通过独立 findMessageTurn 逐页定位，支持原始和 live- 消息 ID；校验回合页面、ID、items 和游标，循环游标立即失败，避免分支操作持续忙碌。已知回合 ID 保持直接创建分支；查找失败沿用共享锁释放和界面重试。

验收：三项单测覆盖两类消息 ID、跨页定位、损坏载荷、单步/多步循环及独立重试；浏览器注入 A→B→A 循环及坏 items，确认无分支 RPC，恢复后一次请求使用正确 lastTurnId/deferGoalContinuation 且原会话保留。既有完整分支界面回归和生产构建通过；真实 app-server 的回合列表经新定位器返回正确回合，并继续验证实际分支与原会话历史隔离。此轮防止重复游标导致无限请求，不提供底层请求取消或网络超时。

## 完整历史加载进度与取消

实现 561ba04：历史读取接收 AbortSignal 和进度回调，逐页反馈页数/条目数；会话查找提供取消入口。取消立即结束界面等待并释放会话锁，保留已有消息；切换会话或卸载查找组件时取消旧流程，迟到页面不应用、不继续请求后页。重试从第一页开始，导出等无 options 调用保持兼容。

验收：五项历史读取单测涵盖挂起中取消、已取消信号、进度与独立重试。界面验证第二页挂起时进度可见，取消后可立即重试，迟到响应不改变成功提示或消息；切换后仅保留已发出的一页请求。查找/历史/导出回归、真实 app-server 历史与分支测试及生产构建通过。两个历史/导出旧替身补齐恢复响应会话 ID。底层已发出的 RPC 不被终止，本轮取消界面读取等待和后续分页；不代表服务端计算取消。

## 会话导出读取进度与取消

实现 547a6b6：完整会话导出显示读取页数和条目数，读取阶段可取消；切换会话或离开界面取消未完成读取，已收到的部分历史不进入保存。读取结束后移除取消入口，原生保存阶段仍等待其自身确认，避免错误宣称已取消文件写入。

验收：生产构建与导出界面通过。挂起第二页后取消，无保存调用；迟到页不触发保存，重试成功。进入原生保存阶段按钮锁定、无读取取消入口；切换会话取消后无额外保存。完整历史查找回归通过。本轮通过模拟桥接验证保存调用边界，未新增原生保存对话框实机测试；已经发出的读取 RPC 自然结束，结果忽略。

## MCP 状态载荷校验

实现 29060c8：MCP 状态分页在渲染前统一校验服务名、认证/运行状态、工具描述、资源和资源模板；拒绝空或重复服务名、错误游标、错误数组及字段类型，返回数据深拷贝避免桥接对象污染。读取失败保留已有服务列表并沿用刷新重试。

验收：三项 mcp-status 单测覆盖正常/空页、深拷贝、坏分页、重复服务、工具/资源类型；mcp-servers 界面注入重复和损坏条目，错误可见且旧 cloud 列表保留，修复后刷新恢复。MCP 分页、OAuth、资源读取/重试/迟到响应隔离、草稿快照、懒加载表单与生产构建均通过。服务端新增未知状态值仍显示原文；本轮不限制协议未来扩展字段。

## 工作区文件响应校验

实现 8b4c546：文件面板在使用 IPC 结果前校验目录/搜索条目、截断与跳过计数，以及文本/图片/二进制预览字段；拒绝错误路径、行列号、类型和缺少预览类型的载荷，成功结果深拷贝后进入 React 状态，避免桥接对象被修改。

验收：两项 workspace-response 单测覆盖列表/内容搜索、预览、深拷贝和坏字段；工作区界面回归通过，补齐模拟桥接中真实协议必需的 symlink 字段，并注入坏目录响应确认错误路径可见、修复后刷新恢复；生产构建通过。现有搜索范围、大小限制、UTF-8、符号链接及文件编辑约束保持不变。

## 后台命令响应校验

实现 990502b：后台命令列表进入面板前校验分页游标、非空唯一进程 ID、命令/目录和 PID、CPU、内存指标；结果深拷贝，终止响应必须返回布尔 terminated。坏数据不会污染现有列表，原有会话代际隔离、分页循环检测、终止锁和失败重试保持。

验收：三项后台响应单测覆盖正常深拷贝、重复/空字段/负指标/坏游标和终止载荷；界面注入重复进程和负 CPU，错误可见且原列表保留，修复后刷新恢复；列表分页、指标显示、终止失败重试、跨会话隔离、审计和生产构建通过。未限制未来新增指标字段。

## Git 状态与差异响应校验

实现 9fe0b99：Git 面板在渲染状态前校验仓库根目录、分支、上游计数、布尔状态和变更文件，拒绝重复路径、错误状态字符及非法计数；差异必须为字符串并校验截断标记，成功结果深拷贝进入界面。读取异常显示错误，不执行基于坏快照的 Git 操作。

验收：三项 git-snapshot 单测覆盖快照深拷贝、游离/空分支、重复文件、坏字段和差异截断；Git 远端/提交/分支/冲突界面回归与生产构建通过，远端测试注入坏状态响应确认错误路径不进入后续操作。既有 Git 原生操作的分支/提交一致性保护保持。

## Git 提交历史响应校验

实现 bcb7a2f：提交历史页校验 refs、anchor、最多 30 条提交、完整提交 ID、作者/日期/主题和 hasMore，拒绝重复提交；提交详情必须为字符串。成功结果深拷贝进入状态，异常保留旧列表并显示重试。

验收：三项 git-history-response 单测覆盖正常深拷贝、坏 refs/anchor/提交/重复记录、详情文本和空历史；提交历史界面分页、分支选择、详情失败重试、迟到详情隔离及远端/真实 Git 历史回归通过，新增重复提交和坏 refs 注入后错误可见，修复刷新恢复；生产构建通过。正文仍作为字面文本渲染，不执行 HTML。

## Git 分支响应校验

实现 1334612：分支面板校验本地分支名称、当前分支、完整提交 ID、远端引用和远端提交 ID，拒绝重复分支/远端及非法游离 HEAD 数据；成功快照深拷贝后再更新选择器。坏响应不会执行切换、跟踪或删除，保持刷新重试。

验收：三项 git-branches-response 单测覆盖正常深拷贝、空游离 HEAD、非法/重复本地与远端分支；分支界面注入重复分支，错误可见，恢复后可刷新并继续切换；真实 Git 分支切换、工作树列表和生产构建通过。

## Git 工作树响应校验

实现 772b7db：工作树面板校验路径、分支/游离提交、锁定/失效标记和唯一路径，拒绝损坏或重复记录；成功列表深拷贝后进入状态，读取错误保留界面并可刷新。

验收：三项 git-worktrees-response 单测覆盖正常深拷贝、坏路径/提交/布尔字段、重复路径及游离/锁定/失效工作树；工作树创建、重新打开、删除保护和列表回归通过。列表测试将关闭按钮断言改为等待 React 状态提交，避免在异步 click 处理刚开始时读取旧 disabled 值；生产构建通过。

## Git 冲突版本响应校验

实现 4f64a6a：冲突版本面板校验阶段编号仅为 1/2/3、阶段不重复、文本与不可用原因类型互斥，成功结果深拷贝后渲染；坏响应通过既有错误与重试入口处理，字面文本不会执行脚本。

验收：三项 git-conflict-response 单测覆盖正常深拷贝、重复/非法阶段、空阶段及不可用标记；冲突识别、提交保护、版本读取失败重试、评审草稿保留和解决后暂存回归通过，生产构建通过。

## 打开工作树项目数据保护

实现 c8b814c：打开已有工作树前校验项目身份、名称、绝对路径和 Git 元数据，异常不进入项目/会话状态。验收修正允许主工作区返回 local 环境，关联工作树仍为 worktree，并校验可选 dirty 字段。

验收：三项单测、坏项目路径界面注入与主工作区重试、已有工作树重新打开回归及生产构建通过。坏响应保留项目与会话，修复后建立正确 cwd；此轮仅覆盖已有工作树打开入口，不声称覆盖创建或删除响应。

## 未产生首个提交的 Git 分支兼容

实现 72da5d6：允许原生 Git 返回尚无提交的当前分支（HEAD 为空、当前分支非空且尚未出现在本地引用列表中）。仍拒绝已有分支缺少 HEAD、空游离 HEAD 和损坏的非空提交 ID。

验收：8 项解析器与真实 Git 测试通过，包含新建仓库、首个提交、仍有其他本地分支的孤立分支，以及原有切换保护；生产构建通过。三项浏览器回归通过：分支面板展示空仓库且禁用无目标的切换/删除，刷新恢复正常列表，切换中禁用操作，远端跟踪与安全删除失败重试。修正后两项旧测试中的虚构短提交 ID，使模拟响应符合原生 Git 的完整哈希格式。

## 从当前提交创建本地分支

实现 952f4f8：分支面板提供新分支名称及创建并切换入口，原生 Git 检查名称、重名、当前分支和提交；不覆盖已有分支，不自动建立上游。支持从游离 HEAD 创建分支；尚无首个提交时解释原因并禁用创建。暂存、未暂存和未跟踪内容随当前工作区保留。

验收：3 项真实 Git 测试覆盖内容保留、无效名称（包含选项与历史分支简写）、重名、过期提交、游离 HEAD 和空仓库。浏览器通过真实 workspaceGit 临时仓库验证空仓库/重名保护、无效名称及过期快照失败保留输入、刷新重试和成功后的真实分支及文件内容；原有切换、跟踪和删除三项界面回归通过。验收将分支动作布尔组合改为明确的动作类型，避免调用位置混淆；修正浏览器等待条件，允许刷新期间表单暂时卸载。生产构建通过。

## 批量暂存与取消暂存

实现 056807a：Git 面板新增暂存全部变更和取消全部暂存。覆盖新增、修改、删除，遵循 Git 忽略规则；取消暂存仅修改索引并保留工作区内容，兼容首个提交前状态。原生操作检查当前分支/提交，拒绝未解决冲突；界面无可操作内容、加载失败或冲突时禁用批量按钮。

验收：6 项真实 Git 测试覆盖批量与原单文件操作，包括特殊文件名、忽略文件、较新工作区修改、空仓库、过期 HEAD 及冲突索引不变。浏览器连接真实临时仓库验证失败后刷新重试、提交说明保留、批量暂存/取消/再次暂存到提交的完整流程和冲突禁用。修正操作等待期间仍可关闭、刷新或进入历史的问题；等待期间禁用断言、原写入界面回归与生产构建通过。此保护针对面板内入口，不宣称阻止其他进程并发修改仓库。

## 应用级 ThreadStore

实现 91dcaaf：以可注入 ThreadBackend 和状态更新适配器构造应用级 ThreadStore，统一普通/归档列表与搜索，以及手动重命名、归档、恢复和删除。侧栏 hook 与归档页接收同一实例，不再直接引用全局查询仓库。同一本地或远端身份的写操作共享互斥保护；不同会话和查询可以并行，失败释放锁，原有队列持久化和界面生命周期保护继续保留。

验收：14 项单测覆盖查询、状态提交、全部写操作交叉互斥、身份别名、失败重试、实例隔离和本地操作。真实 app-server 通过该接口验证查询/搜索、恢复、重命名、归档和删除后的服务端列表及本地状态。8 项浏览器回归通过：列表、重命名、删除、离线写操作、归档列表、恢复跨重连锁、归档并发及队列生命周期。重命名测试新增跨入口归档拦截与完成后重试断言；修正两个旧 mock 的恢复响应缺失 thread.id，避免协议校验失败绕过预期路径。生产构建通过。

此阶段不包含会话启动、回合流、自动标题同步与历史读取的全部领域迁移；不会将 ThreadStore 接口存在等同于完整状态层拆分或全平台能力对齐。

## 初始标题同步与手动名称协调

实现 82251f7：初始自动标题同步经 ThreadStore 执行并共享会话写操作锁。同步未结束时手动重命名可保留输入并重试；thread/start 等待期间已经确认的本地手动名称在远端创建后优先同步。自动同步不会将 titleSource 改为 manual，失败仍不阻塞 turn/start。

验收修正：本地身份与远端别名分别留有手动名称时，按确认顺序选择最新值，避免较旧本地名称覆盖较新远端名称。13 项测试（含真实 app-server）通过；真实服务验证手动重命名后迟到的初始标题同步保留手动名称。新增浏览器测试覆盖远端创建等待、自动同步等待与同步失败三种时序，均通过命令面板真实重命名入口验证，消息发送次数保持一次、手动标题持久化。原重命名界面回归及生产构建通过。这是本应用实例发起的请求协调，不处理其他客户端同时修改标题的服务器级冲突。

## Windows 便携 ZIP 发布

实现 ca8a585：桌面目录组装后生成完整文件清单（当前包 832 项），验证文件哈希、大小及精确文件集合，拒绝符号链接/目录联接和非法清单路径。便携发布验证目录及内置运行时，生成 ZIP、SHA256SUMS.txt 和使用说明，拒绝覆盖现有目标或把产物写进源包内部。

验收：从生成 ZIP 校验后解压，并在仓库外含空格路径执行真实 Electron 验收；内置 app-server、模型列表、WebP/GIF 解码、PTY 命令和提醒关闭/重启恢复通过。补齐重复执行入口、目录联接拒绝测试及 windows-portable-release.md 操作说明。产物是未签名 Windows 便携包，仍不代表签名安装器、干净虚拟机或跨平台发布已完成。

## 打包第三方组件与许可声明

实现 bd393e9：Vite 从输出 chunk 的模块记录收集 npm 组件与许可文本，桌面打包将其与复制的 npm 组件、Electron/Chromium、Node 和 Codex 许可索引汇总。THIRD-PARTY-COMPONENTS.json 和 THIRD-PARTY-NOTICES.txt 随包交付并进入完整性清单；缺少元数据/文本及尚未审计的传递依赖显式标为 reviewRequired。

验收：当前产物含 13 个前端和 13 个桌面 npm 组件，全部找到许可文本；835 项文件完整性验证通过。8 项发布测试覆盖仅收集输出模块、版本匹配、缺失文本标记、外部声明缺失时拒绝生成、目录清单/目标保护。新 ZIP 解压后对照实际桌面与前端依赖验证清单及完整许可文本，并通过真实 Electron 启动、内置后端、图片解码、PTY 和提醒重启恢复。发布说明及可重复验收入口已更新。

Codex Rust 传递依赖和原生二进制传递依赖仍需进一步许可审计；此增量不等同于完整发布法律审查、签名安装器或多平台认证。

## 自动化请求互斥跨页面保留

实现 07d8243：已有 AutomationRepository 写接口统一按任务 ID 保护保存、运行、停止、删除与状态切换，新建使用独立互斥键。共享仓库的锁不随 ScheduledPage 卸载而消失；请求确认或失败后释放，不把运行任务的执行期当作请求等待期。不同任务与读取接口保持独立。

验收：8 项仓库测试覆盖全部五类写入交叉互斥、创建防重、输入快照、同步/异步失败释放和仓库隔离。新增浏览器测试在暂停请求等待期间离开并重新进入任务页，验证暂停和运行均不重复调用后端，失败后重试只记录一次成功动作。原写操作防重/弹窗保护回归与真实 TaskScheduler 的创建、运行/停止、失败输出、提醒、时区、重启、重试及布局回归通过，生产构建通过。总计划中“变更接口待整合”的过期状态已修正；整页刷新、另一个窗口和其他进程的互斥仍由原生调度器负责。

## 按筛选批量导出任务运行历史

实现 ad7e800：任务详情页根据现有搜索和结果筛选提供“导出已结束记录（数量）”。生成一个文本文件，列出筛选条件、记录数量、运行 ID，以及每次运行保存的名称/配置、环境、错误、截断提示和输出。运行中的记录不计入导出，空结果禁用；点击时立即生成内容快照，后台刷新及后续筛选变化不会改写等待保存的内容。

验收：4 项导出测试和生产构建通过。浏览器连接真实 saveTerminal 文件保存实现，覆盖筛选范围、运行中及空结果保护、同一事件循环防重、等待时改变搜索、取消不写入、保存失败可重试；逐一读取实际文件确认记录范围和元信息。真实 TaskScheduler 完整界面回归通过。导出范围仅为当前服务端保留并加载的记录（调度器最多保留最近 50 次），不声称恢复已清理的历史；界面中的保存目标仍由原生保存对话框选择。

## Git 提交说明搜索

实现 64f718d：提交历史页新增搜索与清除入口，对所选本地/远端分支的完整提交说明执行 Git 固定文本匹配（包括正文），按匹配结果分页。关键词作为独立参数传递，最多 500 字单行，括号/星号和类似选项的文字不作为正则或 Git 参数执行。搜索/清除/换分支重置页码，分页固定提交快照。

验收修正：进入详情时将当前历史锚点保存在分页状态，返回列表保持同一快照；显式刷新或重新搜索才读取新的 HEAD。两项真实 Git 测试覆盖超过一页的匹配结果、新提交后的锚定分页、正文/特殊文字/分支范围、坏输入以及工作区不变。真实 Git 浏览器验收覆盖搜索、详情返回快照、新 HEAD 刷新、分支切换、延迟请求、无结果和失败重试；原历史界面回归及生产构建通过。该入口搜索提交说明，不是工作区内容搜索或按作者/哈希过滤。

## 历史 Git 提交评审草稿

实现 f4302b1：历史提交详情提供可选评审重点及加入草稿入口，将仓库、完整提交 ID 和差异追加至现有会话草稿，提示以该提交及其父提交为依据。大于 60000 UTF-16 代码单元的详情明确标注截断并保留完整提交身份供继续读取。读取失败、等待或空详情时禁用入口，重试保留重点。

验收修正：同步防重避免连续操作重复追加，截断不拆开 Unicode 代理对。3 项单测及真实临时 Git 仓库浏览器验收通过，覆盖失败/等待保护、重点保留、完整提交与补丁内容、原草稿保留、连续点击和刷新持久化；仓库 HEAD/工作区保持不变。历史搜索界面回归和生产构建通过。此入口准备评审草稿，发送与模型评审由正常会话流程处理，本轮不声称验证了模型评审结论质量。

## ThreadStore 会话恢复快照

实现 2fec773：ThreadStore.resume 经注入后端读取并校验会话身份、回合和消息，再返回独立的历史/运行状态、渠道、模型、目录、推理强度与权限快照。主界面恢复路径不再依赖原始传输载荷；仍由既有选择生命周期与运行事件版本判断是否应用结果。null 推理强度归一为模型默认，未知强度和缺失权限证据保持未确认。

验收：14 项恢复/仓库/真实 app-server 测试通过，覆盖配置归一、返回历史及运行回合独立、并发身份校验与失败重试、真实恢复目录/权限/内容。四项浏览器回归通过：恢复失败/坏响应/迟到结果与草稿保护、任务运行会话打开、会话模型隔离、归档删除队列生命周期；生产构建通过。本轮完成恢复读取边界迁移，启动、回合发送/流及全部历史读取仍有后续领域拆分工作。

## ThreadStore 新会话创建

实现 f48f205：新会话经 ThreadStore.start 创建，捕获请求参数，按本地会话身份防止重复创建；成功响应须含有效字符串远端 ID 与合法渠道类型，再返回独立的身份和权限快照供界面绑定。失败或坏响应释放请求锁，保留草稿，不继续 turn/start；不同本地会话可以独立创建。

验收：4 项测试含真实 app-server 创建通过，覆盖坏身份、参数快照、并发防重、失败重试和权限。三项浏览器回归通过：异常创建载荷不会绑定/发送且保留输入，修复后成功发送；远端创建等待期间手动标题协调；新会话渠道/目录选择和成功后的锁定。验收修正测试的图标按钮等待条件，以及旧渠道测试中相对默认目录与缺少 ID 的恢复模拟响应。生产构建通过。坏响应发生后服务端可能已经建立会话，本轮不声称服务端创建具有幂等去重或自动清理能力。

## 回合发送确认边界

实现 385629b：直接发送、队列发送与追加指令统一经过可注入 TurnCommands，捕获输入快照并在请求等待期间按会话互斥。turn/start 必须返回有效回合 ID 和已知状态，可选会话 ID 必须匹配；turn/steer 必须确认预期运行回合。缺少状态时兼容为 inProgress。坏确认不会按成功清理草稿或派发下一条队列消息。

验收：4 项测试含真实 app-server 回合启动通过。新增界面测试注入空/数字 ID/未知状态确认，验证直接输入保留，追加指令错回合保留草稿，正常重试成功；队列坏确认保留两条记录并暂停。原队列回归以及多会话并发、追加/停止失败、早完成和断线生命周期回归通过；生产构建通过。验收修正队列“发送未确认”重复拼接，旧停止失败断言改为匹配包含重试说明的 alert。服务端可能已执行未被确认的请求，因此保留检查记录后手动重试，不自动重发。

## ThreadStore 会话分叉

实现 d634594：整段会话和指定回复分叉统一经过 ThreadStore，捕获源身份及回合参数，校验独立远端 ID、渠道与权限快照。等待期间与源会话重命名、归档等写操作共享互斥，确认后才创建本地分支。

验收：12 项测试含真实 app-server 分叉通过，覆盖源历史保留、身份和权限校验、别名互斥、参数快照及失败重试。三项浏览器测试通过：新增异常确认测试分别验证整段和回复入口拒绝数字/空/原会话 ID，保留历史及草稿，连续点击只发送一次，随后有效重试成功；原分叉回归覆盖设置继承、等待期间切换会话、运行保护，历史回复回归覆盖分页定位失败和重试。生产构建在实现阶段通过，本轮仅增加验收测试和文档。尚未校验返回 ID 是否属于其他已有会话，亦不保证坏确认对应的服务端分支被自动清理。

## ThreadStore 完整历史读取

实现 5ea7e17：完整历史查找、Markdown 导出和旧回复回合定位通过同一个 ThreadStore。传输层只保留分页 RPC，Store 负责完整读取、校验及逐页独立快照；保留有效未知条目，拒绝坏历史，读取不直接修改会话状态。进度、取消及分页循环保护沿用原读取器，界面继续负责活动版本和当前会话检查。

验收：22 项测试含真实 app-server 分页历史和回合定位通过，覆盖快照隔离、无部分应用、取消等待、独立重试及坏分页。三项浏览器验收通过：完整历史查找的失败/坏条目/取消/迟到结果/切换会话保护；导出的完整分页、未知工具、附件、取消、保存失败及坏条目不保存；旧回复定位和分叉重试。验收将导出成功用例的空值及缺失 ID 改为有效记录，并新增坏条目拒绝、已有消息保留与有效重试断言。生产构建通过。取消终止本地等待及后续分页，不声称撤销已发送 RPC；历史分页仍以服务端游标语义为准，本轮没有引入服务端跨页事务快照。

## ThreadStore 渠道切换确认

实现 fefcaff：已有会话渠道切换经 ThreadStore，共享会话本地/远端身份互斥，复制源身份后发送请求。响应必须确认原远端会话、目标渠道和目标模型，权限返回独立快照；坏响应释放操作锁但不更新本地渠道和模型。

验收：17 项单测及路由器测试通过，覆盖异常确认、权限快照、同源操作互斥、参数捕获、失败重试以及后端迁移/回滚逻辑。三项浏览器验收通过，注入空响应、错会话、错渠道、错模型后原设置、历史和草稿保留，随后有效重试发送使用正确渠道模型；同时覆盖等待期间导航隔离、重新打开会话的渠道恢复、新会话渠道目录及凭据选择。生产构建通过。本轮没有对所有真实模型服务逐一联调；服务端可能已完成未被客户端确认的迁移，因此错误提示要求重新打开会话核对，不声称客户端拒绝确认等同于服务端回滚。

## ThreadStore 权限更新确认

实现 26cae93：当前会话权限更新迁入 ThreadStore，与同源渠道切换、重命名、归档等操作共享互斥。后端仍等待 RPC 应答和同会话设置通知，Store 再校验实际沙箱、审批策略、审批方是否匹配所选权限；返回独立权限快照，失败不记录请求权限为已应用。全局设置通知仍反映服务端实际设置，允许展示与请求不同的有效权限。

验收：7 项测试通过，含真实 app-server 在默认和 unelevated Windows 沙箱配置下的三种权限切换、恢复核对及监听器清理；单测覆盖不匹配通知、快照、同源互斥、身份捕获和失败重试。两项浏览器验收覆盖空通知/不匹配通知错误提示与草稿保留、有效重试、等待禁发、运行禁改、默认权限持久化、权限降级提示及恢复失败。修正旧测试“恢复线程失败”为实际“恢复会话失败”文案。生产构建通过。确认依据是后端实际设置通知，不代表本轮验证了所有操作系统权限隔离场景，也不撤销服务端已执行的设置更新。

## 回合流生命周期通知边界

实现 3a9a8c0：开始、完成及助手文本增量在写入队列、消息和运行状态前统一检查显式会话/回合身份；文本还要求有效条目身份及字符串增量，完成只接受终态。移除缺少会话身份时写入当前会话的回退。运行记录中已结束的回合拒绝迟到开始/增量及重复完成，有其他活动回合时拒绝跨回合增量。

验收：2 项单测及生产构建通过。三项浏览器测试通过：新增坏身份/坏文本/非法状态不会改动本地消息，迟到开始/增量/重复结束保持原完成状态，正常文本累加和后台会话隔离、后续回合与草稿保留；原多会话生命周期回归及队列 FIFO、取消、失败暂停、重试、持久化不重放回归通过。本轮校验三类通知，工具、错误、计划等其他事件仍使用原处理路径；已结束回合识别沿用运行记录最近 64 个回合，重连清空后不提供跨进程永久去重保证。

## 工具增量与最终输出保护

实现 76336dd：工具事件写入前验证条目身份和可选回合身份，已有工具拒绝类型冲突及明确的回合冲突。已结束工具拒绝迟到开始、输出、推理摘要和补丁增量，完成事件仍可提供权威最终结果。非字符串输出和坏补丁不创建工具记录，输出定位不再回退到最后一条消息。

验收：15 项测试含工具恢复、推理摘要与新增异常边界测试通过，生产构建通过。两项浏览器验收通过：执行记录注入缺失 ID、坏输出、迟到开始/输出、跨类型增量和迟到/坏补丁，确认本地工具记录保持原样，刷新后最终输出与差异保留；同时覆盖布局、剪贴板、回复分叉和推理摘要流/完成/中断/历史。验收修正旧测试的文件变更卡片选择器及 thread/resume 模拟结构。本轮并未完成所有工具载荷字段的完整 schema 校验；缺失回合身份仍兼容旧工具记录，完整会话事件领域拆分继续进行。

## 助手最终回复补全

实现 59936ff：助手增量和 item/completed 的 agentMessage 统一处理，最终文本替换临时拼接内容，缺少增量时直接建立回复；按条目 ID 去重并保留原时间和回合身份。完成标记阻止后续增量追加，完成事件自身不结束或重启回合。校验会话、回合、条目身份和文本类型，冲突时保留原消息。

验收：4 项测试、生产构建和三项浏览器验收通过。新增界面断言覆盖回合结束后的最终修正、运行期间部分文本被完整回复替换、重复完成、迟到增量、无增量补建、坏文本/回合冲突拒绝、草稿及刷新持久化；原回复分叉和历史重叠分页去重回归通过。验收修正测试初始化在刷新时重置存储的问题。本轮依赖收到有效最终事件，未提供断线期间事件自动补发；重新读取服务端历史仍使用独立恢复流程。

## 计划进度和正文事件保护

实现 3a63c2d：计划进度拒绝含坏步骤的整份更新，避免过滤后用残缺计划覆盖已有进度；返回独立步骤快照。计划正文完成事件校验会话/回合/条目身份和文本类型，已有消息只允许同回合助手消息更新，其他活动回合的迟到正文不应用。

验收：5 项测试及生产构建通过，覆盖坏步骤、身份、快照独立、正文校验及计划模式参数。两项浏览器验收通过：计划进度坏更新保留原步骤，坏正文和缺 ID 正文不写入，重复完成不新增，新回合隔离旧正文，草稿审核后按计划执行正常；回合异常事件及最终回复补全回归通过。本轮未实现计划版本号排序；同回合有效更新按到达顺序处理，无活动回合时仍可接收有效计划正文完成事件。

## 错误通知边界

实现 6e94f17：error 通知进入会话状态前要求有效会话/回合身份、可显示的错误文本及可选布尔 willRetry。已知成功或中断结果拒绝迟到错误，已结束或不属于活动回合的重试提示不应用；真实失败仍保留错误记录。

验收：7 项测试和生产构建通过。三项浏览器验收覆盖缺失身份/坏文本/非布尔重试不新增失败记录，成功后的迟到失败/重试不改变结果，合法服务端重试不产生失败消息；原失败回合恢复文本、附件、技能、插件且不自动发送，以及并发会话、停止失败、迟到失败、断线生命周期回归通过。结果判定依赖内存中最近 64 回合的终态，未承诺跨重连永久去重；未知旧回合的合法错误仍可作为历史错误记录保留。

## ThreadEvents 消息流协调层

实现 16c9376：独立 ThreadEvents 承接回合开始/结束、助手增量/完成、工具、计划和错误事件，注入状态更新、运行记录、队列和审计接口；主界面转交已处理事件，连接、审批、权限、用量与警告通知仍保留原路径。延续已有各类校验和副作用顺序。

验收：15 项相关测试覆盖两会话并发完整事件链、工具最终输出、助手补全、终态去重、失败和重试提示、未处理通知转交，以及旧回合失败时新回合和计划保持运行。五项浏览器回归通过：异常通知/最终回复、多会话生命周期、队列、计划到执行、工具记录/文件差异/分叉；生产构建通过。本轮完成消息流协调逻辑抽离，并未完成所有主界面状态与服务请求领域迁移。

## 服务请求回答层

实现 87bad00：共享 ServerResponses 承接审批、权限、用户补充问题和 MCP elicitation 的响应映射，在发送前复制完整载荷，按带类型的请求 ID 互斥。只有 ok === true 才确认成功，失败释放锁；主界面继续负责成功后的审计和请求移除，各对话框负责输入与错误展示。

验收：3 项测试覆盖数字/字符串 ID 区分、重复等待、权限/答案独立快照、取消载荷、坏确认与同步失败重试。三项浏览器验收通过：审批队列已解决切换/焦点/迟到错误隔离/连续点击，新增非布尔成功确认不关闭审批且可重试，权限允许拒绝载荷以及用户问题输入/敏感字段/失败保留/取消/已解决处理。生产构建通过。本轮不改变服务端请求生命周期，未提供跨重连请求 ID 永久去重；MCP 表单映射通过单测，本轮未新增真实 MCP 服务端联调。

## 服务请求编号复用隔离

实现 f2bf7d6：ServerResponses 使用提交令牌，在 serverRequest/resolved 或连接关闭时使旧提交失效；旧结果不再触发成功处理或传播过期错误，清理只释放自己的令牌。接收请求时生成独立 UI 实例键，避免同编号新请求沿用旧表单忙状态；成功移除以请求对象实例匹配。

验收：4 项测试及生产构建通过。三项浏览器验收通过，审批队列新增“已解决/断线 × 旧成功/旧失败”四种编号复用组合，验证新审批可提交、旧结果不关闭新审批/释放忙状态/显示旧错误；补充问题和普通权限审批回归通过。测试模拟桌面连接关闭及请求重发，不声称验证真实后端跨进程重放协议；已发送响应不会被本地失效机制撤销。

## 历史恢复中的回复完成证据

实现 77814b4：经过校验的 thread/resume 回合状态随条目传入恢复层，终态回合的助手回复标为流结束；完整历史重载保留已有同条目/回合的完成标记。运行中或未知状态且没有完成证据的回复仍允许增量，避免恢复后卡住正常流。

验收：16 项不同的相关测试最终通过，包含回复恢复、ThreadStore、恢复解析和真实 app-server；真实后端测试首次在已有归档列表立即可见断言失败，重跑通过，未将此波动解释为回复恢复缺陷。三项浏览器验收通过：已完成回复恢复后再加载完整历史仍拒绝迟到增量，运行中回复可继续拼接；历史去重及最终回复/异常事件回归通过。生产构建通过。无终态证据的旧历史不自动判定完成，本轮不提供断线事件重放保证。

## 操作记录筛选导出

实现 e96ad8b：设置的操作记录页面新增“导出筛选记录”，通过原生 Markdown 保存接口导出点击时的当前匹配记录，包含导出时间、搜索条件、范围及带 ID/时间/动作/详情的 JSON 记录块。只取已有审计字段，保留旧项目详情脱敏，代码围栏适配详情内容。读取失败或无匹配记录禁用，等待期间同步防重，取消不显示成功，保存失败支持重试。

验收：3 项单测和原生保存测试、生产构建通过。新增浏览器验收实际保存至临时文件，覆盖改变搜索后的快照一致性、连续点击单次保存、取消不覆盖、失败重试、路径脱敏、无匹配及读取失败禁用；原操作记录搜索、清空和新操作写入回归通过。范围仅当前设备现存最多 200 条匹配记录，不含已清理历史，也不代表所有操作已纳入审计。

## Git 成功操作审计

实现 5e86a51：Git 面板的暂存/取消暂存、提交、获取/拉取/推送/发布、stash、合并及工作树创建，分支管理的切换/创建/跟踪/删除，以及工作树删除，在成功应答后写入固定动作名。不会记录路径、分支名、远端地址、提交说明或补丁；只读操作不记录为写操作，失败不记成功。

验收：19 个动作映射及未知/只读动作排除单测通过，生产构建通过。两项真实临时 Git 仓库界面验收覆盖过期快照失败、等待无记录、暂存/取消/提交顺序与次数、创建分支失败后成功，以及无详情字段；工作树模拟界面验收覆盖取消、失败重试、活动保护和单条删除记录。验收将旧工作树模拟短哈希改为完整哈希。本轮未逐一联调所有远端写操作，也不记录失败操作的部分副作用；审计为本机 UI 确认记录，非 Git 全局操作日志。

## 工作树列表刷新保护

实现 77b4d91：工作树列表要求绝对路径，拒绝控制字符和非字符串分支名；locked/prunable 仍兼容协议布尔或字符串。刷新开始时清空旧条目与删除确认，操作函数再次检查加载状态和目标是否仍在当前列表，失败后不暴露旧入口。

验收：5 项测试通过，含解析边界和真实 Git 注册工作树的删除/本地数据保护；生产构建通过。三项浏览器验收通过：从已有删除确认刷新到坏列表后确认框及打开/删除入口消失，无删除请求，有效重试恢复；原删除失败重试、运行/队列保护、打开工作树、目录绑定和坏项目响应不改状态回归通过。列表校验不替代原生 Git 操作时的 HEAD、路径与脏工作区检查；本轮没有跨设备文件系统验证。

## 冲突版本内容辨别

实现 8e9dcfd：冲突阶段要求字符串正文或有意义的不可预览说明，不再把缺字段当空文件。合法空字符串仍显示空文件，缺少单个阶段仍表示新增/删除；整个阶段列表为空时明确提示“没有未合并版本，冲突可能已解决”，要求返回刷新 Git 变更。

验收：6 项测试通过，包含解析边界及真实 Git 合并冲突提交保护与解决后暂存；生产构建通过。浏览器验收新增缺内容、空原因、有效重试、空文件、二进制不可预览及空列表显示，并回归文本安全显示、冲突草稿保留、提交保护和标记解决刷新。空列表不会自动宣告工作区全部冲突解决，仍以刷新后的 Git 状态为准。

### 编辑器保存确认保护（2026-09-19）

- 实现提交：e665b91。保存仅在 `ok === true`、结果可完整编辑、版本非空白且文本与提交内容完全一致时关闭编辑器；保留 CRLF 提交规则。异常确认保留草稿、原版本和撤销/重做记录，并提示核对磁盘。
- 验证：`file-editor-ui.cjs` 覆盖非布尔成功、缺结果、空白版本、文本不一致、截断结果、失败重试、并发保存去重、空文件成功保存，以及后端可能已写入时通过重新读取恢复。`workspace-files.test.cjs` 与 `editor-history.test.cjs` 共 4 项通过，真实磁盘外部修改拒绝覆盖，生产构建通过。修复旧界面夹具缺少 directory/symlink 字段，并在跨工作区测试后恢复正确文件选择。
- 边界：界面确认校验不代表写入回滚；响应异常时磁盘可能已经保存，需要核对或重新读取。本轮未增加自动合并、文件监视或操作系统级原子比较交换，现有版本检查与重命名之间的竞争窗口仍存在。构建保留已有大于 500 KB 分包提醒。

### 编辑器磁盘版本对照（2026-09-19）

- 实现提交 a550645：编辑器提供“查看磁盘版本”，对照编辑起点和读取时的磁盘快照，支持复制磁盘内容与关闭对照。用户草稿仍在原编辑区，不重置撤销/重做和保存基准；操作复用读写互斥，刷新开始撤下旧快照，失败可重试。磁盘与起点版本不同会明确提示。
- 验收：`editor-disk-version-ui.cjs` 使用浏览器调用真实 workspaceFile 和临时文件，验证外部写入后显示新内容且保存拒绝覆盖，查看不发起写入，草稿/撤销/重做保留；二进制和文件删除清除旧对照、恢复后重试成功、空文件显示正常，600/1280 像素布局分别为单列/双列。`file-editor-ui.cjs` 回归、4 项原生文件/编辑历史测试、生产构建通过。验收阶段无需产品修正，扩展测试覆盖。
- 范围：目前提供完整文本对照，未实现逐行差异标色、自动合并或监听刷新。磁盘快照可能随后变化；查看不会授权覆盖新版本，保存仍使用编辑起点版本校验。

### 保留草稿采用磁盘基准（2026-09-19）

- 实现提交 ffbd644：磁盘版本对照提供显式采用操作，确认说明不会自动合并或立即写盘、后续保存会用草稿替换所查看版本。确认保留草稿和撤销/重做历史，更新保存版本与文件预览；版本一致时禁用采用，草稿与基准相同时保存禁用。
- 验收：扩展 `editor-disk-version-ui.cjs`，真实临时文件覆盖取消/接受确认、不写盘、保留历史、采用后外部再次改变仍拒绝覆盖、刷新并手工合并后保存正确 CRLF 字节。独立补验空文件基准、草稿相同为干净状态、撤销变脏、重做恢复干净且无需放弃确认即可关闭。原编辑器界面、4 项原生文件/历史测试和生产构建通过。验收未发现需要修正的产品问题。
- 边界：这是手工合并的基准切换入口，不提供自动合并或冲突标记解析。用户需将要保留的外部改动整理进草稿；再次保存仍由原生文件版本校验保护，已有版本检查与重命名之间的竞争窗口未在本轮解决。

### 终端查找筛选（2026-09-19）

- 实现提交 2105660：缓冲区查找新增区分大小写与整词匹配，前后查找、选项变化和新输出重新定位统一使用 xterm SearchAddon 选项。选项保留在当前终端会话内，关闭查找后重新打开仍保留，新会话默认关闭。
- 验收：`terminal-ui.cjs` 使用真实 PowerShell PTY，覆盖大小写切换、整词/子串匹配、新输出到达后匹配、原输入/中断/导出/重启流程；验收扩展两个终端的选项隔离、重开查找保留、390 像素下输入和复选框范围及操作。构建通过；本轮未发现需要产品修正的问题。
- 范围：查找限当前 xterm 缓冲区，最多保留 5000 行历史；整词边界沿用 xterm，不声明语言学分词。选项不跨应用重启持久化。

### 终端启动与重试状态（2026-09-19）

- 实现提交 7567cef：启动期间禁用重启并由同步锁保护连续点击；同步抛错和异步拒绝显示启动失败，允许再次尝试。创建需严格成功确认及非空会话 ID；组件已清理时不再执行尚未开始的延迟创建，已经开始的创建在迟到成功后关闭对应会话。
- 验收：`terminal-start-ui.cjs` 控制创建结果时序，验证等待期间不重复创建、同一事件周期双击重试仅创建一次、失败恢复、关闭后迟到结果清理且不影响新会话。独立补验同步抛错、缺失/空白 ID、非布尔成功确认和确认前已收到退出事件，均可正确进入失败/退出状态。真实 `terminal-ui.cjs` PowerShell 全流程和构建通过。
- 限制：此轮仅加固创建/重试，不代表完整终端事件协议校验。没有对挂起创建设置超时；用户仍可关闭标签，若创建随后返回则清理其进程。现有构建大分包提示仍存在。

### 终端事件校验与终态保持（2026-09-19）

- 实现提交 e49b588：接收事件先校验有效会话编号、明确 data/exit 类型、字符串输出和安全整数退出码，提取独立字段快照；未知事件不再被误当退出。退出后忽略迟到输出与重复退出，其他会话编号不改变当前会话。
- 验收：2 项 `terminal-events.test.cjs` 覆盖格式边界、空文本、ANSI/中文原文和快照独立；扩展 `terminal-start-ui.cjs` 验证未知事件/坏输出/坏退出码不妨碍有效输出和运行状态。独立补验创建确认前 1100 条无效事件不占用有效缓存、有效退出仍处理，重复退出不改首次退出码，迟到输出不进入导出缓冲区。真实 `terminal-ui.cjs` PowerShell 回归和生产构建通过。
- 边界：有效启动前事件仍沿用最多 1000 条缓存；本轮没有解决高吞吐启动缓存溢出或跨进程事件重放。终态基于当前 UI 会话生命周期，不跨应用重启持久化。

### 终端启动缓存限额与退出保留（2026-09-19）

- 实现提交 11b83b0：创建确认前缓存最多 1000 条输出、合计 1,048,576 UTF-16 代码单元，最多记录 64 个会话。整块接收输出，超限后当前会话后续启动输出不再保留；退出状态不计入输出配额，首次退出后忽略后续事件。确认后按会话回放并清空全部启动缓存。截断时明确提示日志可能不完整。
- 验收：6 项事件/缓存测试覆盖条数溢出后保留退出、超大块、会话隔离、快照、64 会话上限、恰好字符上限及 drain 后恢复容量；时序界面验证超大输出仍退出且可重试，日志不含被丢弃内容。真实 PowerShell `terminal-ui.cjs` 全流程及构建通过。
- 限制：超过 64 个不同会话编号时不再记录新编号的事件（包括退出），但显示溢出提示；正常原生管理器同时最多 8 个终端。此限额仅覆盖创建确认前缓存，不构成整个 PTY/IPC/xterm 链路的内存上限或持久日志能力。丢弃内容无法从缓冲区导出中恢复。

### 终端标签名称（2026-09-19）

- 实现提交 fffa2a0：终端标签增加重命名按钮和标签焦点下 F2；复用可配置主题的应用内重命名弹窗，支持取消、空白禁用、中文输入法提交保护和 80 字符输入限制。标签名称不参与 PTY 创建依赖，长标签最大 180 像素并省略显示，完整名称仍为无障碍标签。
- 验收：真实 PowerShell `terminal-ui.cjs` 确认改名不改变进程编号，名称在隐藏/切换与重启进程后保留，其他终端维持独立默认名称；覆盖首尾空白、空名称、Escape 取消、输入法 Enter 不提交，以及 390 像素下长标签布局。原 `rename-thread-ui.cjs` 回归与生产构建通过。验收阶段扩展测试，无产品修正。
- 范围：名称仅在当前终端标签生命周期内保留，不跨关闭标签或应用重启持久化；不重命名操作系统进程，不影响导出日志文件的会话编号。

### 回复代码块自动换行（2026-09-19）

- 实现提交 3a7994f：每个代码块提供独立自动换行按钮，以 aria-pressed 表达状态，代码区可聚焦并用键盘滚动；换行仅改变显示，复制仍使用原始代码内容。
- 验收：`code-wrap-ui.cjs` 验证长行换行、代码块隔离、键盘开关/聚焦、缩进和制表符原文复制、组件内容增量更新后选项保留及最新内容复制；600 像素和 390 像素收起侧栏状态通过。`markdown-rich-ui.cjs` 回归和生产构建通过。验收补充测试，无产品修正。
- 边界：选项仅当前代码块组件生命周期保留，不跨重新加载持久化；未实现语法高亮或代码执行。390 像素展开侧栏时正文宽度不足，换行无法弥补整体布局的空间限制，需收起侧栏。

### 窄屏侧栏与正文切换（2026-09-19）

- 实现提交 52328dc：760 像素及以下改为单区导航，初次打开和从宽屏进入时自动收起侧栏。展开时侧栏占完整内容区，正文仅隐藏而不卸载；选择会话、新对话、已安排、插件或设置后收起侧栏。宽屏仍可同时显示左右区域，窄屏正文内边距减至 16 像素。
- 验收：`narrow-sidebar-ui.cjs` 在 390 像素验证正文/侧栏宽度、隐藏正文、草稿保留、会话切换、新对话及跨 1280/390 断点；独立扩展 Ctrl+K 搜索聚焦和已安排/插件导航。`code-wrap-ui.cjs` 更新为无需手工收起初始侧栏，长行/复制验收通过，生产构建通过。
- 边界：采用单区切换而非覆盖式抽屉；返回宽屏不会自动展开先前已收起的侧栏，用户可通过标题栏按钮展开。此轮解决侧栏挤压正文，不代表所有设置页、工具面板和弹窗均完成窄屏适配。

### 窄屏快捷入口显示目标正文（2026-09-19）

- 实现提交 f5ee5d2：新对话、选择会话、聚焦输入、命令面板/菜单页面导航及历史导航先收起窄屏侧栏。通知打开会话和设置返回在窄屏显示正文，宽屏维持显示侧栏。
- 验收：扩展 `narrow-sidebar-ui.cjs`，390 像素展开侧栏后 Ctrl+Shift+L/O 能显示并聚焦输入，通知打开会话显示正文，命令面板进入设置及返回正常；1280 像素菜单聚焦保持分栏。当前 5318 服务上的 `app-shortcuts-ui.cjs` 回归通过，生产构建通过。
- 验收校正：旧菜单测试默认 5329，最初通过结果不计入本轮证据。当前产品在 760 像素以下隐藏应用菜单，故扩展验收改为窄屏命令面板与宽屏菜单，不强行显示不存在的窄屏菜单入口。本轮不声称旧菜单完整脚本已在当前服务通过。

### 会话查找按记录类型筛选（2026-09-19）

- 实现提交 fd73ade：会话内查找可选择全部记录、我的消息、助手回复、工具记录。带 tool 的消息归为工具记录，不重复进入助手回复范围；文本与附件/技能/插件/工具信息沿用原匹配规则。切换范围重新定位首个匹配，切换会话或查找重置恢复全部。
- 验收：`conversation-find-scope-ui.cjs` 覆盖四类范围、匹配计数、工具展开、附件匹配、无匹配清除高亮和禁用导航、范围内下一条、会话切换重置；独立补验关闭重开保留范围、回到全部重选首条、390 像素选择器可见及操作。`narrow-sidebar-ui.cjs` 回归和生产构建通过。
- 范围：仅筛选已加载记录；需要先使用已有“加载完整历史”扩展远端检索内容。本轮未改变历史读取或新增服务端全文索引。

### 会话查找历史请求隔离（2026-09-19）

- 实现提交 fe7e44a：查找重置或组件清理时先使历史请求失效再发送取消，重置清空加载状态与进度。所有进度、结果和结束处理均核对当前请求身份；已取消请求即使返回成功仍提示取消，不显示加载成功。
- 验收：`conversation-history-race-ui.cjs` 对真实 React 组件注入可控加载服务，验证重置取消、旧进度/成功不改变新进度或锁、取消后的迟到成功、旧失败隔离、当前失败及成功重试。`conversation-find-scope-ui.cjs` 回归和构建通过。独立验收仅扩展测试，无产品修正。
- 边界：此改动保护查找组件的加载状态，不保证任意外部加载实现支持物理取消，也不回滚其已经完成的写入。真实历史服务的取消/状态提交检查仍由原历史读取实现负责，本輪未新增完整后端恢复测试。

### 消息复制反馈与内容版本（2026-09-19）

- 实现提交 e005ad8：用户消息与助手回复共用 useMessageCopy，复制点击时文本，等待期间同步锁和按钮禁用，内容变化/卸载使旧结果失效，失败后可重试。新的复制开始清除先前成功提示；助手仍沿用 replyText 去除隐藏推理。
- 验收：`message-copy-race-ui.cjs` 对两种组件覆盖同事件周期双击、等待禁用、旧成功不标记新内容、失败/重试、成功提示随内容更新清除及旧失败不显示错误；旧失败测试等待 React 提交更新后才释放请求，避免把尚未提交的 props 当成已更新。原 `user-message-copy-ui.cjs`、4 项消息动作测试及构建通过。
- 边界：剪贴板写入本身不可取消，旧请求可能完成对剪贴板的写入；隔离的是界面反馈。新内容须等待当前写入结束后再复制，不并发写入。

### 消息文件预览读取校验（2026-09-19）

- 实现提交 a080006：消息预览接入共享 parseWorkspaceResult，严格成功标记；解析要求可显示文本、非空图片源或明确二进制标记，检查截断、编码状态和预览字节字段类型。异常响应展示错误，旧内容和编辑入口撤下，可刷新重试。
- 验收：6 项响应/真实工作区文件测试，扩展 `artifact-preview-ui.cjs` 覆盖缺内容、坏大小/字节字段、非布尔成功、重试、空文件、截断和二进制。验收修正 PreviewText 空文件高度为至少一行，保留可聚焦区域；预览/编辑流程和 `preview-image-ui.cjs` 回归、最终构建通过。
- 范围：此轮校验显示所需结构，不执行图片 URL 可信度认证，也不保证所有字段组合的业务一致性；路径边界和实际读取仍由原生 workspaceFile 负责。

### 文件预览自动换行（2026-09-19）

- 实现提交 f1f5fe8：文本预览提供独立自动换行开关，使用原有逻辑行和字符偏移处理跳转/搜索；切换显示模式重新滚动至当前定位，复制仍使用读取原文。
- 验收：扩展 `preview-copy-ui.cjs`，390 像素验证长行换行后无水平溢出、逻辑第二行跳转、中文搜索高亮、CRLF/缩进原文复制、键盘切换恢复横向滚动。独立补验截断内容保留换行状态、复制范围明确、超出已预览行报错，以及空文件/BOM/末尾换行；原预览编辑回归与构建通过。
- 范围：选项保留于当前预览组件生命周期，父级刷新导致卸载时恢复默认；不会读取超过原预览限制的内容，也不改变实际文件。

### 文件编辑器行号跳转（2026-09-19）

- 实现提交 63a88d0：行号输入与 Ctrl/⌘+G，基于当前草稿的逻辑行选择并滚动到目标位置。仅接受有效整数行号；空文件视为一行，空白行和末尾行可以定位。操作中禁用控件，不改变文本或撤销历史。
- 验收：`editor-go-to-line-ui.cjs` 验证 100 行文件的第 90 行选择和滚动、末尾空行、无效行号保留原选择、中文/emoji 偏移及编辑后撤销；独立补验输入法 Enter 不提交、空文件第一行及越界错误。`file-editor-ui.cjs` 回归和生产构建通过。
- 范围：按当前 textarea 的不换行布局和计算行高滚动；不提供列号输入，也不增加语法分析或大型文件编辑能力。

### 来源行号进入文件编辑器（2026-09-19）

- 实现提交 232bdbc：FileEditSession 传递可选 lineNumber，消息预览与工作区搜索编辑使用有效来源行；已知搜索版本过期则不传旧位置。编辑器首次打开调用共享 selectEditorLine 选择并滚动，不修改草稿或保存基准。手动行号跳转复用同一定位函数。
- 验收：原 `artifact-preview-ui.cjs` 验证来源第二行进入编辑后选中，`editor-go-to-line-ui.cjs` 回归通过；新增 `editor-source-line-ui.cjs` 覆盖匹配版本的 CRLF/中文/emoji 行、过期版本移除来源行、越界保持默认选择及保存仍禁用。生产构建通过。
- 范围：传递链接/搜索结果的来源行号，尚不传递预览中手动跳转后的行、搜索选区列或长度。没有版本信息的链接无法判断位置是否已过期。

### 按当前预览定位进入编辑（2026-09-19）

- 实现提交 43f37b1：消息预览的编辑入口读取 PreviewText 当前定位，活动查找命中优先使用起始行，否则使用已选行；校验行号范围后传给编辑器。关闭查找回到手动定位，过期来源的默认行被移除，但用户在新预览中的主动定位可用于编辑。
- 验收：`editor-source-line-ui.cjs` 扩展手动跳转、查找命中、过期来源上的新定位、关闭查找后的末尾空行，以及刷新清除旧位置。发现快速刷新相同文本时 React 可保留组件状态，修正为按刷新 revision 重建文本预览；专项测试、原 `artifact-preview-ui.cjs` 和最终构建通过。
- 范围：传递当前定位的行，尚未传递列与匹配选区长度；刷新重建也会重置预览查找和换行选项。工作区侧栏编辑仍使用搜索结果来源行。

### 搜索匹配进入编辑选区（2026-09-19）

- 实现提交 a9154a2：FileEditSession 携带可选 column/matchLength，工作区搜索及消息预览传递有效范围。活动预览查找按 CRLF 规范化后的起点和长度定位，手动跳转不携带旧匹配；无效列号或长度回退整行选择，过期来源不传范围。
- 验收：`editor-source-line-ui.cjs` 覆盖中文查找只选命中文字、emoji 的 UTF-16 列号/长度、超出行的列号/超出文件的长度回退整行、旧版本不选旧范围，原手动跳转和预览编辑回归通过，生产构建通过。本轮未新增真实工作区全文搜索到编辑的端到端测试。
- 范围：匹配长度使用 UTF-16，与 JavaScript 搜索结果一致；定位后仍按当前编辑基准版本保存。没有新增列号手工输入或对外部不可信范围进行语义校验。

### 真实工作区搜索到编辑保存验收（2026-09-19）

- 测试交付 f5e9f75：`workspace-search-edit-ui.cjs` 将浏览器桥接到真实 workspaceFile，以临时目录和实际 UTF-8 文件跑完整内容搜索、结果选择、精确编辑和保存，确认保存字节保留 CRLF。搜索后外部修改时旧选区不沿用，编辑后再次外部修改拒绝写入并保留草稿。
- 独立验收扩展同一行两个相同关键词，中间包含中文与 emoji；选择第二项并经展开文件预览进入编辑，验证 UTF-16 起点正确，仅第二处被替换，第一处及 CRLF 保留。测试通过，无需修改产品代码。
- 范围：补齐前述真实工作区搜索到编辑的端到端测试缺口，覆盖浏览器界面和原生文件实现；仍不代表 Electron IPC 全链路或真实模型调用验收。本轮仅新增测试及记录，沿用上一轮已通过的产品构建。

### 编辑器显示屏外搜索选区（2026-09-19）

- 实现提交 34d5639：共享 revealEditorSelection 依据当前字体、字间距、制表宽度测量命中前缀，将起点滚动至编辑区可见位置。来源选区定位与编辑器查找都调用该逻辑；查找不改变输入焦点，行首定位恢复水平起点。
- 验收：`editor-go-to-line-ui.cjs` 覆盖第 81 行长 Unicode/emoji/tab 文本查找、双向滚动、查找框保持焦点及重新匹配首行返回起点；原 `file-editor-ui.cjs` 回归及构建通过。独立将 `workspace-search-edit-ui.cjs` 真实文件改为超过多个屏宽的长行，确认搜索进入编辑时水平滚动且精确替换/CRLF/冲突保护不变；来源选区界面回归通过。
- 范围：适用于当前不自动换行的 textarea；特别长的匹配可能无法全段同时显示，以起点可见为目标。本轮未加入软换行编辑模式或完整文本编辑器布局引擎。

### 编辑器整词查找替换（2026-09-19）

- 实现提交 45179d8：查找替换新增整词匹配选项，边界使用 Unicode 字母、数字、组合字符和下划线，与工作区内容搜索一致；查找、替换当前后下一处定位、全部替换共用规则，切换选项重选首处。
- 验收：2 项 `editor-find.test.cjs` 覆盖文字匹配/Unicode 偏移、整词边界、组合字符、中文、字面标点；扩展编辑器界面验证 foo 不替换较长标识符、大小写切换、单次/全部替换、撤销、无匹配禁用及关闭整词后子串恢复。原编辑器与预览复制/查找回归通过，生产构建通过。
- 范围：这是文本边界规则，不是语言解析器的符号重命名；默认仍为子串匹配，选项仅在当前查找组件生命周期保留。

### 保存并继续编辑（2026-09-19）

- 新入口成功保存后保持编辑器打开，以确认返回的内容和 revision 更新基准，清除旧磁盘对照并恢复焦点。撤销/重做历史保留，相对最新保存内容计算未保存状态。原保存文件及 Ctrl/⌘+S 仍保存后关闭。
- 验证：editor-save-continue-ui.cjs 使用真实临时文件及 workspaceFile，覆盖连续 CRLF 保存、版本更新、撤销重做、焦点、外部修改拒绝覆盖；补验模拟异常响应不推进基准、等待响应时锁定输入和关闭、快捷键不重复提交。file-editor-ui.cjs、editor-disk-version-ui.cjs 及 TypeScript/Vite 构建通过。
- 范围：浏览器桥接原生文件模块，非完整 Electron IPC 验收；文件写入原有最终版本检查与重命名之间的竞争窗口仍存在。构建仍有已有的大于 500 kB 分块提示。

### 网络恢复自动重连（2026-09-19）

- 自动重试预算耗尽后，浏览器 online 事件启动新的有界连接流程。连接中、已连接和主动停止后不触发；卸载移除监听器。停止后迟到的断线通知同样不能启动重连。
- 验证：connection-recovery.test.cjs 的 6 项测试覆盖预算、重复事件、失败握手、停止和显式重启；connection-online-ui.cjs 用模拟传输在真实界面验证首次连接失败及后续断线两次恢复，重新读取会话、保留草稿且不发 turn/start；turn-queue-ui.cjs 队列回归及 TypeScript/Vite 构建通过。
- 范围：依赖系统发出 online 通知，这不保证服务本身可用；失败仍按原重试预算退出并提供手动重连。本次使用模拟桥接，未模拟操作系统网卡断连，也未增加持久事件重放。

### 历史读取期间的实时消息保护（2026-09-19）

- 会话恢复和加载完整历史分别捕获会话通知版本，避免仅检查回合状态而遗漏完整回复、工具内容通知。恢复期间收到该会话的新事件时保留已有消息；完整历史读取遇到新活动则提示重新加载。其他会话事件不干扰，之后没有竞争的读取仍正常采用服务器快照。
- 验证：thread-restore-content-race-ui.cjs 延迟模拟桥接响应，覆盖完整回复/命令完成输出、其他会话隔离、重新打开后采用快照、完整历史竞争拒绝与重试；完整历史用例在修正前失败、修正后通过。thread-restore-retry-ui.cjs、8 项 thread-events/turn-runtime 测试及构建通过。
- 范围：这是正在读取的快照保护，不是持久事件重放或历史自动合并。通知版本对已识别事件族保守递增，即使内部解析器忽略具体负载，也可能放弃该次历史快照；需要时可重新加载。运行状态仍由原回合版本检查保护。本次未验证真实服务端网络乱序。

### 会话扩展推理强度（2026-09-19）

- 会话选择器增加 none、minimal、xhigh、max、ultra、persistent；共享选项定义用于 UI、全局状态解码和会话恢复。none 显式发送，模型默认仍省略 effort 并采用默认协作配置。窄窗口选项换行。
- 依据：官方配置文档 https://developers.openai.com/codex/config-reference/ 列出 minimal/low/medium/high/xhigh；本仓库 codex-upstream/codex-rs/protocol/src/openai_models.rs 的 ReasoningEffort 还定义 none/max/ultra/persistent。已知协议值不等于每个模型都支持，界面保留相应说明；未添加上游 Custom(String) 任意值输入。
- 验证：reasoning-effort.test.cjs 和 thread-resume.test.cjs 共 5 项通过；reasoning-effort-ui.cjs 验证恢复、隔离、刷新、xhigh/none 的 turn/start 与协作参数、新增选项、Home/End 和 390px 布局；thread-model-ui.cjs 默认值和排队发送回归通过；构建通过。使用模拟桥接，未验证具体模型的实际推理执行。
- 后续：定时任务强度已在下一增量对齐；服务端模型能力动态筛选尚未贯通。

### 定时任务扩展推理强度（2026-09-19）

- 定时任务选择、保存校验、任务/运行快照解析、详情和历史配置展示补齐 none/minimal/xhigh/max/ultra/persistent。默认仍用缺省值，none 保持显式字符串。任务编辑不会改写已发生运行的强度快照。
- 验证：24 项 scheduler/repository 测试覆盖全部已知值运行传递、重启恢复、改回默认保留旧快照及非法值拒绝；scheduled-ui.cjs 在构建产物上通过真实 scheduler 桥接验证 xhigh 保存/运行历史/重启和响应式界面。修正测试中旧版手动折叠侧栏步骤，等待实际自动折叠完成。
- FELIX_TEST_EFFORT=xhigh 的 task-runner.test.cjs 共 11 项通过，包括真实本地 Codex 进程、适配器、本地模拟模型端点和 shell 工具执行；认证及无密钥本地两条路径均确认 reasoning_effort=xhigh 到达端点，并验证之后默认会话不继承该显式值。没有调用付费模型，不能据此证明所有模型支持每种强度。
- 构建通过，仍有已有的大分块提示。后续保留模型能力动态筛选工作。

### 模型显式推理强度声明（2026-09-19）

- 模型列表读取可选 Provider 扩展 supported_reasoning_efforts（字符串或上游 ModelPreset 的 effort 对象数组），作为能力声明传至会话选择器。有效已知值声明过滤选项，空数组仅允许选择模型默认；缺失、未知值、重复模型/冲突声明不推断支持范围。ID-only 和手动模型保持原选项。
- 已选但不在声明中的强度保留显示并提示重新选择，不静默降低配置。刷新或渠道变化清除旧声明，沿用请求代际保护。此阶段限制选择器候选，不新增发送拦截，定时任务编辑器在后续增量接入声明筛选。
- 验证：16 项模型列表/能力解析测试；model-effort-capabilities-ui.cjs 覆盖受限列表、空声明、不支持旧值、刷新回未知能力；原 reasoning-effort-ui.cjs 与 model-catalog-race-ui.cjs 通过，构建通过。验收用混入数字/对象 ID 的测试复现并修正错误；ID 计数改为先校验再处理。
- 该字段为可选能力扩展，不声称标准 OpenAI-compatible /models 或当前所有渠道会提供它；没有声明就没有模型能力确认。当前通过模拟数据验证，没有请求真实渠道确认字段覆盖率。

### 定时任务模型能力筛选（2026-09-19）

- 任务编辑器使用模型目录中的显式强度声明过滤选项。不支持的已有值仍显示并标记，保存前必须选择支持值或模型默认；按钮和表单提交路径都验证。切换模型不静默清空原值。未声明能力时仍显示已知协议值。
- scheduled-effort-capabilities-ui.cjs 使用生产构建和真实 TaskScheduler，验证已有 xhigh 不受声明支持时保留原任务、表单直接提交拒绝保存、选择 high、切换到仅默认模型后要求明确修正、保存和重新打开。补验刷新目录期间禁用保存，成功响应不带能力声明时清除旧限制并可保存 xhigh。
- 完整 scheduled-ui.cjs 回归及构建通过。专项测试中原生 select 的 option 只需等待附加到 DOM，然后使用 selectOption 选择；不依赖下拉项展开时的可见性。验收无需产品修正。
- 能力声明仅是编辑时的目录快照；已保存任务运行时仍由模型端执行并反馈错误。本增量不增加运行前网络查询，也不宣称未提供声明的渠道已确认支持。

### 会话发送前检查已声明的推理强度（2026-09-19）

- 当前目录明确不支持所选强度时，阻止新回合和新增排队消息，输入区显示原因并保留草稿。直接发送函数也检查，Enter 不绕过；改成支持值/模型默认后可继续。运行中追加指令不携带新强度，因此保持可用。
- effort-send-guard-ui.cjs 覆盖按钮/键盘不发送、草稿保留、支持值发送、切换模型后阻止新增排队但可 steer、改默认成功入队；turn-queue-ui.cjs 原队列回归及构建通过。模拟桥接验证请求，不是实际模型执行验证。
- 验收将提示移至工具栏上方，390px 输入区和发送按钮几何验证通过。整页检查另发现未加载定时任务样式时标题栏按钮溢出，尚未解决，不能据此宣称整页窄窗口验收通过。
- 既有队列保留入队时的配置快照，本次不重新校验跨会话/渠道的已排队条目；未声明能力时仍由模型端反馈支持情况。

### 窄窗口标题栏与紧凑应用菜单（2026-09-19）

- 修正上轮发现的首次聊天标题栏溢出。760px 以下将菜单收拢为“菜单”入口，分组名前缀保留操作归属，沿用禁用状态与键盘导航；弹出层限制高度、支持滚动，窗口尺寸变化关闭菜单。窄屏尺寸规则随 AppMenus 常驻加载，移除 scheduled.css 的全局隐藏规则和页面特定标题栏尺寸补丁。
- compact-titlebar-ui.cjs 验证首次加载 390px 整页无横向溢出、三个窗口按钮在视口内、紧凑菜单导航/焦点/新会话草稿保留/设置往返；补验打开定时任务页再回聊天保持布局、390×450 菜单末项滚入可见区，以及放宽窗口后恢复分组菜单。
- app-menus-ui.cjs 改为明确验证宽屏菜单，默认连接当前 5318 服务；effort-send-guard-ui.cjs 恢复整页窄窗口断言并通过，scheduled-ui.cjs 生产构建回归通过，构建通过。上轮标题栏缺口在此修正。
- 验证为浏览器布局和动作回调；未在本轮单独运行原生窗口最小化/最大化/关闭操作。

### 编辑暂停排队消息的执行配置（2026-09-19）

- 队列编辑器增加模型和推理强度选择，沿用当前会话渠道的模型目录和显式能力声明。修改配置时必须等待目录完成，并选择可用模型及支持的强度；原配置不变时仍可离线编辑正文。仅更新该排队项快照，保存后保持暂停，不修改会话默认配置。
- queue-configuration-ui.cjs 验证取消不改原值、模型切换后的强度校验、保存和继续队列时 turn/start 使用新配置，以及会话默认隔离。补验 localStorage 配额失败保留编辑、目录刷新中锁定配置提交、目录读取失败保留配置只改正文后正常排队发送。queue-editor-lifecycle-ui.cjs 和原 turn-queue-ui.cjs 回归、构建通过。
- 验证使用浏览器模拟 app-server 桥接并检查发送请求，不声称新模型真实执行成功。编辑只提供模型与强度，本次不更改排队项所属渠道、工作目录或规划模式；服务端仍确认运行时模型支持。

### 排队消息独立执行模式（2026-09-19）

- 暂停消息编辑器增加先规划/直接执行，保存到该消息的 planningMode 快照。队列行显示模型、推理强度及模式，旧记录没有模式时显示直接执行。模式修改不依赖模型目录，也不改当前会话默认配置。
- queue-configuration-ui.cjs 验证取消不保存、成功后保持暂停、最终 turn/start 的 collaborationMode.mode=plan、保存配额失败保留编辑且磁盘仍为 default、目录离线下改回 default 再改 plan、列表配置展示及会话默认隔离。
- queue-editor-lifecycle-ui.cjs、turn-queue-ui.cjs、5 项 turn-queue 单元测试和构建通过。浏览器通过模拟桥接验证请求参数，本次未实际运行模型规划回合。

### 移除排队消息技能与插件（2026-09-19）

- 暂停队列编辑器显示已选技能/插件并可逐项移除，技能按路径、插件按 ID 区分，保存到该消息的独立快照；取消保留原列表。队列行新增插件展示，空消息检查使用编辑后的技能数量。
- queue-references-ui.cjs 验证取消恢复原列表、仅剩技能时仍可保存、移除最后技能且无正文/附件时禁止保存、保存后 turn/start 只含保留 skill/mention。补验本机存储失败保留编辑状态且磁盘原列表不变，重试成功。
- queue-configuration-ui.cjs、queue-editor-lifecycle-ui.cjs、turn-queue-ui.cjs 回归及构建通过；测试检查模拟桥接的请求负载，未运行实际技能/插件。当前入口支持移除既有引用，添加新引用仍从消息输入区选择后入队。

### 队列编辑未保存关闭保护（2026-09-19）

- 对照打开时的正文、模型、强度、模式、附件、技能和插件快照检测修改。主动取消或 Escape 时，未保存修改需明确选择继续编辑/放弃；改回原值不再提示，保存成功直接关闭，失败保留编辑状态。提示初始焦点放在继续编辑，退出提示回正文。
- queue-unsaved-ui.cjs 验证未修改/恢复原值直接关闭、正文与执行配置保护、明确放弃、成功保存与失败后继续编辑。验收焦点测试修正前失败、修正后通过。配置/引用测试更新为明确放弃；生命周期、原队列回归和构建通过。
- 队列作用域变化、项被删除或进入发送状态仍由父级正常卸载编辑器。本次不提供跨窗口或应用退出时的未保存草稿持久化。

### 队列快照恢复校验（2026-09-19）

- restoreQueue 现在校验 planningMode（default/plan）、插件 ID/名称、技能名称/路径，并继续校验核心消息、附件、工作目录和唯一 ID。旧记录缺失 planningMode 自动归一为 default；未知或损坏字段整队列拒绝，原始 localStorage 保留并显示恢复失败。
- turn-queue.test.cjs 新增模式/引用保留及坏值测试；queue-storage-ui.cjs 验证 unknown planningMode 的原始数据不被覆盖，原有读写失败、重试和未确认发送保护回归通过。构建通过。
- 该校验只保护本地快照完整性，不重新确认服务端 threadId、模型或强度当前是否可用；继续队列时仍由发送/服务端确认。

### 会话导出运行配置摘要（2026-09-19）

- Markdown 导出在消息前写入非敏感配置摘要：模型、Provider、推理强度、执行模式、工作目录、请求权限、实际沙箱和审批策略。值中的换行会清理，未设置字段省略；不导出 API key/token 等密钥。
- conversation-export.test.cjs 验证摘要字段和敏感字段排除；conversation-export-ui.cjs 通过服务端完整分页、工具/未知记录、历史错误、取消读取、保存取消/失败和本机会话导出回归，并检查配置摘要出现在最终内容。构建通过。
- 恢复会话返回的新配置会成为导出快照；模拟恢复必须提供同等配置才能验证实际界面。导出仍只嵌入本地附件路径，不复制附件文件。

- 事件流重连增量去重：`item/agentMessage/delta` 没有稳定协议序号，因此客户端不按文本猜测重复；当服务端或传输层提供 `eventId`/`deltaId` 时，按 agent message 回复项记录最近 256 个已应用身份，重连重放只应用一次。不同回复项互相隔离，`item/completed` 仍覆盖增量并阻止迟到事件。未携带身份的旧协议保持原有追加语义。

### 事件流重连增量去重验收修正（2026-09-19）

- 验收发现恢复路径会丢失已应用的 `eventId`/`deltaId`。修正 `restoreMessages`：仅当回复项和回合身份兼容时恢复经过校验的最近 256 个身份，跨回合不继承，避免恢复后重放重复追加。
- 12 项 assistant/thread/recovery 测试及 TypeScript/Vite 构建回归通过。

### 原始推理文本增量（2026-09-19）

- 已交付：接入上游 `item/reasoning/textDelta`，按 `contentIndex` 校验并保留稀疏内容片段，与摘要片段一起显示在推理卡片；坏索引、坏文本、跨回合和完成后的迟到事件不会污染结果。未知推理条目继续使用原始记录兼容路径。
- 验证：18 项 tool-activity/thread-events 测试通过，覆盖乱序索引、重复/终态保护、坏输入和事件入口；生产 TypeScript/Vite 构建通过。

### MCP 工具进度（2026-09-19）

- 已交付：接入上游 `item/mcpToolCall/progress`，校验 thread/turn/item 入口后将进度消息保留在 MCP 调用记录中，最多保留最近 100 条并在调用详情展示。即使进度先于 `item/started` 到达也会创建记录；完成、跨回合或坏消息不会追加。
- 验收修正：初版先到进度事件因局部条目引用未初始化而失败，已改为共享条目引用。22 项 invocation/tool/thread 测试及生产构建通过。

### 终端交互事件（2026-09-19）

- 已交付：接入上游 `item/commandExecution/terminalInteraction`，记录并展示每个命令最近 100 次服务端 stdin。事件必须包含有效 processId，且与命令条目已有进程身份一致；先到事件可创建记录，完成后、跨回合、跨进程和坏输入全部拒绝。
- 验证：23 项 tool/invocation/thread 测试通过，包含进程身份隔离；生产 TypeScript/Vite 构建通过。

### 计划文本增量（2026-09-19）

- 已交付：接入上游实验性 `item/plan/delta`，按 thread/turn/item 身份累积临时计划文本，在计划面板实时显示；新回合清理旧草稿，条目切换、跨回合、坏身份被隔离，正式计划条目完成后覆盖并清除临时文本。
- 验证：16 项 planning/thread-events/turn-runtime 测试通过，覆盖空文本、重复片段、条目切换、完成覆盖和迟到事件；生产 TypeScript/Vite 构建通过。
- 该协议在上游注明仍可能变化，Felix 不假设增量文本一定等于最终计划正文，最终正文始终以完成事件为准。

### 回合统一差异（2026-09-19）

- 已交付：接入上游 `turn/diff/updated`，按会话/回合保存最新聚合 diff，在聊天计划区显示可折叠、可复制的统一差异；新回合清理旧差异，坏身份、跨回合和已结束回合事件不会覆盖当前结果。多行 diff 内容保持原样，限制单次快照 2 MiB。
- 验证：13 项 planning/thread-events/turn-runtime 测试通过，覆盖重复更新、合法多行 diff、坏身份、迟到事件和新回合清理；生产 TypeScript/Vite 构建通过。

### 会话状态变更通知（2026-09-19）

- 已交付：接入上游 `thread/status/changed`。`active` 无 flags 映射 running，包含 waitingOnApproval 或 waitingOnUserInput 映射 needs_input，idle 保持 idle，systemError 映射 failed，notLoaded 映射 idle；更新仅作用于对应远端会话。
- 验证：9 项 thread-status/thread-events 测试通过，覆盖多种等待 flags、终态、坏状态和多会话事件隔离；生产 TypeScript/Vite 构建通过。未知状态或非法 flags 不覆盖已有状态。

### 自动审批审查事件（2026-09-19）

- 已交付：接入 `item/autoApprovalReview/started` 与 `item/autoApprovalReview/completed`，将 reviewId、目标条目、review（状态/风险/授权/理由）、decisionSource 与 action 保留为执行记录并提供原始 JSON 查看。开始/完成严格校验 thread/turn/review 身份，完成后不允许重新打开；坏载荷和跨回合事件不写入。
- 验证：8 项 thread-events 测试覆盖开始/完成、重复完成、跨回合和坏身份；TypeScript/Vite 生产构建通过。该上游协议标记为 unstable，Felix 保留未知 action 字段以兼容变化。

### 远端会话名称通知（2026-09-19）

- 已交付：接入 `thread/name/updated`，校验 threadId 和可选非空单行名称；远端名称只更新自动标题，会话手动重命名优先，空名称/坏载荷/未知会话不会覆盖本地标题。侧栏、当前会话和导出读取同一标题字段。
- 验证：thread-name/status 3 项解析测试通过，生产 TypeScript/Vite 构建通过；名称字段中的换行和控制字符被拒绝。

### 会话目标实时同步（2026-09-19）

- 已交付：接入 `thread/goal/updated` 与 `thread/goal/cleared`，校验目标 threadId、objective、状态（active/paused/blocked/usageLimited/budgetLimited/complete）、token budget、tokens used 和 time used；聊天计划区新增可展开目标面板。清除只影响对应会话，坏目标和未知会话不写入。
- 验证：4 项 thread-goal/name/status 测试通过，覆盖目标身份、非法状态、预算/用量边界和多字段解析；生产 TypeScript/Vite 构建通过。

### 模型升级与退役提示（2026-09-19）

- 已交付：模型目录展示 `upgradeInfo` 推荐替代模型、升级文案、可折叠 Markdown 迁移说明、模型网页及已知 UTC 退役时间；兼容旧版 `upgrade` 和可选空字段。不会自动切换会话模型。
- 验证：目录解析及真实 app-server 分页读取共 4 项测试通过；模拟 RPC 的 Edge 交互验收覆盖新旧字段、Unix 秒时间、Markdown 原始 HTML 不执行、链接打开及不支持协议过滤；目录过滤/断线生命周期回归通过；生产构建通过（现有大分块警告仍在）。真实服务测试验证协议兼容性，升级展示由固定测试数据验证。

### 保存命令与网络审批规则（2026-09-19）

- 已交付：命令审批支持上游结构化 `acceptWithExecpolicyAmendment` 与 `applyNetworkPolicyAmendment`，显示命令前缀或主机和 allow/deny 范围，用户点击后按协议发送规则。显式 availableDecisions 决定可选范围；缺省时兼容 proposed 规则。坏选项被过滤，提交层复核范围，规则决定不能用于其他请求。
- 验证：6 项规则/提交生命周期测试、模拟 RPC 的 Edge 规则审批交互、390px 对话框布局、原有键盘焦点/失败重试/额外权限拒绝回归及生产构建通过。字段与上游生成的 TypeScript 协议核对；尚未验证真实服务写入规则后的跨进程生效。

- 提交后验收：多请求审批排队、重复提交、迟到错误隔离通过。文件差异验收修正旧夹具：先建立正确回合条目，再注入跨回合事件验证隔离；空差异使用协议要求的空字符串，并支持多通知订阅。差异更新、HTML 字面显示、键盘焦点循环与拒绝载荷回归通过；未改动已有工具事件校验。

### 命令规则跨进程验收（2026-09-19）

- 真实项目 app-server、隔离 CODEX_HOME 与本地模型夹具：首次运行打印命令触发审批，经 Felix 的选项解析和响应提交保存规则，命令退出码 0 且输出正确；确认 rules/default.rules 写入 allow 规则。
- 重启 app-server 并创建新会话，相同命令成功执行且没有审批；第三次启动执行不同命令仍触发审批，选择服务端提供的 cancel 后命令为 declined、回合 interrupted，没有执行输出。测试不访问真实模型服务，不修改用户配置。
- 验收发现该 untrusted 场景只提供 cancel 而非 decline；提交校验成功拒绝未提供选项，测试按真实选项修正后通过。网络规则的真实持久化尚未由本项验证。

### 额外权限授权范围（2026-09-19）

- 已交付：额外权限审批提供本轮允许、本会话允许和拒绝；展示后续回合可复用的会话授权范围，响应分别提交 scope=turn/session。仅复制请求中的 network/fileSystem，省略顶层 null 权限，拒绝始终提交空权限，非法审批选项不发送。
- 验证：权限与审批响应 8 项单元测试、模拟 RPC 的 Edge 本轮/本会话/拒绝载荷和既有失败重试/焦点回归通过，生产构建通过（现有大分块警告）。尚未验证真实服务跨回合复用 session 授权。

### 额外权限真实生命周期验收（2026-09-19）

- 真实 app-server 开启 request_permissions 工具，使用隔离 CODEX_HOME/工作区与本地模型夹具，由 Felix 响应层提交授权。两项测试通过：turn 授权在下一回合失效，文件写入再次请求审批且拒绝后无文件；session 授权在下一回合免重复审批并实际写入正确文件。
- session 授权后创建另一个会话，新会话写入同一目录仍触发审批，拒绝后未写入，证明此测试场景下权限不会跨会话泄漏。本项覆盖目录写入；未据此声称网络权限或所有沙箱平台已验收。

### 按类别批准额外权限（2026-09-19）

- 已交付：额外权限审批可分别勾选网络和文件系统权限，展示各类原始范围；只提交勾选类别，支持本轮/本会话范围，全不选则提交空权限。提交期间锁定选择；重试保留勾选，新请求重置。提交层只接受两个布尔选择，权限内容仍取自原始请求。
- 验证：7 项权限/响应单元测试、模拟 RPC 的 Edge 部分批准/空批准/失败重试/新请求重置/焦点循环验收通过；3 项真实 app-server 目录授权生命周期、会话隔离、命令规则重启回归通过；生产构建通过。当前选择粒度为网络/文件系统类别，文件系统内单独路径选择仍未提供。

### 文件权限逐路径批准（2026-09-19）

- 已交付：文件系统权限列出读取、写入、路径/通配符/特殊路径条目，可取消单项授权；deny 限制固定保留。按上游转换逻辑优先读取 entries，兼容旧 read/write；过滤后只发 entries，避免旧字段重新扩大授权。说明重叠规则和既有权限仍可能覆盖取消的路径。
- 验证：8 项权限/响应单元测试、Edge 逐项选择与 deny 锁定/载荷验收、生产构建通过。两项真实 app-server 测试请求两个目录但只批准一个：选中目录跨回合可写，未选目录仍审批且拒绝后不落盘；同时验证 turn 失效和 session 跨会话隔离。通配符/特殊路径显示及保留协议形状，不据此宣称所有平台文件沙箱规则已验证。

### 审批结果记录（2026-09-19）

- 已交付：额外权限记录实际授予范围（本轮/本会话）、网络状态和读/写/禁止条目数，应用类别及路径筛选后再统计。命令与网络规则只记录固定决定标签，不再序列化完整规则参数。回答成功才记账，失败重试不会产生重复成功记录；摘要在发送前固定。
- 验证：6 项摘要/权限单元测试、Edge 实际审批持久化记录与重试计数断言通过，生产构建通过。新增记录不含路径、命令参数、主机或答案；未迁移清理旧版本已有审计详情，且本机最多 200 条记录并非完整服务端审计。

### 审批长内容与窄窗口验收（2026-09-19）

- Edge 模拟 RPC 验收通过：390px 长目录路径不横向溢出且能取消单项，特殊路径与 globScanMaxDepth 在过滤后保持；320×480 窗口中 1800 字符命令参数及规则仍可完整滚动查看并提交原始载荷。
- 45 条文件权限在限高对话框中可滚动，键盘 Space 取消末项、Tab 从最后审批按钮回到首个可用复选框；本会话提交仅包含其余 44 项。已有多行文件差异显示、焦点和拒绝回归通过。本轮未发现需修改的产品问题，新增可复现验收脚本；未据此宣称整页所有窄屏场景已覆盖。

### 审批动作和环境上下文（2026-09-19）

- 已交付：识别 commandExecution 审批 kind=writeStdin，以“确认发送终端输入”展示；命令和额外权限显示服务端 environmentId，缺失时明确未提供。折叠来源包含会话、回合、条目及独立审批回调标识；标准终端输入决定记录为终端输入审批。
- 验证：Edge 模拟 RPC 验证终端输入标题、远端环境、来源展开与原请求 ID 响应；旧版缺省 kind/环境兼容通过。审批重试/焦点、文件差异、长列表窄窗口回归及生产构建通过；新增折叠区已纳入键盘循环。尚未用真实终端触发 writeStdin 审批。

### 自动重试原因（2026-09-19）

- 已交付：willRetry 错误提示保留服务端原因，统一空白/控制字符并限长 500 字符；仅作为当前运行状态显示，不写入失败消息。恢复输出或回合结束后清除，旧回合错误不覆盖当前状态。
- 验收修正：恢复到无消息的运行中会话时，原活动区因消息为空被隐藏；现在有活动状态即显示。12 项线程事件测试、Edge 模拟 RPC 空会话/HTML 字面显示/迟到错误/恢复与结束清理验收及生产构建通过。

### 配置诊断与弃用通知（2026-09-19）

- 已交付：接入 configWarning 和 deprecationNotice，显示摘要、迁移/错误详情、可选配置文件与有效的一基行列位置，加入现有逐条关闭的服务警告队列。多行文本保留换行，长内容限高可滚动、长路径可换行。
- 验证：通知解析测试覆盖缺省详情、非法载荷与坏位置；Edge 模拟 RPC 验证配置/弃用提示顺序关闭、HTML 字面显示及原有全局/后台会话警告回归；生产构建通过。本项不是配置变更自动刷新，尚未测试真实服务器触发配置诊断。

### 配置警告真实服务验收（2026-09-19）

- 使用项目 app-server 和隔离 CODEX_HOME，在初始化后写入不完整 prefix_rule 并创建会话；真实 configWarning 被 Felix 解析，包含 broken.rules 文件、Parse error 详情和一基位置 1:13，测试通过。
- 将隔离规则修复为合法规则后，新会话及模型读取成功且未收到新增警告。该断言只证明此流程可继续，不用于证明所有规则执行效果或完整配置热重载。弃用通知仍仅由协议解析/模拟 RPC 验收覆盖。

### MCP 启动状态通知（2026-09-19）

- 已交付：MCP 管理页监听 mcpServer/startupStatus/updated，按当前 threadId 精确隔离，显示每个服务最新启动中/就绪/失败/取消通知、错误原因及重新认证提示；ready 时重新读取工具目录。断线和切换会话清空通知，忽略断线事件。
- 验证：通知解析测试覆盖作用域、非法状态与错误字段；Edge 模拟 RPC 覆盖跨会话隔离、失败转就绪、HTML 字面显示与自动刷新，既有分页/OAuth/重载/资源读取及草稿发送回归通过；生产构建通过。通知仅在 MCP 管理页打开期间收集，列表快照仍由状态读取提供；真实服务通知触发待验收。

### MCP 启动通知真实服务验收（2026-09-19）

- 真实 app-server 配合隔离 CODEX_HOME：配置启动后立即退出的 MCP 子进程，创建会话后捕获 starting/failed 通知，Felix 正确解析服务名、错误原因和会话作用域，其他会话拒收。
- 配置改为本地 stdio MCP 夹具并 reload，创建新会话收到 ready，状态目录显示 connected 且包含 echo 工具。测试通过且不调用模型。本项验证修复后新会话的启动恢复，不宣称现有运行会话自动替换 MCP 实例或 OAuth 重新认证已真实验收。

### MCP 登录与后台刷新隔离（2026-09-19）

- 验收修正：列表刷新和 OAuth 操作原来共用版本号，启动 ready 通知触发刷新可能丢弃有效登录链接。现分离列表读取与连接/会话操作生命周期，并记录每个服务登录完成次数，完成通知先到时忽略迟到链接及错误。断线/切换清理操作锁，旧操作结束不会解锁新操作；登录完成载荷增加字段校验。
- Edge 模拟 RPC 延迟登录期间注入其他服务 ready，链接正常返回；登录成功通知先于旧失败响应时不显示旧错误。分页/重载/资源/草稿发送回归与生产构建通过。

### MCP 工具参数检查（2026-09-19）

- 已交付：MCP 工具目录可展开服务端提供的输入参数和输出结构 JSON Schema，支持复制完整 JSON；保持原始必填项、嵌套属性和描述，缺省 Schema 不显示空入口，非法非对象 Schema 拒绝作为目录数据。
- 验证：真实 app-server 与本地 stdio MCP 的目录、分页、工具调用、资源和重载测试通过，目录已通过 Felix 解析器且保留 inputSchema.required。Edge 模拟 RPC 验证输入/输出展开、复制 JSON 精确内容、HTML 不执行，以及登录/资源/草稿回归；生产构建通过。

### MCP 服务与工具搜索（2026-09-19）

- 已交付：管理页按服务名、工具名和工具描述即时筛选，忽略大小写和首尾空格；服务名匹配显示该服务所有工具，否则仅显示匹配工具。搜索时展开目录，保留 Schema 查看/复制；支持无结果提示与清空搜索。
- Edge 模拟 RPC 搜索名称/描述、空结果、清空及现有 Schema/OAuth/资源/草稿回归通过，生产构建通过。搜索范围是当前已加载的工具目录，不含资源正文或 Schema 属性。

### MCP 工具行为声明（2026-09-19）

- 已交付：工具目录展示 MCP annotations 中明确提供的只读、破坏性、幂等性和外部系统访问布尔声明，标为服务端声明而非权限限制。缺省、未知和错误类型不生成推断标签，保持现有审批策略。
- 声明解析测试、真实 app-server/stdin MCP annotations 透传与调用回归、Edge 展示及完整 MCP 页交互回归通过；生产构建通过。声明仅反映服务端元数据，不证明工具实际行为。

### 从 MCP 工具目录准备任务（2026-09-19）

- 已交付：工具提供“使用…加入草稿”，追加服务身份、原始工具名（缺省时用目录键）、输入 Schema 和待填写任务提示，返回聊天。已有草稿保留，用户补充并发送后才启动回合；此操作不直接执行工具。
- Edge 模拟 RPC 验证草稿合并、Schema 保留、刷新持久化、无自动调用及明确发送后的 turn/start 精确输入；真实 MCP 目录/调用/资源回归与生产构建通过。发送的是模型任务请求，最终是否调用工具仍取决于会话工具可用性和模型执行。

### MCP 目录分页完整性（2026-09-19）

- 验收修正：整次目录读取检查跨页服务重名，并限制最多 100 页，避免不断变化的游标导致无限加载。失败保留前次完整目录，显示原因并可重试；不展示此次读取的部分结果。
- Edge 模拟 RPC 覆盖跨页重名、100 页边界请求计数、旧目录保留和恢复刷新，现有 MCP 登录/资源/草稿回归及生产构建通过。上限对应当前每页请求 100 条，超过上限的合法超大目录也会明确报错。

### MCP 资源响应校验（2026-09-19）

- 验收修正：资源读取在进入渲染状态前校验 contents 数组、条目 URI、文本/二进制字段及 MIME 类型，异常响应显示错误并支持重试，不生成可加入草稿的坏内容；保留返回 URI、空文本和空目录。
- 两项解析测试、Edge 注入 null 资源后恢复重试与现有 MCP 交互回归通过；真实 app-server 全局和会话资源响应均经过 Felix 新解析器且内容一致；生产构建通过。二进制解码仍由媒体预览层负责。

### MCP 二进制资源下载（2026-09-19）

- 已交付：blob 资源提供下载入口，以返回 URI 的末段生成文件名并清理路径分隔符及保留名；下载使用 application/octet-stream，图片/音频继续预览，其他类型保留结构化内容而不冒充图片。Base64 无效时显示错误。
- 下载参数测试覆盖二进制、空内容、非法编码与文件名；Edge 模拟 RPC 实际下载文件并逐字节比对通过，生产构建通过。桌面 Electron 原生下载对话框尚未在本项重验。

### MCP 原生下载验收与提示条修正（2026-09-19）

- 使用复制的生产 Electron 应用、file URL 和隔离数据目录，以模拟 MCP IPC 响应驱动真实资源页面；原生 will-download 保存成功，建议文件名 bytes.bin 与保存的原始字节一致，页面无跳转、无新增窗口。测试自动指定隔离保存路径，不覆盖用户文件。
- 验收发现缺少渠道密钥的纯提示条会拦截下层 MCP 管理按钮点击；为无交互提示条设置 pointer-events:none 后完整桌面流程通过，生产构建通过。本项未连接真实 MCP 服务器，未人工操作系统保存对话框。

### MCP 资源读取取消等待（2026-09-19）

- 已交付：资源读取中提供“取消等待读取”，立即恢复目录和自定义 URI 的读取入口，并说明服务端请求可能仍在进行；取消使旧请求失效，后续读取清除取消提示。
- Edge 模拟 RPC 验证取消后继续读取、旧成功/失败响应在新请求等待期间不覆盖内容或解除加载状态，以及新请求完成后旧结果仍被忽略；现有 MCP 登录/目录/资源/草稿发送回归和生产构建通过（保留既有大包体提示）。本项取消的是界面等待，不发送服务端 RPC 取消指令。

### MCP 资源模板参数与读取（2026-09-19）

- 已交付：资源模板可展开填写文本参数，实时预览 URI，明确点击后进入现有资源读取/取消等待/下载/加入草稿流程。采用 url-template 的 RFC 6570 展开器，支持保留字符、路径、查询、片段和标量前缀；空字段按未提供处理，表单暂不提供数组/对象参数编辑。
- 模板语法在展开前校验，非法模板提示使用手动 URI；参数名去重并隔离对象原型属性。单测覆盖编码、各运算符、前缀、坏模板和原型名；Edge 验证编辑无请求、预览与请求 URI 一致；真实 app-server + 本地 stdio MCP 验证目录模板生成的含中文/斜杠 URI 成功读取。MCP 页面回归和生产构建通过，保留既有大包体提示。

- 提交后补充 Edge 边界验收：查询参数中的 &/= 正确编码且空页码省略；非法模板没有读取入口、不阻断手动 URI 或其他模板；等待期间参数和模板读取按钮禁用，取消后恢复且参数保持。完整 MCP 页面回归通过，本轮无需产品修正。

### MCP 模板数组与对象参数（2026-09-19）

- 已交付：每个模板参数可选择文本、JSON 字符串数组或 JSON 字符串对象，按 RFC 6570 的普通/展开运算符生成路径或查询。空字段省略，空集合正常展开；类型切换保留编辑内容。
- 无效 JSON、非字符串成员、嵌套值及复合参数使用前缀长度时显示错误，保留表单供修正，移除旧 URI 预览并禁止提交。单测覆盖集合编码和非法输入；Edge 验证中文/斜杠数组、查询对象、坏值阻止 Enter 提交与修复读取；真实 app-server + stdio MCP 确认复合 URI 完整透传。完整 MCP 页面回归及生产构建通过。

- 提交后 Edge 验收补充：嵌套对象被拒绝后可原地恢复；空数组和空对象省略路径/查询并可正常读取；文本与数组类型往返保留原输入且预览按当前类型更新。完整 MCP 回归通过，无额外产品修正。

### MCP 资源与模板搜索（2026-09-19）

- 已交付：每个服务资源目录可按名称、标题、描述或 URI 筛选资源和模板，忽略大小写/首尾空格，显示匹配数量、空结果和清空入口；无结果仍可手动读取 URI。筛选保留模板参数和已读取内容，不额外请求服务端。
- Edge 完整流程覆盖描述、名称、URI、空结果与恢复，以及参数/结果保留；验收发现并修正清空搜索意外折叠模板目录的问题。完整 MCP 回归和生产构建通过（保留既有大包体提示）。搜索范围仅为该服务已加载目录，不搜索资源正文。

- 提交后补充 Edge 延迟响应验收：读取中筛选无结果不取消请求，响应仍正常显示并可加入草稿；清空恢复参数内容和类型。目录手动折叠后输入搜索可重新展开，清空保持可继续操作。完整 MCP 页面回归通过，无额外产品修正。

### 任务编辑草稿存储故障恢复（2026-09-19）

- 验收修正：任务草稿存储已有失败状态但页面未展示写入失败；读取失败入口位于原生编辑模态背景中不可操作。现在编辑器内显示读取/保存失败及重试，关闭编辑器后页面仍提供失败恢复入口。
- Edge 注入草稿写入异常：错误在弹窗内可见，持续失败可重试，恢复后保存最新内容并跨刷新恢复，不调用任务保存接口。注入损坏草稿后，编辑期间重试不会覆盖坏原文，修复后合并保留当前编辑。既有任务关闭/放弃/保存回归及生产构建通过；本轮为浏览器存储故障验收，未模拟原生磁盘故障。

### 未完成任务草稿恢复（2026-09-19）

- 验收修正：间隔编辑为 0/小数/超范围值、一次性时间清空后，原草稿校验错误地当成损坏数据拒绝恢复。现在草稿接受类型正确的未完成值，由任务提交继续执行范围/必填校验；无效日期转为空输入，避免生成 NaN 日期字符串。补齐工作目录、执行时限和推理强度字段类型校验。
- 三项单测通过；Edge 验证空时间与清空间隔跨刷新恢复、修复期间编辑保留，未完成安排点击保存不会调用任务接口。草稿存储失败恢复、关闭/放弃/正常保存回归和生产构建通过。

### 恢复草稿的放弃与授权保护（2026-09-19）

- 验收修正：恢复草稿原先初始化为未编辑，Escape/取消会直接清除未保存内容。现在明确标识恢复来源，关闭前提示放弃确认，继续编辑保留内容，明确放弃才清理持久化草稿。
- 恢复的已有任务草稿不再仅凭任务 ID 自动勾选无人值守写入确认，避免草稿中的新目录继承未核对的确认。Edge 验证恢复后 Escape/继续编辑/明确放弃与刷新不再恢复；已有任务写入草稿未确认不请求，勾选后准确保存目录。草稿故障恢复、普通新建关闭/保存回归及生产构建通过。

### 任务草稿原生存储接入与重启验收（2026-09-19）

- 真实 Electron 验收发现任务草稿键未列入 renderer-storage 允许列表，浏览器模式可恢复但原生写入失败。补齐原生键及对象记录校验，复用旧数据迁移、原子写入、备份恢复与退出 flush；领域字段仍由渲染层草稿校验器检查。
- 原生存储 10 项测试通过，新增任务草稿迁移、未完成值、flush、重启、拒绝异常结构及清理验证。复制生产 Electron 应用并使用隔离 FELIX_DATA_DIR、不替换 IPC：连续四次启动验证草稿正文/空时间恢复、继续编辑后再次恢复、Escape 放弃保护和明确放弃后不再恢复，调度器始终无任务且无页面异常。没有模拟原生磁盘故障或强制断电。

### 恢复草稿正式保存与退出时序（2026-09-19）

- 提交后原生验收发现最后一次通知复选框修改后立即退出，React 被动 effect 尚未向原生存储提交最新值，重启恢复旧选项。任务编辑同步草稿、共用草稿写入改在 layout effect 提交，写盘仍由原生异步队列负责，退出 flush 可接收最新值。
- 复制生产 Electron、真实 IPC/原生存储/调度器、隔离数据目录：恢复草稿后明确保存生成唯一任务，通知关闭和未来运行时间准确保留，重启后相同任务 ID、无旧草稿、无执行记录。浏览器任务草稿、共用草稿写失败重试及消息/附件/插件损坏恢复回归通过，生产构建通过。本项验证正常退出，不保证强制终止或断电前的未确认写入。

### 保留任务草稿并返回列表（2026-09-19）

- 已交付：任务编辑器提供“保留草稿并返回列表”，暂存后可继续查看任务；列表显示继续编辑入口。当前只保留一份任务草稿，暂存期间禁用新建、建议模板、编辑和复制入口，避免覆盖；恢复仍有放弃确认，保存/放弃后恢复其他编辑入口。保存请求中禁止暂存。
- Edge 验证暂存不调用任务保存、恢复正文/名称、禁用创建与恢复后关闭保护；草稿失败重试及普通关闭/保存回归通过。真实 Electron 验证暂存后退出重启恢复、继续修改、明确放弃和正式保存唯一任务，生产构建通过。暂存状态只作用于当前页面，重进页面/重启会自动打开恢复草稿。

- 提交后专项验收：已有任务编辑暂存后可查看详情，但编辑/复制入口禁用；继续编辑保留任务 ID 和内容。延迟保存期间暂存与 Escape 均不关闭编辑器，保存失败后可暂存再恢复重试；成功后清除草稿、恢复创建/编辑/复制入口。Edge 模拟 RPC 专项通过，无产品修正。

### 已删除任务关联草稿验收（2026-09-19）

- 使用复制生产 Electron 和真实任务 IPC：编辑已有任务并暂存，详情中确认删除原任务，恢复旧草稿后保存显示“找不到任务”，不创建替代任务，未保存正文保持。退出重启仍可恢复此草稿，明确放弃后任务列表保持为空。
- 正常草稿创建、恢复、保存唯一任务、删除与重启全链路通过，无页面异常，无需产品修正。该验收补齐暂存草稿与正式任务删除的生命周期交叉路径。

### 保存前预览任务运行时间（2026-09-19）

- 已交付：任务编辑器可明确点击预览运行时间，通过只读 IPC 复用正式调度器的参数校验和 scheduleNext，返回未来三次计划时间（一次性仅一次），按明确标注的本地时区展示；不创建任务。修改安排即清除预览，失败可重试，组件卸载忽略迟到结果。
- 调度器测试覆盖间隔、一次性、工作日跳过周末、纽约夏令时切换和无效/过期安排。真实 Electron 主进程/preload/页面链路验证预览不创建任务、时间精确一致、改频率清除旧值、无效间隔报错与修复后三次五分钟间隔；完整草稿重启/保存/删除回归及生产构建通过。预览不保证应用关闭或其他任务占用时的实际执行时刻。

- 提交后 Edge 延迟响应验收：旧安排的成功/失败响应不影响新安排仍在等待的预览，不解除新请求加载状态；空数组、非法日期和逆序时间响应被拒绝，重试成功清除错误。整个预览流程不调用任务保存接口，无需产品修正。

### 每周多个运行日（2026-09-19）

- 已交付：任务频率新增“每周多日”，可选任意一个或多个星期，默认一/三/五；使用所选时区同一时刻执行，列表/详情显示所有运行日。正式存储校验至少一天、拒绝重复与非法星期并排序，草稿允许暂时清空选择以便继续编辑。原单日每周与工作日配置保留兼容。
- 调度器、预览和草稿共 24 项测试通过：覆盖跨周预览、持久化、星期一/三执行及星期二不执行、空/重复/越界星期拒绝。真实 Electron 验证空选择保存报错、二/四预览保存、重启详情和编辑复选框准确恢复；完整草稿生命周期回归及生产构建通过。

- 提交后验收：多日任务暂停期间不执行，恢复后计算下一个所选运行日并保持星期集合；纽约夏令时结束后仍按当地 09:00 执行。真实 Electron 复制多日任务后修改副本为四/六，原任务二/四不受影响；重启后两份独立 ID 与星期选择保持。21 项调度/预览测试及完整原生任务草稿链路通过，无产品修正。

### 每月指定日期任务（2026-09-19）

- 已交付：频率新增每月，支持 1–31 日、时间与时区，明确提示不存在的日期跳过当月。正式调度、预览、列表详情、编辑恢复及草稿均识别月度安排；未完成数字可留在草稿，正式保存限制整数 1–31。
- 23 项调度/预览测试与 5 项草稿测试通过：31 日跳过短月、闰年 2 月 29 日、重启后实际执行与无效日期拒绝。真实 Electron 将多日任务改为每月 31 日，预览三次日期均为 31 日，保存重启后详情和编辑准确恢复；完整原生任务回归及生产构建通过。

- 提交后验收：月度当地 09:00 跨纽约春季/秋季夏令时切换时 UTC 偏移正确变化。真实 Electron 清空月日期后重启可恢复未完成草稿，无效保存不改变原任务 31 日安排；修正为 15 日后正式保存成功。6 项预览测试及完整原生草稿链路通过，无产品修正。

### Windows 便携包近期功能验收（2026-09-19）

- 重新构建独立应用 .project-cache/felix-desktop-parity-20260919，835 个文件通过清单完整性校验。迁移到含空格临时目录，以 isPackaged=true 运行 Felix.exe，移除开发运行时环境覆盖，验证内置 app-server 模型目录、原生终端、WebP/GIF 解码、提醒任务重启。
- 新增分发包验收：url-template 已进入前端许可清单；真实 IPC 月度 31 日预览正常；多日任务草稿暂存后重启保留正文和选择、不创建正式任务，明确放弃可清理。
- 生成 .project-cache/felix-release-parity-20260919/Felix-portable.zip 及 SHA256SUMS.txt；再次解压后校验 ZIP 哈希、835 文件清单、27 个组件许可清单并重跑完整分发包启动测试，全部通过。包为未签名 Windows 本地验收产物，未发布到远端下载渠道；使用当前工作树（含既有远程桌面未提交改动）构建，不声明为纯提交版本或干净机器认证。

### 打包时源码状态记录（2026-09-19）

- desktop-manifest.json 新增 source：打包开始时的 Git 提交、UTC 时间、仓库 clean/modified/unknown 状态和 packaging 阶段标记。包括暂存/未暂存/未跟踪及子模块状态，不包含文件名、路径、正文或远端地址；Git 不可用时明确 unknown。
- 临时仓库测试验证干净、修改、暂存、未跟踪和无仓库状态。新目录包 .project-cache/felix-desktop-source-20260919 实际记录当前提交和 modified，835 文件完整性校验、迁移启动/内置后端/终端/任务草稿回归通过。此记录是打包时仓库观察值，不证明 dist 或预构建运行时来自相同提交，也不是可复现构建或签名证明。

- 提交后验收：真实临时 Git 子模块配置 ignore=all 后，其未跟踪文件仍使来源记录为 modified；独立子进程移除 PATH 中 Git 后返回 unknown/null，未误报 clean。4 项来源状态测试通过，无产品修正，报告不包含测试文件名或内容。

### 任务频率切换保留适用配置（2026-09-19）

- 验收修正：旧切换逻辑复制整份安排，残留无关的 day/days/monthDay，并把已有星期选择重置为一/三/五。现在抽离统一转换，只保留适用字段与时间/时区；每天转多日保留七天，工作日保留一至五，单日每周保留原星期。多日转单日选择排序后第一个星期（周日为 0），在可编辑星期控件中展示。
- 转换单测覆盖星期保留、旧字段清除、间隔/一次性默认与同类草稿克隆隔离。生产构建和完整真实 Electron 任务草稿、月度、多日复制、重启与正式保存回归通过。前文“多日默认一/三/五”仅适用于没有可继承星期集合的来源。

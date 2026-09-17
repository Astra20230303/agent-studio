const test = require('node:test');
const assert = require('node:assert/strict');
const { applyToolEvent, finishTools, restoreMessages } = require('../src/toolActivity.ts');
const makeThread = () => ({ messages: [{ id: 'before', role: 'assistant', content: 'Checking files' }] });

test('plugin mentions restore names and IDs without treating other mentions as plugins', () => {
  const [message] = restoreMessages([{ id: 'u', type: 'userMessage', content: [
    { type: 'text', text: 'Use plugin' },
    { type: 'mention', name: 'Docs', path: 'plugin://docs@local' },
    { type: 'mention', name: 'Docs', path: 'plugin://docs@local' },
    { type: 'mention', name: 'Other', path: 'app://other' },
    { type: 'mention', name: 'Empty', path: 'plugin://' }, null
  ] }], []);
  assert.deepEqual(message.plugins, [{ id: 'docs@local', name: 'Docs' }]);
  assert.equal(message.content, 'Use plugin');
});

test('raw record restoration preserves fields while ordinary messages stay on their dedicated path', () => {
  const thread = makeThread();
  applyToolEvent(thread, 'item/started', { turnId: 't', item: { id: 'raw', type: 'newOperation', input: 'original' } });
  for (const type of ['userMessage', 'agentMessage', 'plan']) applyToolEvent(thread, 'item/completed', { item: { id: type, type, text: 'text' } });
  assert.equal(thread.messages.length, 2);
  const restored = restoreMessages([{ turnId: 't', item: { id: 'raw', type: 'newOperation', output: 'done' } }, { item: { id: 'reply', type: 'agentMessage', text: 'Final' } }], thread.messages);
  assert.equal(restored.length, 2);
  assert.equal(restored[0].tool.kind, 'rawRecord');
  assert.deepEqual(restored[0].tool.rawRecord.item, { id: 'raw', type: 'newOperation', input: 'original', output: 'done' });
  assert.equal(restored[0].tool.turnId, 't');
  assert.equal(restored[1].content, 'Final');
  assert.equal(restored[1].tool, undefined);
});

test('sub-agent activity preserves event semantics, identity and history', () => {
  const thread = makeThread();
  const item = { id: 'event', type: 'subAgentActivity', kind: 'started', agentThreadId: 'child', agentPath: '/root/review' };
  applyToolEvent(thread, 'item/completed', { turnId: 'turn', item });
  applyToolEvent(thread, 'item/completed', { turnId: 'turn', item });
  assert.equal(thread.messages.length, 2);
  assert.deepEqual(thread.messages[1].tool.subAgent, { kind: 'started', threadId: 'child', path: '/root/review' });
  finishTools(thread, 'turn', true);
  assert.equal(thread.messages[1].tool.subAgent.kind, 'started');
  const restored = restoreMessages([{ turnId: 'turn', item }], thread.messages);
  assert.equal(restored.length, 1);
  assert.deepEqual(restored[0].tool.subAgent, thread.messages[1].tool.subAgent);
});

test('history restores explicit skill references without treating them as text', () => {
  const [message] = restoreMessages([{ type: 'userMessage', id: 'u', content: [{ type: 'text', text: 'Use this skill' }, { type: 'skill', name: 'sample', path: 'D:/sample/SKILL.md' }] }], []);
  assert.equal(message.content, 'Use this skill');
  assert.deepEqual(message.skills, [{ name: 'sample', path: 'D:/sample/SKILL.md' }]);
});

test('command stays in order after output, completion and turn completion', () => {
  const thread = makeThread();
  applyToolEvent(thread, 'item/started', { turnId: 't', item: { id: 'c', type: 'commandExecution', command: 'Get-Content README.md', status: 'inProgress' } });
  applyToolEvent(thread, 'item/commandExecution/outputDelta', { turnId: 't', itemId: 'c', delta: 'hello' });
  thread.messages.push({ id: 'after', role: 'assistant', content: 'Found it' });
  applyToolEvent(thread, 'item/completed', { turnId: 't', item: { id: 'c', type: 'commandExecution', status: 'completed', aggregatedOutput: 'hello world', exitCode: 0, durationMs: 42 } });
  finishTools(thread, 't');
  assert.deepEqual(thread.messages.map(message => message.id), ['before', 'tool-c', 'after']);
  assert.equal(thread.messages[1].tool.output, 'hello world');
  assert.equal(thread.messages[1].tool.durationMs, 42);
  assert.equal(thread.messages[1].tool.status, 'completed');
  const persisted = JSON.parse(JSON.stringify(thread)).messages[1].tool;
  assert.equal(persisted.output, 'hello world');
  assert.equal(persisted.status, 'completed');
  assert.equal(persisted.command, 'Get-Content README.md');
});

test('completed-only history and live output produce one tool row', () => {
  const thread = makeThread();
  applyToolEvent(thread, 'item/commandExecution/outputDelta', { turnId: 't', itemId: 'c', delta: 'error' });
  const params = { turnId: 't', item: { id: 'c', type: 'commandExecution', status: 'failed', exitCode: 1, aggregatedOutput: 'error' } };
  applyToolEvent(thread, 'item/completed', params);
  applyToolEvent(thread, 'item/completed', params);
  assert.equal(thread.messages.length, 2);
  assert.equal(thread.messages[1].tool.output, 'error');
});

test('history restores commands and file changes alongside text', () => {
  const items = [
    { type: 'agentMessage', id: 'a', text: 'Checking' },
    { type: 'commandExecution', id: 'c', command: 'pwd', status: 'completed', aggregatedOutput: 'D:/project', exitCode: 0 },
    { item: { type: 'fileChange', id: 'f', status: 'completed', changes: [{ path: 'a.txt', kind: { type: 'add' }, diff: '+hi' }] } },
    { type: 'agentMessage', id: 'b', text: 'Done' }
  ];
  const restored = restoreMessages(items, []);
  assert.deepEqual(restored.map(message => message.id), ['live-a', 'tool-c', 'tool-f', 'live-b']);
  assert.equal(restored[2].tool.changes[0].path, 'a.txt');
  assert.deepEqual(restoreMessages(items, restored).map(message => message.id), restored.map(message => message.id));
});

test('overlapping history pages do not duplicate messages and completion wins', () => {
  const restored = restoreMessages([
    { turnId: 't', item: { id: 'a', type: 'agentMessage', text: 'partial' } },
    { turnId: 't', item: { id: 'c', type: 'commandExecution', status: 'inProgress', command: 'pwd' } },
    { turnId: 't', item: { id: 'a', type: 'agentMessage', text: 'final' } },
    { turnId: 't', item: { id: 'c', type: 'commandExecution', status: 'completed', command: 'pwd', aggregatedOutput: 'D:/repo', exitCode: 0 } },
  ], []);
  assert.deepEqual(restored.map(message => message.id), ['live-a', 'tool-c']);
  assert.equal(restored[0].content, 'final');
  assert.equal(restored[1].tool.status, 'completed');
  assert.equal(restored[1].tool.output, 'D:/repo');
  const saved = structuredClone(restored);
  const repeated = restoreMessages([
    { id: 'a', type: 'agentMessage', text: 'partial' },
    { id: 'c', type: 'commandExecution', status: 'completed', aggregatedOutput: 'final output' },
    { id: 'a', type: 'agentMessage', text: '' },
    { id: 'c', type: 'commandExecution', status: 'completed', aggregatedOutput: 'final output' },
  ], restored);
  assert.deepEqual(repeated.map(message => message.id), ['live-a', 'tool-c']);
  assert.equal(repeated[0].content, '');
  assert.equal(repeated[1].tool.output, 'final output');
  assert.deepEqual(restored, saved, 'restoration must not mutate previous history');
});

test('omitted remote tools retain their position before the next assistant message', () => {
  const previous = [{ id: 'tool-c', role: 'system', content: '', tool: { kind: 'commandExecution', status: 'completed', output: 'saved' } }, { id: 'live-b', role: 'assistant', content: 'Done' }];
  const restored = restoreMessages([{ id: 'b', type: 'agentMessage', text: 'Done' }], previous);
  assert.deepEqual(restored.map(message => message.id), ['tool-c', 'live-b']);
});

test('turn termination updates unfinished tools without deleting them or other turns', () => {
  const thread = makeThread();
  for (const id of ['one', 'two']) applyToolEvent(thread, 'item/started', { turnId: id, item: { id, type: 'commandExecution', status: 'inProgress' } });
  finishTools(thread, 'one', true);
  assert.equal(thread.messages[1].tool.status, 'failed');
  assert.equal(thread.messages[2].tool.status, 'inProgress');
});

test('malformed history entries are ignored without hiding valid records', () => {
  const previous = [{ id: 'old', role: 'assistant', content: 'old' }];
  const restored = restoreMessages([null, undefined, 42, { item: null }, { item: 'bad' },
    { item: { id: 'reply', type: 'agentMessage', text: 'valid' } }], previous);
  assert.deepEqual(restored.map(message => message.id), ['live-reply']);
  assert.deepEqual(previous, [{ id: 'old', role: 'assistant', content: 'old' }]);
});

test('malformed content blocks and identities cannot corrupt subsequent text', () => {
  const restored = restoreMessages([
    { type: 'agentMessage', text: 'missing id' }, { id: 42, type: 'plan', text: 'invalid id' },
    { item: null, id: 'wrapper', type: 'agentMessage', text: 'not an item' },
    { id: 'a', type: 'agentMessage', text: { invalid: true }, content: 'not an array' },
    { id: 'u', type: 'userMessage', content: [null, 42, [], { type: 'text', text: 'valid' }, { type: 'text', text: {}, input_text: ' fallback' }, { type: 'localImage', path: 'picture.png' }] },
    { id: 'final', type: 'agentMessage', text: 'done' }
  ], []);
  assert.deepEqual(restored.map(m => m.id), ['live-a', 'u', 'live-final']);
  assert.deepEqual(restored.map(m => m.content), ['', 'valid fallback', 'done']);
  assert.deepEqual(restored[1].attachments, ['picture.png']);
});

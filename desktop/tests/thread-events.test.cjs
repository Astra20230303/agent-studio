const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createThreadEvents } = require('../src/threadEvents.ts');
const { reduceTurn } = require('../src/turnRuntime.ts');
function fixture() {
  const state = { threads: ['a', 'b'].map(id => ({ id, remoteId: id, status: 'completed', messages: [] })) };
  const records = new Map(); const finishes = []; const audits = [];
  const handle = createThreadEvents({ update: fn => fn(state), runtime: { read: id => records.get(id), apply: (id, event) => records.set(id, reduceTurn(records.get(id), event)) }, queue: { finish: (...args) => finishes.push(args) }, audit: { record: (...args) => audits.push(args) } });
  return { state, records, finishes, audits, handle, emit: (method, params, eventId) => handle({ method, params, eventId }) };
}
test('complete event chain coordinates transcript, runtime, queue and audit across concurrent threads', () => {
  const f = fixture();
  for (const id of ['a', 'b']) f.emit('turn/started', { threadId: id, turn: { id: `turn-${id}` } });
  f.emit('turn/plan/updated', { threadId: 'a', turnId: 'turn-a', plan: [{ step: 'Inspect', status: 'inProgress' }] });
  f.emit('item/started', { threadId: 'a', turnId: 'turn-a', item: { id: 'cmd', type: 'commandExecution', command: 'pwd' } });
  f.emit('item/commandExecution/outputDelta', { threadId: 'a', turnId: 'turn-a', itemId: 'cmd', delta: 'partial' });
  f.emit('item/completed', { threadId: 'a', turnId: 'turn-a', item: { id: 'cmd', type: 'commandExecution', status: 'completed', aggregatedOutput: 'final' } });
  f.emit('item/agentMessage/delta', { threadId: 'a', turnId: 'turn-a', itemId: 'answer', delta: 'partial' });
  f.emit('item/completed', { threadId: 'a', turnId: 'turn-a', item: { id: 'answer', type: 'agentMessage', text: 'Final answer' } });
  const finished = { threadId: 'a', turn: { id: 'turn-a', status: 'completed' } };
  f.emit('turn/completed', finished); f.emit('turn/completed', finished);
  assert.equal(f.state.threads[0].status, 'completed');
  assert.equal(f.state.threads[0].messages[0].tool.output, 'final');
  assert.equal(f.state.threads[0].messages[1].content, 'Final answer');
  assert.equal(f.state.threads[1].status, 'running');
  assert.equal(f.records.get('b').turnId, 'turn-b');
  assert.deepEqual(f.finishes, [['a', 'turn-a', true]]);
  assert.deepEqual(f.audits, [['回合开始', 'a'], ['回合开始', 'b'], ['回合结束', 'a']]);
});
test('retry hints, terminal failure and tool interruption produce one error and a paused queue signal', () => {
  const f = fixture();
  f.emit('turn/started', { threadId: 'a', turn: { id: 'turn' } });
  f.emit('item/started', { threadId: 'a', turnId: 'turn', item: { id: 'cmd', type: 'commandExecution' } });
  f.emit('error', { threadId: 'a', turnId: 'turn', willRetry: true, error: { message: 'temporary' } });
  assert.equal(f.state.threads[0].messages.length, 1);
  assert.match(f.records.get('a').activity, /重试/);
  f.emit('error', { threadId: 'a', turnId: 'turn', willRetry: false, error: { message: 'offline' } });
  f.emit('turn/completed', { threadId: 'a', turn: { id: 'turn', status: 'failed', error: { message: 'offline' } } });
  assert.equal(f.state.threads[0].status, 'failed');
  assert.equal(f.state.threads[0].messages.length, 2);
  assert.equal(f.state.threads[0].messages[0].tool.status, 'failed');
  assert.deepEqual(f.finishes, [['a', 'turn', false]]);
});
test('unhandled notifications remain with caller; malformed lifecycle has no domain side effects', () => {
  const f = fixture(); const before = structuredClone(f.state);
  assert.equal(f.emit('thread/settings/updated', {}), false);
  assert.equal(f.emit('turn/completed', { threadId: 'a', turn: { id: 'turn', status: 'bad' } }), true);
  assert.equal(f.emit('item/agentMessage/delta', { itemId: 'answer', delta: 'unrouted' }), true);
  assert.deepEqual(f.state, before); assert.equal(f.records.size, 0);
  assert.deepEqual(f.finishes, []); assert.deepEqual(f.audits, []);
});

test('older completion and stale plan cannot replace an active turn or its transcript', () => {
  const f = fixture();
  f.emit('turn/started', { threadId: 'a', turn: { id: 'current' } });
  f.emit('turn/plan/updated', { threadId: 'a', turnId: 'current', plan: [{ step: 'Current work', status: 'inProgress' }] });
  f.emit('turn/plan/updated', { threadId: 'a', turnId: 'old', plan: [{ step: 'Stale work', status: 'completed' }] });
  f.emit('item/completed', { threadId: 'a', turnId: 'old', item: { id: 'plan', type: 'plan', text: 'Stale proposal' } });
  f.emit('turn/completed', { threadId: 'a', turn: { id: 'old', status: 'failed', error: { message: 'Old failure' } } });
  assert.equal(f.records.get('a').turnId, 'current');
  assert.equal(f.state.threads[0].status, 'running');
  assert.equal(f.state.threads[0].plan.steps[0].step, 'Current work');
  assert.equal(f.state.threads[0].messages.length, 1);
  assert.equal(f.state.threads[0].messages[0].content, 'Old failure');
  assert.deepEqual(f.finishes, [['a', 'old', false]]);
});
test('transport event identity is forwarded to assistant delta deduplication', () => {
  const f = fixture();
  f.emit('turn/started', { threadId: 'a', turn: { id: 'turn' } });
  const params = { threadId: 'a', turnId: 'turn', itemId: 'answer', delta: 'same' };
  f.emit('item/agentMessage/delta', params, 'transport-1');
  f.emit('item/agentMessage/delta', params, 'transport-1');
  assert.equal(f.state.threads[0].messages[0].content, 'same');
  assert.deepEqual(f.state.threads[0].messages[0].streamDeltaIds, ['transport-1']);
});
test('plan deltas accumulate for one item, isolate item switches, and clear on completion', () => {
  const f = fixture();
  f.emit('turn/started', { threadId: 'a', turn: { id: 'turn-a' } });
  f.emit('item/plan/delta', { threadId: 'a', turnId: 'turn-a', itemId: 'plan-a', delta: 'Part ' });
  f.emit('item/plan/delta', { threadId: 'a', turnId: 'turn-a', itemId: 'plan-a', delta: 'two' });
  assert.equal(f.state.threads[0].planDelta.content, 'Part two');
  f.emit('item/plan/delta', { threadId: 'a', turnId: 'turn-a', itemId: 'plan-b', delta: 'ignored' });
  assert.equal(f.state.threads[0].planDelta.content, 'Part two');
  f.emit('item/completed', { threadId: 'a', turnId: 'turn-a', item: { type: 'plan', id: 'plan-a', text: 'Final plan' } });
  assert.equal(f.state.threads[0].planDelta, undefined);
  f.emit('item/plan/delta', { threadId: 'a', turnId: 'old', itemId: 'plan-a', delta: 'late' });
  assert.equal(f.state.threads[0].planDelta, undefined);
});

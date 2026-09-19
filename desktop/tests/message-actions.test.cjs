const test = require('node:test');
const assert = require('node:assert/strict');
const { replyText, branchSnapshot, fullBranchSnapshot, isFinalReply } = require('../src/messageActions.ts');

test('copy preserves markdown and code while omitting hidden reasoning', () => {
  assert.equal(replyText('<think>internal</think>\n**Answer**\n\n```js\nconst a = 1;\n```'), '**Answer**\n\n```js\nconst a = 1;\n```');
});

test('fork snapshot excludes later messages and never mutates source', () => {
  const source = { id: 'source', title: 'History', status: 'completed', pinned: true, archived: false, messages: [
    { id: 'u1', role: 'user', content: 'first' }, { id: 'a1', role: 'assistant', content: 'reply one' },
    { id: 'u2', role: 'user', content: 'later' }, { id: 'a2', role: 'assistant', content: 'reply two' }
  ] };
  const copy = branchSnapshot(source, 'a1', 'forked');
  assert.equal(copy.remoteId, 'forked');
  assert.equal(copy.messages.length, 2);
  assert.equal(source.messages.length, 4);
  assert.equal(copy.pinned, false);
  copy.messages[0].content = 'changed';
  assert.equal(source.messages[0].content, 'first');
});

test('intermediate commentary and user messages are not fork points', () => {
  const messages = [{ role: 'user' }, { role: 'assistant' }, { role: 'system', tool: {} }, { role: 'assistant' }];
  assert.equal(isFinalReply(messages, 0), false);
  assert.equal(isFinalReply(messages, 1), false);
  assert.equal(isFinalReply(messages, 3), true);
});

test('branches preserve settings but reset transient state and historical progress', () => {
  const source = { id: 'source', title: 'History', model: 'chosen', reasoningEffort: 'high', planningMode: 'plan', cwd: 'workspace', projectId: 'project', status: 'failed', pinned: true, archived: true,
    requestedPermission: 'full', effectivePermissions: { sandbox: 'old' }, contextTokens: { total: 123 }, plan: { turnId: 'later', steps: [] },
    messages: [{ id: 'a', role: 'assistant', content: 'Answer' }] };
  for (const copy of [fullBranchSnapshot(source, 'full'), branchSnapshot(source, 'a', 'partial')]) {
    for (const key of ['model', 'reasoningEffort', 'planningMode', 'cwd', 'projectId']) assert.equal(copy[key], source[key]);
    assert.equal(copy.status, 'idle'); assert.equal(copy.pinned, false); assert.equal(copy.archived, false);
    for (const key of ['requestedPermission', 'effectivePermissions', 'contextTokens']) assert.equal(copy[key], undefined);
  }
  assert.equal(branchSnapshot(source, 'a', 'partial').plan, undefined);
  const full = fullBranchSnapshot(source, 'full'); full.plan.steps.push({ step: 'new' });
  assert.equal(source.plan.steps.length, 0);
});
test('forked conversations do not inherit source moderation diagnostics', () => {
 const source = { id: 'source', title: 'History', messages: [{ id: 'answer', role: 'assistant', content: 'done' }], moderationMetadata: { turnId: 'old', metadata: { result: 'source-only' } } };
 assert.equal(fullBranchSnapshot(source, 'fork').moderationMetadata, undefined);
 assert.equal(branchSnapshot(source, 'answer', 'fork').moderationMetadata, undefined);
 assert.equal(source.moderationMetadata.turnId, 'old');
});

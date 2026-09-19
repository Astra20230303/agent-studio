const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isTaskDraft } = require('../src/taskDraftStorage.ts');

const draft = { name: '每日检查', prompt: '检查工作区', kind: 'agent', model: 'model-a', permission: 'read-only', notify: true, schedule: { kind: 'daily', time: '09:00', timezone: 'Asia/Shanghai' } };
test('accepts complete task drafts for restart recovery', () => {
  assert.equal(isTaskDraft(draft), true);
  assert.equal(isTaskDraft({ ...draft, schedule: { kind: 'interval', minutes: 30 } }), true);
  assert.equal(isTaskDraft({ ...draft, schedule: { kind: 'weekly', time: '09:00', timezone: 'UTC', day: 6 } }), true);
});
test('rejects malformed or unsafe task drafts without touching scheduler data', () => {
  for (const value of [null, { ...draft, kind: 'unknown' }, { ...draft, notify: 'yes' }, { ...draft, schedule: { kind: 'interval', minutes: '0' } }, { ...draft, prompt: 'bad\0prompt' }]) assert.equal(isTaskDraft(value), false);
});

test('unfinished editor values can recover without granting permission to schedule', () => {
  for (const minutes of [0, -1, 0.5, 10081]) assert.equal(isTaskDraft({ ...draft, schedule: { kind: 'interval', minutes } }), true);
  assert.equal(isTaskDraft({ ...draft, schedule: { kind: 'once', at: '' } }), true);
  assert.equal(isTaskDraft({ ...draft, timeoutMinutes: 0 }), true);
  for (const fields of [{ cwd: {} }, { timeoutMinutes: '10' }, { timeoutMinutes: Infinity }, { reasoningEffort: 'unknown' }, { schedule: { kind: 'interval', minutes: NaN } }]) assert.equal(isTaskDraft({ ...draft, ...fields }), false);
});

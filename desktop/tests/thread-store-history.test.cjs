const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createThreadStore } = require('../src/threadStore.ts');
const message = text => ({ item: { id: text, type: 'agentMessage', text } });
const store = backend => createThreadStore(backend, () => { throw Error('read mutated application state'); });

test('store history snapshots pages before later requests and preserves unknown item types', async () => {
  const first = message('original');
  const future = { item: { id: 'future', type: 'futureTool', payload: { value: 1 } } };
  const progress = [];
  const reader = store({ items: async (id, cursor) => {
    assert.equal(id, 'thread');
    if (!cursor) return { data: [first], nextCursor: 'next' };
    first.item.text = 'changed during pagination';
    return { data: [future] };
  } });
  const result = await reader.readHistory('thread', { onProgress: p => progress.push(p) });
  assert.equal(result[0].item.text, 'original');
  future.item.payload.value = 2;
  assert.equal(result[1].item.payload.value, 1);
  assert.deepEqual(progress, [{ pages: 1, items: 1 }, { pages: 2, items: 2 }]);
});

test('invalid complete history fails without applying partial state and retry starts over', async () => {
  let bad = true;
  const calls = [];
  const reader = store({ items: async (id, cursor) => {
    calls.push(cursor);
    return cursor ? { data: [bad ? { item: { type: 'agentMessage', text: 'no id' } } : message('last')] } : { data: [message('first')], nextCursor: 'next' };
  } });
  await assert.rejects(reader.readHistory('a'), /历史条目无效/);
  bad = false;
  assert.equal((await reader.readHistory('a')).length, 2);
  assert.deepEqual(calls, [undefined, 'next', undefined, 'next']);
});

test('cancelled store read settles while transport is pending; retry and late result stay independent', async () => {
  let release;
  let calls = 0;
  const reader = store({ items: async () => ++calls === 1 ? new Promise(resolve => { release = resolve; }) : { data: [message('retry')] } });
  const controller = new AbortController();
  const progress = [];
  const pending = reader.readHistory('a', { signal: controller.signal, onProgress: p => progress.push(p) });
  await Promise.resolve();
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal((await reader.readHistory('a'))[0].item.text, 'retry');
  release({ data: [message('late')], nextCursor: 'unused' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 2);
  assert.deepEqual(progress, []);
});

test('store locates legacy replies across pages and rejects bad or cycling turn pages', async () => {
  const calls = [];
  const reader = store({ turns: async (id, cursor) => {
    calls.push([id, cursor]);
    return cursor ? { data: [{ id: 'turn', items: [{ id: 'reply' }] }] } : { data: [], nextCursor: 'next' };
  } });
  assert.equal(await reader.findMessageTurn('a', 'live-reply'), 'turn');
  assert.deepEqual(calls, [['a', undefined], ['a', 'next']]);
  assert.equal(await reader.findMessageTurn('a', 'absent'), undefined);
  await assert.rejects(store({ turns: async () => ({ data: [{ id: 'bad', items: null }] }) }).findMessageTurn('a', 'reply'), /回合列表无效/);
  await assert.rejects(store({ turns: async () => ({ data: [], nextCursor: 'same' }) }).findMessageTurn('a', 'reply'), /分页重复/);
});

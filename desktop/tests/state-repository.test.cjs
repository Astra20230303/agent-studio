const test = require('node:test');
const assert = require('node:assert/strict');
const { createStateRepository } = require('../src/stateRepository.ts');
const { defaultState } = require('../src/store.ts');

test('async hydration waits for data and preserves legacy normalization without writing', async () => {
  let resolve; let writes = 0;
  const repository = createStateRepository({ getItem: () => new Promise(done => { resolve = done; }), setItem: () => { writes++; } });
  let loaded = false;
  const read = repository.load().then(state => { loaded = true; return state; });
  await Promise.resolve(); assert.equal(loaded, false);
  resolve(JSON.stringify({ theme: 'unknown', threads: [{ id: 'a', title: '新对话', messages: [{ content: 'Preserved title', role: 'user' }] }] }));
  const state = await read;
  assert.equal(state.theme, 'light'); assert.equal(state.threads[0].title, 'Preserved title');
  assert.equal(writes, 0);
});
test('rejected and invalid reads propagate without replacing original data and permit retry', async () => {
  let raw = '{broken'; let unavailable = true; let writes = 0;
  const repository = createStateRepository({ getItem: async () => { if (unavailable) throw Error('offline'); return raw; }, setItem: () => { writes++; } });
  await assert.rejects(repository.load(), /原始数据已保留/);
  unavailable = false;
  await assert.rejects(repository.load(), /原始数据已保留/);
  assert.equal(raw, '{broken'); assert.equal(writes, 0);
  raw = JSON.stringify({ theme: 'dark' });
  assert.equal((await repository.load()).theme, 'dark');
});
test('save acknowledges the captured snapshot only after persistence and propagates retryable failure', async () => {
  let complete; let captured;
  const repository = createStateRepository({ getItem: () => null, setItem: (key, value) => {
    assert.equal(key, 'codex-desktop-state-v1'); captured = value;
    return new Promise((resolve, reject) => { complete = { resolve, reject }; });
  } });
  const state = await repository.load(); state.theme = 'dark';
  const failed = assert.rejects(repository.save(state), /quota/);
  state.theme = 'light';
  assert.equal(JSON.parse(captured).theme, 'dark');
  complete.reject(Error('quota')); await failed;
  let saved = false;
  const retry = repository.save(state).then(() => { saved = true; });
  await Promise.resolve(); assert.equal(saved, false);
  complete.resolve(); await retry;
  assert.equal(JSON.parse(captured).theme, 'light');
});
test('repositories and successive reads return independent state snapshots', async () => {
  const storage = { getItem: () => null, setItem: () => {} };
  const first = createStateRepository(storage); const second = createStateRepository(storage);
  const state = await first.load(); state.threads.push({ id: 'local' });
  assert.deepEqual((await first.load()).threads, []);
  assert.deepEqual((await second.load()).threads, []);
  assert.deepEqual((await first.load()).projects, defaultState().projects);
});

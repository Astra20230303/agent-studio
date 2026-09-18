const test = require('node:test');
const assert = require('node:assert/strict');
const { createConnectionRecovery } = require('../src/connectionRecovery.ts');
const flush = () => new Promise(resolve => setImmediate(resolve));

test('bounded retries end offline and manual retry can recover', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0, online = false, recovered = 0;
  const states = [];
  const recovery = createConnectionRecovery({ connect: async () => { calls++; if (!online) throw Error('Unavailable'); }, status: state => states.push(state), connected: () => recovered++, delays: [10, 20] });
  recovery.start(); await flush();
  t.mock.timers.tick(10); await flush();
  t.mock.timers.tick(20); await flush();
  assert.equal(calls, 3); assert.equal(states.at(-1), 'offline');
  online = true; recovery.start(); await flush();
  assert.equal(recovered, 1); assert.equal(states.at(-1), 'connected');
  recovery.stop();
});
test('cleanup cancels retries and ignores delayed connection success', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let resolve, recovered = 0;
  const recovery = createConnectionRecovery({ connect: () => new Promise(done => { resolve = done; }), status: () => {}, connected: () => recovered++ });
  recovery.start(); recovery.stop(); resolve(); await flush();
  t.mock.timers.tick(10000); await flush();
  assert.equal(recovered, 0);
});
test('disconnect after connection waits before reconnecting', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0, recovered = 0;
  const recovery = createConnectionRecovery({ connect: async () => { calls++; }, status: () => {}, connected: () => recovered++, delays: [10] });
  recovery.start(); await flush(); recovery.disconnected();
  assert.equal(recovered, 1); assert.equal(calls, 1);
  t.mock.timers.tick(10); await flush();
  assert.equal(recovered, 2); assert.equal(calls, 2);
  recovery.stop();
});

test('a crash on every handshake cannot reset the retry budget', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const states = [];
  const recovery = createConnectionRecovery({ connect: async () => { calls++; recovery.disconnected(); throw Error('Process exited'); }, status: state => states.push(state), connected: () => assert.fail('unexpected connection'), delays: [10, 20] });
  recovery.start(); await flush();
  t.mock.timers.tick(10); await flush();
  t.mock.timers.tick(20); await flush();
  t.mock.timers.tick(10000); await flush();
  assert.equal(calls, 3); assert.equal(states.at(-1), 'offline');
  recovery.stop();
});

test('network recovery starts one bounded retry cycle only after exhaustion', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0, online = false, recovered = 0;
  const states = [];
  const recovery = createConnectionRecovery({ connect: async () => { calls++; if (!online) throw Error('offline'); }, status: state => states.push(state), connected: () => recovered++, delays: [10] });
  recovery.online(); assert.equal(calls, 0);
  recovery.start(); recovery.online(); await flush();
  recovery.online(); assert.equal(calls, 1);
  t.mock.timers.tick(10); await flush();
  assert.equal(calls, 2); assert.equal(states.at(-1), 'offline');
  recovery.online(); recovery.online(); await flush();
  assert.equal(calls, 3);
  t.mock.timers.tick(10); await flush();
  assert.equal(calls, 4); assert.equal(states.at(-1), 'offline');
  online = true; recovery.online(); await flush();
  assert.equal(calls, 5); assert.equal(recovered, 1);
  recovery.online(); assert.equal(calls, 5);
  recovery.stop(); recovery.online(); recovery.disconnected();
  t.mock.timers.tick(10000); await flush();
  assert.equal(calls, 5);
});

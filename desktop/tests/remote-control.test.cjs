const test = require('node:test');
const assert = require('node:assert/strict');
const { readRemoteControlStatus, readRemoteControlPairing, readRemoteControlClients, remoteControlId } = require('../src/remoteControl.ts');

test('remote control responses validate status, pairing and device pages', () => {
  assert.deepEqual(readRemoteControlStatus({ status: 'connected', serverName: 'Felix', installationId: 'install', environmentId: 'env' }), { status: 'connected', serverName: 'Felix', installationId: 'install', environmentId: 'env' });
  assert.deepEqual(readRemoteControlPairing({ pairingCode: '1234', manualPairingCode: '5678', environmentId: 'env', expiresAt: 100 }), { pairingCode: '1234', manualPairingCode: '5678', environmentId: 'env', expiresAt: 100 });
  assert.deepEqual(readRemoteControlClients({ data: [{ clientId: 'c', displayName: 'Phone', lastSeenAt: null }], nextCursor: null }), { data: [{ clientId: 'c', displayName: 'Phone' }] });
  for (const value of [null, {}, { status: 'ready', serverName: 'Felix', installationId: 'i' }]) assert.throws(() => readRemoteControlStatus(value), /远程控制/);
  for (const value of [{ pairingCode: '', environmentId: 'e', expiresAt: 1 }, { pairingCode: 'p', environmentId: 'e', expiresAt: 0 }]) assert.throws(() => readRemoteControlPairing(value), /配对/);
  for (const value of [null, { data: [{ clientId: 'c' }, { clientId: 'c' }] }, { data: [], nextCursor: {} }]) assert.throws(() => readRemoteControlClients(value), /远程控制/);
  assert.throws(() => remoteControlId(' '), /身份/);
});

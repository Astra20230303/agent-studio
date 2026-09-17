const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

test('migrates legacy provider and preserves independent channels and secrets', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-registry-'));
  const original = Module._load;
  const oldKey = process.env.MINIMAX_API_KEY;
  process.env.MINIMAX_API_KEY = 'minimax-test-key';
  const filename = require.resolve('../electron/provider-config.cjs');
  Module._load = function (id, ...args) {
    if (id === 'electron') return {
      app: { getPath: () => directory },
      safeStorage: { isEncryptionAvailable: () => true, encryptString: value => Buffer.from(value), decryptString: value => value.toString() },
    };
    return original.call(this, id, ...args);
  };
  try {
    fs.writeFileSync(path.join(directory, 'provider.json'), JSON.stringify({ name: 'RVCompute', baseUrl: 'https://api.rvcompute.com:60000/v1', secret: Buffer.from('first-key').toString('base64') }));
    delete require.cache[filename];
    const config = require(filename);
    assert.equal(config.listProviders().length, 2);
    assert.equal(config.readProvider().apiKey, 'first-key');
    const id = config.saveProvider({ name: 'Second channel', baseUrl: 'https://api.rvcompute.com:60000/v1', apiKey: 'second-key', model: 'second-model' });
    assert.equal(config.listProviders().length, 3);
    assert.equal(config.readProvider().apiKey, 'first-key');
    config.activateProvider(id);
    assert.equal(config.readProvider().apiKey, 'second-key');
    config.saveProvider({ id, name: 'Edited', baseUrl: 'https://api.rvcompute.com:60000/v1/', apiKey: '', model: 'edited-model' });
    assert.equal(config.readProvider().apiKey, 'second-key');
    assert.throws(() => config.providerCredentials({ baseUrl: 'https://api.rvcompute.com:60000/v1' }));
    assert.throws(() => config.providerCredentials({ id, baseUrl: 'https://different.example/v1' }));
    config.activateProvider('minimax-cn');
    assert.equal(config.readProvider().apiKey, 'minimax-test-key');
    assert.equal(config.listProviders().filter(item => item.enabled).length, 1);
    assert.ok(config.listProviders().every(item => !('secret' in item) && !('apiKey' in item)));
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'provider.json'))).providers.length, 3);
    const local = config.saveProvider({ name: 'Local', baseUrl: 'http://127.0.0.1:11434/v1', apiKey: '', activate: true });
    assert.equal(config.readProvider().apiKey, '');
    assert.equal(config.listProviders().find(item => item.id === local).authRequired, false);
    assert.equal(config.listProviders().find(item => item.id === local).keyConfigured, false);
    config.activateProvider(local);
    assert.throws(() => config.saveProvider({ id: local, baseUrl: 'https://remote.example/v1', apiKey: '' }), /API Key/);
    config.saveProvider({ id: local, baseUrl: 'http://127.0.0.1:11434/v1', apiKey: 'local-secret' });
    config.saveProvider({ id: local, baseUrl: 'http://127.0.0.1:11434/v1', apiKey: '' });
    assert.equal(config.readProvider().apiKey, 'local-secret');
    assert.throws(() => config.deleteProvider(local), /启用其他渠道/);
    assert.throws(() => config.deleteProvider('missing'), /不存在/);
    const before = fs.readFileSync(path.join(directory, 'provider.json'), 'utf8');
    const rename = fs.renameSync;
    try {
      fs.renameSync = () => { throw Error('disk unavailable'); };
      assert.throws(() => config.deleteProvider(id), /disk unavailable/);
      assert.equal(fs.readFileSync(path.join(directory, 'provider.json'), 'utf8'), before);
    } finally { fs.renameSync = rename; }
    config.deleteProvider(id);
    assert.ok(!config.listProviders().some(item => item.id === id));
    assert.ok(!fs.readFileSync(path.join(directory, 'provider.json'), 'utf8').includes(Buffer.from('second-key').toString('base64')));
    assert.equal(config.readProvider().apiKey, 'local-secret');
  } finally {
    Module._load = original;
    delete require.cache[filename];
    if (oldKey === undefined) delete process.env.MINIMAX_API_KEY; else process.env.MINIMAX_API_KEY = oldKey;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

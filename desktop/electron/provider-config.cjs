const fs = require('node:fs');
const path = require('node:path');
const { app, safeStorage } = require('electron');
const { providerUrl, isLocalProvider } = require('./provider-url.cjs');

function readRegistry() {
  const file = path.join(app.getPath('userData'), 'provider.json');
  const minimax = { id: 'minimax-cn', name: 'MiniMax CN', baseUrl: 'https://api.minimaxi.com/v1', model: '' };
  if (!fs.existsSync(file)) return { version: 2, activeId: minimax.id, providers: [minimax] };
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (saved.version === 2) return saved;
  const migrated = { ...saved, id: saved.baseUrl === minimax.baseUrl ? minimax.id : 'legacy-provider', model: saved.model || '' };
  return { version: 2, activeId: migrated.id, providers: migrated.id === minimax.id ? [migrated] : [minimax, migrated] };
}

function decrypt(provider) {
  if (!provider) throw new Error('Provider 不存在');
  return { ...provider, apiKey: provider.secret ? safeStorage.decryptString(Buffer.from(provider.secret, 'base64')) : provider.id === 'minimax-cn' ? process.env.MINIMAX_API_KEY || '' : '' };
}

function readProvider() {
  const registry = readRegistry();
  return decrypt(registry.providers.find(item => item.id === registry.activeId));
}

function listProviders() {
  const registry = readRegistry();
  return registry.providers.map(({ secret, ...item }) => ({ ...item, enabled: item.id === registry.activeId, authRequired: !isLocalProvider(item.baseUrl), keyConfigured: Boolean(secret || (item.id === 'minimax-cn' && process.env.MINIMAX_API_KEY)) }));
}

function writeRegistry(registry) {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  const file = path.join(app.getPath('userData'), 'provider.json');
  fs.writeFileSync(file + '.tmp', JSON.stringify(registry), { mode: 0o600 });
  fs.renameSync(file + '.tmp', file);
}

function activateProvider(id) {
  const registry = readRegistry();
  const provider = decrypt(registry.providers.find(item => item.id === id));
  if (!provider.apiKey && !isLocalProvider(provider.baseUrl)) throw new Error('请先配置此渠道的 API Key');
  registry.activeId = id;
  writeRegistry(registry);
  return provider.model;
}

function saveProvider(input) {
  const baseUrl = providerUrl(input.baseUrl);
  const apiKey = providerCredentials({ id: input.id, baseUrl, apiKey: input.apiKey }).apiKey;
  if (!apiKey && !isLocalProvider(baseUrl)) throw new Error('请填写 API Key');
  if (apiKey && !safeStorage.isEncryptionAvailable()) throw new Error('系统密钥加密不可用');
  const registry = readRegistry();
  const id = input.id || require('node:crypto').randomUUID();
  if (input.id && !registry.providers.some(item => item.id === id)) throw new Error('Provider 不存在');
  const saved = { id, baseUrl, name: String(input.name || 'Custom'), model: String(input.model || ''), secret: apiKey ? safeStorage.encryptString(apiKey).toString('base64') : undefined };
  registry.providers = registry.providers.filter(item => item.id !== id).concat(saved);
  if (input.activate) registry.activeId = id;
  writeRegistry(registry);
  return id;
}

function providerCredentials(input) {
  if (!input) return readProvider();
  const baseUrl = providerUrl(input.baseUrl);
  if (input.apiKey?.trim()) return { baseUrl, apiKey: input.apiKey.trim() };
  if (!input.id) { if (isLocalProvider(baseUrl)) return { baseUrl, apiKey: '' }; throw new Error('请填写新渠道的 API Key'); }
  const saved = decrypt(readRegistry().providers.find(item => item.id === input.id));
  if (isLocalProvider(baseUrl)) return { baseUrl, apiKey: saved.baseUrl === baseUrl ? saved.apiKey : '' };
  if (saved.baseUrl !== baseUrl || !saved.apiKey) throw new Error('请填写此服务的 API Key');
  return { baseUrl, apiKey: saved.apiKey };
}

module.exports = { readProvider, saveProvider, providerCredentials, listProviders, activateProvider };

const fs = require('node:fs');
const path = require('node:path');

class ThreadProviderRouter {
  constructor(file, readProvider, adapterUrl) {
    this.file = file; this.readProvider = readProvider; this.adapterUrl = adapterUrl;
    this.bindings = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  }
  save(threadId, providerId) {
    const next = { ...this.bindings, [threadId]: providerId };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file + '.tmp', JSON.stringify(next), { mode: 0o600 });
    fs.renameSync(this.file + '.tmp', this.file);
    this.bindings = next;
  }
  get(threadId) { return typeof threadId === 'string' ? this.bindings[threadId] : undefined; }
  async request(rpc, method, params = {}) {
    if (!['thread/start', 'thread/resume', 'thread/fork', 'turn/start'].includes(method)) return rpc.request(method, params);
    const stored = Object.hasOwn(this.bindings, params.threadId) ? this.bindings[params.threadId] : params.providerId;
    const provider = this.readProvider(stored);
    if (!/^[A-Za-z0-9_-]+$/.test(provider.id)) throw Error('Invalid Provider ID');
    if (!provider.apiKey?.trim() && !require('./provider-url.cjs').isLocalProvider(provider.baseUrl)) throw Error('此会话渠道未配置 API Key');
    const routed = { ...params, modelProvider: 'minimax' };
    delete routed.providerId;
    if (method !== 'turn/start') {
      routed.config = { ...params.config, 'model_providers.minimax.base_url': `${this.adapterUrl()}/providers/${provider.id}/v1` };
    }
    const result = await rpc.request(method, routed);
    if (method !== 'turn/start' && result.thread?.id) {
      this.save(result.thread.id, provider.id);
      return { ...result, providerId: provider.id };
    }
    return result;
  }
}
module.exports = { ThreadProviderRouter };

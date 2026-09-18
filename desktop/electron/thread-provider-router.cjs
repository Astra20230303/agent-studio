const fs = require('node:fs');
const path = require('node:path');

class ThreadProviderRouter {
  constructor(file, readProvider, adapterUrl) {
    this.file = file; this.readProvider = readProvider; this.adapterUrl = adapterUrl;
    this.bindings = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    this.migrating = new Set();
    this.inflight = new Map();
    this.failedMigrations = new Set();
  }
  save(threadId, providerId, modelProvider = 'minimax', model) {
    const next = { ...this.bindings, [threadId]: modelProvider === 'minimax' && !model ? providerId : { providerId, modelProvider, ...(model ? { model } : {}) } };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file + '.tmp', JSON.stringify(next), { mode: 0o600 });
    fs.renameSync(this.file + '.tmp', this.file);
    this.bindings = next;
  }
  get(threadId) { const binding = typeof threadId === 'string' && Object.hasOwn(this.bindings, threadId) ? this.bindings[threadId] : undefined; return typeof binding === 'string' ? binding : binding?.providerId; }
  engine(threadId) { return this.bindings[threadId]?.modelProvider || 'minimax'; }
  observe(message) {
    if (message?.method !== 'thread/settings/updated') return;
    const { threadId, threadSettings } = message.params || {};
    const providerId = this.get(threadId);
    if (!providerId || this.migrating.has(threadId) || typeof threadSettings?.model !== 'string' || !threadSettings.model.trim() || threadSettings.modelProvider !== this.engine(threadId)) return;
    const engine = this.engine(threadId);
    try { this.save(threadId, providerId, engine, threadSettings.model); }
    catch (error) {
      // The engine has already applied these settings; preserve them in memory.
      this.bindings = { ...this.bindings, [threadId]: { providerId, modelProvider: engine, model: threadSettings.model } };
      return { method: 'warning', params: { threadId, message: `会话模型已生效，但未能保存恢复设置：${error.message}。重启后可能恢复旧模型。` } };
    }
  }
  provider(id) {
    const provider = this.readProvider(id);
    if (!/^[A-Za-z0-9_-]+$/.test(provider.id)) throw Error('Invalid Provider ID');
    if (!provider.apiKey?.trim() && !require('./provider-url.cjs').isLocalProvider(provider.baseUrl)) throw Error('此会话渠道未配置 API Key');
    return provider;
  }
  config(providerId, engine) {
    return {
      [`model_providers.${engine}.name`]: 'Felix',
      [`model_providers.${engine}.wire_api`]: 'responses',
      [`model_providers.${engine}.env_key`]: 'MINIMAX_API_KEY',
      [`model_providers.${engine}.base_url`]: `${this.adapterUrl()}/providers/${providerId}/v1`,
    };
  }
  async migrate(rpc, { threadId, providerId, model }) {
    if (typeof threadId !== 'string' || !threadId || typeof providerId !== 'string' || !providerId) throw Error('会话和目标渠道不能为空');
    if (model !== undefined && (typeof model !== 'string' || !model.trim())) throw Error('目标模型无效');
    if (this.migrating.has(threadId) || this.inflight.get(threadId)) throw Error('会话操作尚未完成，请稍后切换渠道');
    const target = this.provider(providerId);
    const previous = this.get(threadId);
    if (!previous) throw Error('请先恢复会话再切换渠道');
    const previousEngine = this.engine(threadId);
    const engine = `felix_${target.id}`;
    this.migrating.add(threadId);
    let detached = false;
    let previousModel;
    try {
      const current = await rpc.request('thread/read', { threadId, includeTurns: false });
      if (!['idle', 'notLoaded'].includes(current.thread?.status?.type)) throw Error('会话正在运行，完成后才能切换渠道');
      const snapshot = await rpc.request('thread/resume', { threadId, excludeTurns: true, ...(this.bindings[threadId]?.model ? { model: this.bindings[threadId].model } : {}), modelProvider: previousEngine, config: this.config(previous, previousEngine) });
      previousModel = snapshot.model;
      if (snapshot.thread?.id !== threadId || typeof previousModel !== 'string' || !previousModel) throw Error('无法读取当前会话模型');
      await rpc.request('thread/unsubscribe', { threadId });
      detached = true;
      const result = await rpc.request('thread/resume', { threadId, excludeTurns: true, ...(model ? { model } : {}), modelProvider: engine, config: this.config(target.id, engine) });
      if (result.thread?.id !== threadId || result.modelProvider !== engine || model && result.model !== model) throw Error('引擎未应用目标渠道或模型');
      this.save(threadId, target.id, engine, result.model);
      this.failedMigrations.delete(threadId);
      return { ...result, providerId: target.id };
    } catch (error) {
      if (detached) {
        try {
          await rpc.request('thread/unsubscribe', { threadId });
          const restored = await rpc.request('thread/resume', { threadId, excludeTurns: true, model: previousModel, modelProvider: previousEngine, config: this.config(previous, previousEngine) });
          if (restored.thread?.id !== threadId || restored.modelProvider !== previousEngine || restored.model !== previousModel) throw Error('旧渠道恢复未确认');
        } catch (restoreError) {
          this.failedMigrations.add(threadId);
          throw Error(`${error.message}；恢复旧渠道失败：${restoreError.message}。请重启服务后重试。`);
        }
      }
      throw error;
    } finally { this.migrating.delete(threadId); }
  }
  async request(rpc, method, params = {}) {
    if (this.rpc !== rpc) { this.rpc = rpc; this.failedMigrations.clear(); }
    if (method === 'felix/thread/provider') return this.migrate(rpc, params);
    const id = params.threadId;
    if (this.migrating.has(id)) throw Error('正在切换会话渠道，请稍后重试');
    if (this.failedMigrations.has(id)) throw Error('会话渠道状态未确认，请重启服务后重试');
    this.inflight.set(id, (this.inflight.get(id) || 0) + 1);
    try { return await this.route(rpc, method, params); }
    finally { const count = this.inflight.get(id) - 1; if (count) this.inflight.set(id, count); else this.inflight.delete(id); }
  }
  async route(rpc, method, params) {
    if (!['thread/start', 'thread/resume', 'thread/fork', 'turn/start'].includes(method)) return rpc.request(method, params);
    const stored = this.get(params.threadId) || params.providerId;
    const provider = this.provider(stored);
    const engine = this.engine(params.threadId);
    const routed = { ...params, modelProvider: engine };
    delete routed.providerId;
    if (method !== 'turn/start') {
      if (!routed.model && this.bindings[params.threadId]?.model) routed.model = this.bindings[params.threadId].model;
      routed.config = { ...params.config, ...this.config(provider.id, engine) };
    }
    const result = await rpc.request(method, routed);
    if (method !== 'turn/start' && result.thread?.id) {
      this.save(result.thread.id, provider.id, engine, result.model);
      return { ...result, providerId: provider.id };
    }
    return result;
  }
}
module.exports = { ThreadProviderRouter };

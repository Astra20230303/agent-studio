const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const KEYS = ['codex-desktop-state-v1', 'felix-thread-drafts-v1', 'felix-attachments-v1', 'felix-plugin-drafts-v1', 'felix-skill-drafts-v1', 'felix-turn-queue-v1'];
const QUEUE_KEY = 'felix-turn-queue-v1';
const MAX_BYTES = 64 * 1024 * 1024;

function validate(key, value) {
  if (!KEYS.includes(key)) throw Error('Unknown storage key');
  if (typeof value !== 'string' || Buffer.byteLength(value) > MAX_BYTES) throw Error('Invalid or oversized storage value');
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) !== (key === QUEUE_KEY)) throw Error('Invalid storage data');
  if (key === KEYS[0]) {
    if (!Array.isArray(parsed.threads) || !Array.isArray(parsed.projects) || !parsed.threads.every(thread => thread && typeof thread.id === 'string' && typeof thread.title === 'string' && Array.isArray(thread.messages) && thread.messages.every(message => message && typeof message.id === 'string' && typeof message.content === 'string'))) throw Error('Invalid conversation data');
  } else if (key === QUEUE_KEY) {
    if (!parsed.every(item => item && ['id', 'localId', 'threadId', 'text', 'model', 'effort'].every(field => typeof item[field] === 'string') && Array.isArray(item.plugins))) throw Error('Invalid queue data');
  } else {
    const validEntry = key === KEYS[1] ? entry => typeof entry === 'string'
      : key === KEYS[2] ? entry => Array.isArray(entry) && entry.every(item => typeof item === 'string')
      : key === KEYS[3] ? entry => Array.isArray(entry) && entry.every(item => item && typeof item.id === 'string' && !!item.id && typeof item.name === 'string')
      : entry => Array.isArray(entry) && entry.every(item => item && typeof item.name === 'string' && typeof item.path === 'string');
    if (!Object.values(parsed).every(validEntry)) throw Error('Invalid draft data');
  }
}
function encode(key, value) { return JSON.stringify({ version: 1, key, value }); }
function decode(file, key) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (data.version !== 1 || data.key !== key) throw Error('Unsupported storage format');
  validate(key, data.value);
  return data.value;
}
async function atomicWrite(file, data) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await fs.promises.open(temporary, 'wx', 0o600);
    await handle.writeFile(data, 'utf8'); await handle.sync(); await handle.close(); handle = undefined;
    await fs.promises.rename(temporary, file);
  } finally {
    if (handle) await handle.close();
    await fs.promises.rm(temporary, { force: true });
  }
}
function atomicWriteSync(file, data) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(fd, data, 'utf8'); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    fs.renameSync(temporary, file);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    fs.rmSync(temporary, { force: true });
  }
}

class RendererStorage {
  constructor(directory) { this.directory = directory; this.values = undefined; this.recovered = []; this.pending = new Map(); this.running = new Map(); }
  file(key) { return path.join(this.directory, `${key}.json`); }
  read() {
    if (!this.values) {
      const values = {}, recovered = [];
      for (const key of KEYS) {
        const file = this.file(key);
        if (!fs.existsSync(file) && !fs.existsSync(file + '.bak')) { values[key] = null; continue; }
        try { values[key] = decode(file, key); }
        catch (error) {
          try { values[key] = decode(file + '.bak', key); recovered.push(key); }
          catch { throw Error(`无法读取 ${key}，原文件已保留：${error.message}`); }
        }
      }
      this.values = values; this.recovered = recovered;
    }
    return { values: { ...this.values }, recovered: [...this.recovered] };
  }
  async write(key, value) {
    validate(key, value); this.read();
    if (key === QUEUE_KEY) throw Error('Queue writes require a synchronous acknowledgement');
    return new Promise((resolve, reject) => {
      const entry = this.pending.get(key) || { waiters: [] };
      entry.value = value; entry.waiters.push({ resolve, reject }); this.pending.set(key, entry);
      this.start(key);
    });
  }
  start(key) {
    if (this.running.has(key) || !this.pending.has(key)) return;
    const task = Promise.resolve().then(() => this.drain(key)).finally(() => { this.running.delete(key); this.start(key); });
    this.running.set(key, task);
  }
  async drain(key) {
    while (this.pending.has(key)) {
      const entry = this.pending.get(key); this.pending.delete(key);
      try {
        if (this.values[key] !== entry.value || this.recovered.includes(key)) {
          await fs.promises.mkdir(this.directory, { recursive: true });
          if (this.values[key] !== null) await atomicWrite(this.file(key) + '.bak', encode(key, this.values[key]));
          await atomicWrite(this.file(key), encode(key, entry.value));
          this.values[key] = entry.value; this.recovered = this.recovered.filter(item => item !== key);
        }
        entry.waiters.forEach(waiter => waiter.resolve());
      } catch (error) { entry.waiters.forEach(waiter => waiter.reject(error)); }
    }
  }
  writeQueue(value) {
    validate(QUEUE_KEY, value); this.read();
    if (this.values[QUEUE_KEY] === value && !this.recovered.includes(QUEUE_KEY)) return;
    fs.mkdirSync(this.directory, { recursive: true });
    if (this.values[QUEUE_KEY] !== null) atomicWriteSync(this.file(QUEUE_KEY) + '.bak', encode(QUEUE_KEY, this.values[QUEUE_KEY]));
    atomicWriteSync(this.file(QUEUE_KEY), encode(QUEUE_KEY, value));
    this.values[QUEUE_KEY] = value; this.recovered = this.recovered.filter(key => key !== QUEUE_KEY);
  }
  async importLegacy(entries) {
    this.read();
    const candidates = KEYS.filter(key => this.values[key] === null && entries?.[key] != null).map(key => [key, entries[key]]);
    // Validate the complete import before persisting any of its records.
    for (const [key, value] of candidates) {
      try { validate(key, value); }
      catch (error) { throw Error(`无法迁移 ${key}，旧数据已保留：${error.message}`); }
    }
    for (const [key, value] of candidates) {
      if (this.values[key] !== null) continue;
      if (key === QUEUE_KEY) this.writeQueue(value);
      else await this.write(key, value);
    }
    return this.read();
  }
  async flush() { while (this.running.size) await Promise.all([...this.running.values()]); }
}

function registerRendererStorage(ipcMain, directory) {
  const store = new RendererStorage(directory);
  ipcMain.handle('storage:read', async () => { try { await store.flush(); return { ok: true, ...store.read() }; } catch (error) { return { ok: false, error: error.message }; } });
  ipcMain.handle('storage:import', async (_event, entries) => { try { return { ok: true, ...await store.importLegacy(entries) }; } catch (error) { return { ok: false, error: error.message }; } });
  ipcMain.handle('storage:write', async (_event, { key, value }) => { try { await store.write(key, value); return { ok: true }; } catch (error) { return { ok: false, error: error.message }; } });
  ipcMain.on('storage:queue', (event, value) => { try { store.writeQueue(value); event.returnValue = { ok: true }; } catch (error) { event.returnValue = { ok: false, error: error.message }; } });
  return store;
}
module.exports = { RendererStorage, registerRendererStorage, KEYS, QUEUE_KEY };

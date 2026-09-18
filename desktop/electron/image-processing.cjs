const path = require('node:path');
const { Worker } = require('node:worker_threads');

class ImageProcessing {
  constructor({ dataRoot, timeoutMs = 15000, maxPending = 8, workerFile = path.join(__dirname, 'image-worker.cjs') }) {
    this.dataRoot = dataRoot; this.timeoutMs = timeoutMs; this.maxPending = maxPending; this.workerFile = workerFile;
    this.queue = []; this.active = undefined; this.closed = false;
  }
  validate(method, params) {
    if (!['turn/start', 'turn/steer'].includes(method) || !Array.isArray(params?.input)) return Promise.resolve();
    const paths = params.input.filter(item => item?.type === 'localImage').map(item => item.path);
    return paths.length ? this.submit({ type: 'validate', paths }) : Promise.resolve();
  }
  savePaste(bytes) {
    if (!(bytes instanceof Uint8Array)) return Promise.reject(Error('剪贴板图片数据无效'));
    if (bytes.byteLength > 16 * 1024 * 1024) return Promise.reject(Error('PNG 超过 16 MB，请缩小图片'));
    return this.submit({ type: 'paste', dataRoot: this.dataRoot, bytes });
  }
  submit(data) {
    if (this.closed) return Promise.reject(Error('图片处理服务已关闭'));
    if (this.queue.length + Number(Boolean(this.active)) >= this.maxPending) return Promise.reject(Error('图片处理任务过多，请稍后重试'));
    return new Promise((resolve, reject) => { this.queue.push({ data, resolve, reject }); this.start(); });
  }
  start() {
    if (this.closed || this.active || !this.queue.length) return;
    const task = this.queue.shift();
    let worker;
    try { worker = new Worker(this.workerFile, { workerData: task.data, resourceLimits: { maxOldGenerationSizeMb: 192 } }); }
    catch (error) { task.reject(error); this.start(); return; }
    let reply, failure;
    const finished = new Promise(resolve => {
      const timer = setTimeout(() => { failure = Error('图片处理超时，请缩小图片后重试'); void worker.terminate(); }, this.timeoutMs);
      worker.on('message', message => { reply = message; });
      worker.on('error', error => { failure = error; });
      worker.on('exit', code => {
        clearTimeout(timer);
        if (this.closed) task.reject(Error('图片处理已取消'));
        else if (failure) task.reject(failure);
        else if (code !== 0 || !reply) task.reject(Error('图片处理线程异常退出，请重试'));
        else if (!reply.ok) task.reject(Error(reply.error || '图片处理失败'));
        else task.resolve(reply.result);
        this.active = undefined; resolve(); this.start();
      });
    });
    this.active = { worker, finished };
  }
  async close() {
    this.closed = true;
    for (const task of this.queue.splice(0)) task.reject(Error('图片处理已取消'));
    if (this.active) { const active = this.active; await active.worker.terminate(); await active.finished; }
  }
}
module.exports = { ImageProcessing };

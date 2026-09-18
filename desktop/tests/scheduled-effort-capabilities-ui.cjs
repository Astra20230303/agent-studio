const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { TaskScheduler } = require('../electron/task-scheduler.cjs');

async function main() {
  const root = path.resolve(__dirname, '../..');
  const dist = path.join(root, 'desktop/dist');
  const artifacts = path.join(root, '.project-cache/ui-checks');
  fs.mkdirSync(artifacts, { recursive: true });
  const directory = fs.mkdtempSync(path.join(root, '.project-cache/tmp/tasks-ui-'));
  let clock = Date.now(), failList = false, failDetail = false, badList = false, badDetail = false, browser;
  const runner = async (task, { signal, onProgress }) => {
    if (task.prompt === 'FAIL') throw new Error('TEST_MODEL_FAILURE');
    if (task.prompt === 'WAIT') onProgress('LIVE_TASK_PROGRESS');
    if (task.prompt === 'WAIT') await new Promise((resolve, reject) => {
      if (signal.aborted) reject(new Error('Cancelled'));
      else signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true });
    });
    return { output: `真实持久化结果：${task.prompt}` };
  };
  let scheduler = new TaskScheduler({ directory, runner, now: () => clock });
  const sample = scheduler.save({ name: '每日工作区检查', prompt: '检查今天的待办事项', kind: 'agent', model: 'MiniMax-Test', reasoningEffort: 'xhigh', permission: 'read-only', notify: true, schedule: { kind: 'daily', time: '05:00', timezone: 'Asia/Shanghai' } });
  const server = http.createServer((req, res) => {
    const filename = path.resolve(dist, '.' + (req.url === '/' ? '/index.html' : req.url));
    if (!filename.startsWith(dist + path.sep) || !fs.existsSync(filename)) { res.writeHead(404); res.end(); return; }
    res.setHeader('content-type', filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.css') ? 'text/css' : 'text/html');
    fs.createReadStream(filename).pipe(res);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, timezoneId: 'Asia/Shanghai' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.exposeFunction('taskOperation', async (operation, args) => {
      try {
        if (operation === 'listTasks') { if (failList) throw new Error('TEST_LIST_FAILURE'); return { ok: true, tasks: badList ? [...scheduler.list(), {id:'broken',runs:null}] : scheduler.list() }; }
        if (operation === 'taskDetail') { if (failDetail) throw new Error('TEST_DETAIL_FAILURE'); return { ok: true, task: badDetail ? {...scheduler.detail(args[0]), id:'wrong-task'} : scheduler.detail(args[0]) }; }
        if (operation === 'saveTask') return { ok: true, task: scheduler.save(args[0]) };
        if (operation === 'setTaskStatus') scheduler.setStatus(...args);
        if (operation === 'deleteTask') scheduler.remove(args[0]);
        if (operation === 'runTask') void scheduler.run(args[0]);
        if (operation === 'cancelTask') scheduler.cancel(args[0]);
        return { ok: true };
      } catch (error) { return { ok: false, error: error.message }; }
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.__copied = text; } } });
      window.desktop = { listModels: async () => ({ ok: true, models: ['MiniMax-Test', 'Default-Only'], effortCapabilities: [{model:'MiniMax-Test',values:['low','high']},{model:'Default-Only',values:[]}] }), providerStatus: async () => ({ keyConfigured: true }), getProjectRoot: async () => 'D:\\Workspace2026\\my-agent-plantform' };
      for (const method of ['listTasks', 'saveTask', 'setTaskStatus', 'runTask', 'cancelTask', 'deleteTask', 'taskDetail']) window.desktop[method] = (...args) => window.taskOperation(method, args);
      window.desktop.onTasksChanged = listener => { window.__taskChanged = listener; return () => { window.__taskChanged = null; }; };
      window.desktop.saveTaskOutput = async input => { window.__exported = input; return window.__exportFail ? { ok: false, error: 'TEST_EXPORT_FAILURE' } : { ok: true, canceled: !!window.__exportCancel }; };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => {}, request: async () => ({ ok: true, result: { data: [] } }), onNotification: () => () => {}, onServerRequest: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onClosed: () => () => {} };
    });
    const changed = () => page.evaluate(() => window.__taskChanged?.());
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('button', { name: '已安排', exact: true }).click();
    await page.getByRole('button', { name: '查看任务 每日工作区检查' }).waitFor();
    const openEditor = async () => {
      await page.getByRole('button', { name: '查看任务 每日工作区检查' }).click();
      await page.getByRole('dialog').getByRole('button', { name: '编辑', exact: true }).click();
    };
    await openEditor();
    const editor = page.getByRole('dialog', { name: '编辑任务', exact: true });
    const effort = editor.getByRole('combobox', { name: '任务推理强度', exact: true });
    const save = editor.getByRole('button', { name: '保存任务', exact: true });
    await editor.getByText(/当前强度不在此模型声明/).waitFor();
    assert.equal(await effort.inputValue(), 'xhigh');
    assert.equal(await save.isDisabled(), true);
    assert.equal(scheduler.detail(sample.id).reasoningEffort, 'xhigh');
    assert.deepEqual(await effort.locator('option:not([disabled])').evaluateAll(nodes => nodes.map(node => node.value)), ['', 'low','high']);
    await effort.selectOption('high');
    assert.equal(await save.isEnabled(), true);
    await editor.getByLabel('任务模型', { exact: true }).selectOption('Default-Only');
    await editor.getByText(/当前强度不在此模型声明/).waitFor();
    assert.equal(await effort.inputValue(), 'high');
    assert.equal(await save.isDisabled(), true);
    await effort.selectOption('');
    await save.click(); await editor.waitFor({state:'detached'});
    assert.equal(scheduler.detail(sample.id).reasoningEffort, undefined);
    assert.equal(scheduler.detail(sample.id).model, 'Default-Only');
    await page.getByRole('dialog').getByRole('button', { name: '编辑', exact: true }).click();
    assert.equal(await effort.inputValue(), '');
    assert.deepEqual(errors, []);
    console.log('PASS: scheduled effort choices follow model declarations, preserve invalid old values, and save an explicit default correction');
  } finally { await scheduler.stop(); if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

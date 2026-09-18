const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

(async () => {
  const root = path.resolve(__dirname, '../..');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-data-electron-'));
  const install = path.join(scratch, 'install');
  const desktop = path.join(install, 'desktop');
  const dataRoot = path.join(scratch, 'external profile');
  fs.cpSync(path.join(root, 'desktop/electron'), path.join(desktop, 'electron'), { recursive: true });
  fs.cpSync(path.join(root, 'desktop/dist'), path.join(desktop, 'dist'), { recursive: true });
  fs.symlinkSync(path.join(root, 'desktop/node_modules'), path.join(desktop, 'node_modules'), 'junction');
  const env = { ...process.env, FELIX_DATA_DIR: dataRoot };
  for (const key of ['ELECTRON_RUN_AS_NODE', 'CODEX_APP_SERVER_COMMAND', 'VITE_DEV_SERVER_URL', 'MINIMAX_API_KEY']) delete env[key];
  let app;
  const launch = () => electron.launch({ executablePath: require('electron'), args: [path.join(desktop, 'electron/main.cjs')], env, timeout: 20000 });
  try {
    app = await launch();
    let page = await app.firstWindow();
    assert.equal(await app.evaluate(({ app }) => app.getPath('userData')), path.join(dataRoot, 'electron-user-data'));
    await page.waitForFunction(() => window.desktop?.saveTask);
    await page.locator('.composer').waitFor();
    const brokenJpeg = path.join(scratch, 'broken.jpg'); fs.writeFileSync(brokenJpeg, 'not a JPEG');
    for (const method of ['turn/start', 'turn/steer']) {
      const rejected = await page.evaluate(({ method, file }) => window.codex.request(method, { threadId: 'invalid-thread', input: [{ type: 'localImage', path: file }] }), { method, file: brokenJpeg });
      assert.equal(rejected.ok, false);
      assert.match(rejected.error.message, /图片附件无法读取或解码：broken.jpg/);
    }
    const largeFrame = require('jpeg-js').encode({ width: 4, height: 4, data: Buffer.alloc(64, 255) }, 90).data;
    const frame = largeFrame.indexOf(Buffer.from([0xff, 0xc0]));
    assert.ok(frame > 0);
    largeFrame.writeUInt16BE(4000, frame + 5); largeFrame.writeUInt16BE(4000, frame + 7);
    fs.writeFileSync(brokenJpeg, largeFrame);
    const concurrent = await page.evaluate(async file => {
      let completed = 0;
      const jobs = Array.from({ length: 2 }, () => window.codex.request('turn/start', { threadId: 'invalid-thread', input: [{ type: 'localImage', path: file }] }).then(result => { completed++; return result; }));
      await new Promise(resolve => setTimeout(resolve, 20));
      await window.desktop.windowState();
      const completedAtWindowReply = completed;
      return { completedAtWindowReply, results: await Promise.all(jobs) };
    }, brokenJpeg);
    assert.ok(concurrent.completedAtWindowReply < 2, 'window IPC must respond while image validation is pending');
    assert.ok(concurrent.results.every(result => !result.ok && /maxMemoryUsageInMB/.test(result.error.message)));
    const attachment = path.join(scratch, 'dropped file.txt'); fs.writeFileSync(attachment, 'real attachment');
    await page.evaluate(() => { const input = document.createElement('input'); input.type = 'file'; input.id = 'drop-fixture'; document.body.append(input); });
    await page.locator('#drop-fixture').setInputFiles(attachment);
    const resolved = await page.evaluate(() => {
      const file = document.querySelector('#drop-fixture').files[0];
      const paths = window.desktop.droppedFilePaths([file]);
      const dataTransfer = new DataTransfer(); dataTransfer.items.add(file);
      document.querySelector('.composer').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
      return paths;
    });
    assert.deepEqual(resolved, [attachment]);
    await page.getByRole('button', { name: `移除附件：${attachment}`, exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.desktop.droppedFilePaths([new File(['virtual'], 'virtual.txt')])), ['']);
    await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 4; canvas.height = 4;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const data = new DataTransfer(); data.items.add(new File([blob], 'clipboard.png', { type: 'image/png' }));
      document.querySelector('.composer textarea').dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
    });
    const pastedChip = page.getByRole('button', { name: /移除附件：.*clipboard-.*\.png/ });
    await pastedChip.waitFor();
    const pasted = (await pastedChip.getAttribute('aria-label')).replace('移除附件：', '');
    const persistedAttachments = await page.evaluate(async () => JSON.parse((await window.desktop.storage.read()).values['felix-attachments-v1']).new);
    assert.ok(persistedAttachments.includes(pasted));
    assert.equal(path.dirname(pasted), path.join(dataRoot, 'attachments'));
    assert.deepEqual([...fs.readFileSync(pasted).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    const saved = await page.evaluate(async () => {
      localStorage.setItem('felix-data-test', 'persisted');
      return window.desktop.saveTask({ name: 'External profile task', prompt: 'Persist this reminder', kind: 'reminder', model: '', permission: 'read-only', notify: false, schedule: { kind: 'once', at: new Date(Date.now() + 86400000).toISOString() } });
    });
    assert.equal(saved.ok, true);
    await app.close(); app = undefined;
    assert.ok(fs.existsSync(path.join(dataRoot, 'scheduled-tasks')));
    assert.equal(fs.existsSync(path.join(install, '.project-cache')), false);
    app = await launch(); page = await app.firstWindow();
    await page.waitForFunction(() => window.desktop?.taskDetail);
    assert.equal(await page.evaluate(() => localStorage.getItem('felix-data-test')), 'persisted');
    assert.ok(fs.existsSync(pasted));
    await page.getByRole('button', { name: `移除附件：${pasted}`, exact: true }).waitFor();
    const restored = await page.evaluate(id => window.desktop.taskDetail(id), saved.task.id);
    assert.equal(restored.task.name, 'External profile task');
    assert.equal(restored.task.runs.length, 0);
    const taskResources = [];
    page.on('request', request => taskResources.push(request.url()));
    await page.getByRole('button', { name: '已安排', exact: true }).click();
    await page.getByText('External profile task', { exact: true }).waitFor();
    assert.ok(taskResources.some(url => /ScheduledPage-.*\.js/.test(url)), 'native file URL loads the deferred page');
    assert.ok(await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].some(link => /ScheduledPage-.*\.css/.test(link.href))), 'deferred page stylesheet is installed');
    assert.equal(fs.existsSync(path.join(install, '.project-cache')), false);
    console.log('PASS: real Electron external profile, reminder persistence and restart without installation data writes');
  } finally {
    if (app) await app.close();
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

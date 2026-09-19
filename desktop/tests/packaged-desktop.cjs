const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

(async () => {
  const source = path.resolve(process.argv[2] || path.join(__dirname, '../../.project-cache/felix-desktop'));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-packaged-'));
  const directory = path.join(profile, 'relocated app');
  fs.cpSync(source, directory, { recursive: true, dereference: true });
  const env = { ...process.env, FELIX_DATA_DIR: profile };
  for (const key of ['ELECTRON_RUN_AS_NODE', 'FELIX_RUNTIME_DIR', 'CODEX_APP_SERVER_COMMAND', 'VITE_DEV_SERVER_URL', 'MINIMAX_API_KEY', 'NODE_PATH']) delete env[key];
  let app;
  try {
    app = await electron.launch({ executablePath: path.join(directory, 'Felix.exe'), args: [], cwd: profile, env, timeout: 30000 });
    const page = await app.firstWindow(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    assert.equal(await app.evaluate(({ app }) => app.isPackaged), true);
    await page.getByRole('button', { name: '已安排', exact: true }).waitFor();
    const connected = await page.evaluate(() => window.codex.connect());
    assert.equal(connected.ok, true, JSON.stringify(connected));
    const models = await page.evaluate(() => window.codex.request('model/list', {}));
    assert.equal(models.ok, true); assert.ok(models.result.data.length);
    const images = [];
    for (const format of ['webp', 'gif']) {
      const file = path.join(profile, `packaged.${format}`);
      await require('sharp')({ create: { width: 8, height: 8, channels: 4, background: '#ff0000' } }).toFormat(format).toFile(file);
      images.push(file);
    }
    const checked = await page.evaluate(images => window.codex.request('turn/start', { threadId: 'missing', input: images.map(path => ({ type: 'localImage', path })) }), images);
    assert.equal(checked.ok, false);
    assert.match(checked.error.message, /此会话渠道未配置 API Key/, 'valid images must pass packaged decoding and reach Provider validation');
    for (const file of images) {
      fs.writeFileSync(file, 'corrupt image');
      const rejected = await page.evaluate(file => window.codex.request('turn/start', { threadId: 'missing', input: [{ type: 'localImage', path: file }] }), file);
      assert.equal(rejected.ok, false);
      assert.match(rejected.error.message, /图片附件无法读取或解码/);
    }
    await page.evaluate(async cwd => {
      window.__terminalOutput = '';
      window.desktop.terminal.onData(event => { window.__terminalOutput += event.data || ''; });
      const result = await window.desktop.terminal.create(cwd);
      if (!result.ok) throw Error(result.error);
      window.__terminalId = result.id;
      await window.desktop.terminal.write(result.id, "Write-Output ('PACKAGED_' + 'PTY_OK')\r");
    }, profile);
    await page.waitForFunction(() => window.__terminalOutput.includes('PACKAGED_PTY_OK'));
    await page.evaluate(() => window.desktop.terminal.close(window.__terminalId));
    const saved = await page.evaluate(() => window.desktop.saveTask({ name: 'Packaged reminder', prompt: 'Restore packaged task', kind: 'reminder', model: '', permission: 'read-only', notify: false, schedule: { kind: 'once', at: new Date(Date.now() + 86400000).toISOString() } }));
    assert.equal(saved.ok, true);
    const preview = await page.evaluate(() => window.desktop.previewTaskSchedule({kind:'monthly',monthDay:31,time:'09:00',timezone:'UTC'}));
    assert.equal(preview.ok,true);assert.equal(preview.times.length,3);
    assert.ok(preview.times.every(time=>new Date(time).getUTCDate()===31));
    const licenses=JSON.parse(fs.readFileSync(path.join(directory,'resources/app/dist/third-party-licenses.json'),'utf8'));
    assert.ok(licenses.components.some(component=>component.name==='url-template' && component.notices.length));
    await page.getByRole('button',{name:'已安排',exact:true}).click();
    await page.getByRole('button',{name:'创建',exact:true}).click();
    await page.getByRole('menuitem',{name:'提醒',exact:true}).click();
    const editor=page.getByRole('dialog',{name:'创建任务',exact:true});
    await editor.getByLabel('任务名称',{exact:true}).fill('Packaged draft');
    await editor.getByRole('textbox',{name:'任务内容',exact:true}).fill('Persist outside installation');
    await editor.getByLabel('频率').selectOption('customWeek');
    await editor.getByRole('checkbox',{name:'运行日 星期三',exact:true}).uncheck();
    await editor.getByRole('button',{name:'保留草稿并返回列表',exact:true}).click();
    await editor.waitFor({state:'detached'});
    assert.deepEqual(errors, []);
    await app.close(); app = undefined;
    app = await electron.launch({ executablePath: path.join(directory, 'Felix.exe'), args: [], cwd: profile, env, timeout: 30000 });
    const restarted = await app.firstWindow();
    await restarted.waitForFunction(() => window.desktop?.taskDetail);
    const restored = await restarted.evaluate(id => window.desktop.taskDetail(id), saved.task.id);
    assert.equal(restored.task.name, 'Packaged reminder');
    assert.equal(restored.task.runs.length, 0);
    await restarted.getByRole('button',{name:'已安排',exact:true}).click();
    const draft=restarted.getByRole('dialog',{name:'创建任务',exact:true});
    assert.equal(await draft.getByLabel('任务名称',{exact:true}).inputValue(),'Packaged draft');
    assert.equal(await draft.getByRole('textbox',{name:'任务内容',exact:true}).inputValue(),'Persist outside installation');
    assert.equal(await draft.getByRole('checkbox',{name:'运行日 星期一',exact:true}).isChecked(),true);
    assert.equal(await draft.getByRole('checkbox',{name:'运行日 星期三',exact:true}).isChecked(),false);
    assert.equal(await draft.getByRole('checkbox',{name:'运行日 星期五',exact:true}).isChecked(),true);
    assert.equal((await restarted.evaluate(()=>window.desktop.listTasks())).tasks.length,1);
    await draft.getByRole('button',{name:'取消',exact:true}).click();
    await draft.getByRole('button',{name:'放弃修改',exact:true}).click();await draft.waitFor({state:'detached'});
    console.log('PASS: relocated package includes URI template notices, monthly preview and native multi-day draft persistence');
    assert.equal(fs.existsSync(path.join(directory, 'resources/.project-cache')), false);
    console.log('PASS: relocated packaged UI, native WebP/GIF worker, bundled app-server, native terminal and reminder restart');
  } catch (error) { console.error(error); throw error; }
  finally { if (app) await app.close(); fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
})().catch(error => { console.error(error); process.exitCode = 1; });

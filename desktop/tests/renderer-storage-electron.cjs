const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

(async () => {
  const root = path.resolve(__dirname, '../..');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-renderer-storage-'));
  const desktop = path.join(scratch, 'install', 'desktop');
  const profile = path.join(scratch, 'profile');
  const native = path.join(profile, 'renderer-storage');
  fs.cpSync(path.join(root, 'desktop/electron'), path.join(desktop, 'electron'), { recursive: true });
  fs.cpSync(path.join(root, 'desktop/dist'), path.join(desktop, 'dist'), { recursive: true });
  fs.symlinkSync(path.join(root, 'desktop/node_modules'), path.join(desktop, 'node_modules'), 'junction');
  const env = { ...process.env, FELIX_DATA_DIR: profile };
  for (const key of ['ELECTRON_RUN_AS_NODE', 'CODEX_APP_SERVER_COMMAND', 'VITE_DEV_SERVER_URL', 'MINIMAX_API_KEY']) delete env[key];
  let app;
  const launch = async () => {
    app = await electron.launch({ executablePath: require('electron'), args: [path.join(desktop, 'electron/main.cjs')], env, timeout: 20000 });
    const page = await app.firstWindow();
    await page.getByRole('textbox', { name: '消息', exact: true }).waitFor();
    return page;
  };
  const read = page => page.evaluate(async () => (await window.desktop.storage.read()).values);
  try {
    let page = await launch();
    await read(page);
    await page.evaluate(() => {
      const state = { model: 'test', activeThreadId: 'legacy', threads: [{ id: 'legacy', title: 'Legacy conversation', messages: [{ id: 'm', role: 'user', content: 'Retained history', createdAt: new Date().toISOString() }], status: 'completed', pinned: false, archived: false, updatedAt: new Date().toISOString() }], projects: [], automations: [] };
      const values = {
        'codex-desktop-state-v1': state,
        'felix-thread-drafts-v1': { legacy: 'Migrated draft' },
        'felix-attachments-v1': { legacy: ['D:/legacy.txt'] },
        'felix-plugin-drafts-v1': { legacy: [{ id: 'fixture', name: 'Saved plugin' }] },
        'felix-skill-drafts-v1': { legacy: [{ name: 'Saved skill', path: 'D:/skill/SKILL.md' }] },
        'felix-turn-queue-v1': [{ id: 'queued', localId: 'legacy', threadId: 'remote', text: 'Keep queued', model: 'test', effort: 'low', plugins: [], status: 'ready' }],
      };
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    });
    await app.close(); app = undefined;
    // Only remove the empty native store created by this fixture to emulate an upgrade.
    assert.ok(native.startsWith(scratch + path.sep));
    fs.rmSync(native, { recursive: true, force: true });
    page = await launch();
    assert.equal(await page.getByRole('textbox', { name: '消息', exact: true }).inputValue(), 'Migrated draft');
    await page.getByText('Retained history', { exact: true }).waitFor();
    await page.getByRole('button', { name: '移除附件：D:/legacy.txt', exact: true }).waitFor();
    const migrated = await read(page);
    assert.equal(JSON.parse(migrated['felix-plugin-drafts-v1']).legacy[0].id, 'fixture');
    assert.equal(JSON.parse(migrated['felix-skill-drafts-v1']).legacy[0].name, 'Saved skill');
    assert.equal(JSON.parse(migrated['felix-turn-queue-v1'])[0].text, 'Keep queued');
    const editor = page.getByRole('textbox', { name: '消息', exact: true });
    for (const text of ['Native draft', 'Latest native draft']) {
      await editor.fill(text);
      await page.waitForFunction(async expected => JSON.parse((await window.desktop.storage.read()).values['felix-thread-drafts-v1']).legacy === expected, text);
    }
    await page.evaluate(() => localStorage.clear());
    await app.close(); app = undefined;
    page = await launch();
    assert.equal(await page.getByRole('textbox', { name: '消息', exact: true }).inputValue(), 'Latest native draft');
    await page.getByText('Retained history', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await app.close(); app = undefined;
    const file = path.join(native, 'felix-thread-drafts-v1.json');
    const backup = JSON.parse(JSON.parse(fs.readFileSync(file + '.bak', 'utf8')).value).legacy;
    fs.writeFileSync(file, '{broken');
    page = await launch();
    await page.getByText('本机数据已从上一份有效备份恢复，最近一次更改可能缺失。', { exact: false }).waitFor();
    assert.equal(await page.getByRole('textbox', { name: '消息', exact: true }).inputValue(), backup);
    await read(page);
    assert.equal(JSON.parse(JSON.parse(fs.readFileSync(file, 'utf8')).value).legacy, backup);
    console.log('PASS: real Electron migrates all six stores, survives cleared localStorage, restores history/drafts after restart, and recovers a corrupt file visibly');
  } finally {
    if (app) await app.close();
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

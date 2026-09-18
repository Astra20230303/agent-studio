const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { workspaceFile } = require('../electron/workspace-files.cjs');
(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-editor-compare-'));
  const target = path.join(root, 'file.txt');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const writes = [];
  try {
    await fs.writeFile(target, 'original\r\n中文');
    const page = await browser.newPage();
    await page.exposeFunction('nativeFile', async input => {
      assert.equal(input.root, root);
      if (input.action === 'write') writes.push(input.edit);
      try { return { ok: true, result: await workspaceFile(input.root, input.path, input.action, '', input.edit) }; }
      catch (error) { return { ok: false, error: error.message }; }
    });
    await page.addInitScript(root => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', name: 'P', path: root, git: {} }], threads: [] }));
      window.desktop = { workspaceFile: input => window.nativeFile(input), listModels: async () => ({ ok: true, models: ['test'] }) };
    }, root);
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '浏览工作区文件', exact: true }).click();
    await page.getByRole('button', { name: '▧ file.txt', exact: true }).click();
    await page.getByRole('button', { name: '编辑文件', exact: true }).click();
    const editor = page.getByRole('textbox', { name: '文件内容', exact: true });
    const inspect = page.getByRole('button', { name: '查看磁盘版本', exact: true });
    const compare = page.getByRole('region', { name: '磁盘版本对照' });
    await editor.fill('draft\n中文');
    await inspect.click();
    await page.getByText('磁盘版本与编辑起点一致。', { exact: true }).waitFor();
    await fs.writeFile(target, 'external\n中文');
    await inspect.click();
    await page.getByText('磁盘文件已改变，保存仍会检查编辑起点版本。', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('磁盘快照内容', { exact: true }).textContent(), 'external\n中文');
    assert.equal(await page.getByLabel('编辑起点内容', { exact: true }).textContent(), 'original\r\n中文');
    assert.equal(await editor.inputValue(), 'draft\n中文');
    await editor.press('Control+z');
    assert.equal(await editor.inputValue(), 'original\n中文');
    await editor.press('Control+y');
    assert.equal(await editor.inputValue(), 'draft\n中文');
    assert.equal(writes.length, 0);
    await page.getByRole('button', { name: '保存文件', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '外部修改' }).waitFor();
    assert.equal(await fs.readFile(target, 'utf8'), 'external\n中文');
    assert.equal(await editor.inputValue(), 'draft\n中文');
    await fs.writeFile(target, Buffer.from([0, 1, 2]));
    await inspect.click();
    await page.getByRole('alert').filter({ hasText: '当前编辑内容已保留' }).waitFor();
    assert.equal(await compare.count(), 0);
    assert.equal(await editor.inputValue(), 'draft\n中文');
    await fs.writeFile(target, 'retry');
    await inspect.click();
    await page.getByLabel('磁盘快照内容', { exact: true }).filter({ hasText: 'retry' }).waitFor();
    assert.equal(writes.length, 1);
    await page.getByRole('button', { name: '关闭版本对照', exact: true }).click();
    assert.equal(await compare.count(), 0);
    assert.equal(await editor.inputValue(), 'draft\n中文');
    console.log('PASS: real disk comparison preserves draft/history/baseline, rejects conflict, clears failed snapshot and retries');
  } finally { await browser.close(); await fs.rm(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });

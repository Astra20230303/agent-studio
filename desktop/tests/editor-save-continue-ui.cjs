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
    const keep = page.getByRole('button', { name: '保存并继续编辑', exact: true });
    const save = page.getByRole('button', { name: '保存文件', exact: true });
    await editor.fill('first\n中文');
    await inspect.click();
    await compare.waitFor();
    await keep.click();
    await page.waitForFunction(() => document.querySelector('textarea[aria-label="文件内容"]')?.disabled === false);
    assert.equal(await keep.isDisabled(), true);
    assert.equal(await save.isDisabled(), true);
    assert.equal(await compare.count(), 0);
    assert.equal(await editor.evaluate(node => node === document.activeElement), true);
    assert.equal(await fs.readFile(target, 'utf8'), 'first\r\n中文');
    await editor.press('Control+z');
    assert.equal(await editor.inputValue(), 'original\n中文');
    assert.equal(await keep.isEnabled(), true);
    await editor.press('Control+y');
    assert.equal(await editor.inputValue(), 'first\n中文');
    assert.equal(await keep.isDisabled(), true);
    await editor.fill('second\n中文');
    await keep.click();
    await page.waitForFunction(() => document.querySelector('textarea[aria-label="文件内容"]')?.disabled === false);
    assert.equal(await keep.isDisabled(), true);
    assert.equal(await fs.readFile(target, 'utf8'), 'second\r\n中文');
    assert.notEqual(writes[0].revision, writes[1].revision);
    await editor.fill('third\n中文');
    await fs.writeFile(target, 'external');
    await keep.click();
    await page.getByRole('alert').filter({ hasText: '外部修改' }).waitFor();
    assert.equal(await editor.inputValue(), 'third\n中文');
    assert.equal(await fs.readFile(target, 'utf8'), 'external');
    await editor.press('Control+z');
    assert.equal(await editor.inputValue(), 'second\n中文');
    assert.equal(await keep.isDisabled(), true);
    await editor.press('Control+y');
    assert.equal(await editor.inputValue(), 'third\n中文');
    assert.equal(await keep.isEnabled(), true);
    console.log('PASS: keep-open save updates revision, retains CRLF/history/focus and rejects external changes');
  } finally { await browser.close(); await fs.rm(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });

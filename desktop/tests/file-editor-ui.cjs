const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', name: 'P', path: 'D:/P', git: {} }], threads: [] }));
      window.__writes = []; window.__fail = true;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), workspaceFile: async input => {
        if (input.action === 'write') { window.__writes.push(input); return window.__fail ? { ok: false, error: '文件已被外部修改' } : { ok: true, result: { text: input.edit.text, revision: 'new' } }; }
        return { ok: true, result: input.action === 'read' ? { text: 'original', revision: 'old' } : { entries: [{ name: 'file.txt', path: 'file.txt' }] } };
      } };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '浏览工作区文件', exact: true }).click();
    await page.getByRole('button', { name: '▧ file.txt', exact: true }).click();
    await page.getByRole('button', { name: '编辑文件', exact: true }).click();
    const editor = page.getByRole('textbox', { name: '文件内容' });
    await editor.fill('new 中文');
    await page.getByRole('button', { name: '保存文件', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '文件已被外部修改' }).waitFor();
    assert.equal(await editor.inputValue(), 'new 中文');
    await page.evaluate(() => { window.__fail = false; });
    await page.getByRole('button', { name: '保存文件', exact: true }).click();
    await page.getByRole('dialog', { name: '编辑工作区文件' }).waitFor({ state: 'detached' });
    assert.equal(await page.locator('.workspace-files pre').textContent(), 'new 中文');
    assert.deepEqual(await page.evaluate(() => window.__writes[0].edit), { text: 'new 中文', revision: 'old' });
    await page.getByRole('button', { name: '编辑文件', exact: true }).click();
    await editor.fill('discard');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: '取消编辑' }).click();
    assert.equal(await editor.inputValue(), 'discard');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '取消编辑' }).click();
    await editor.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => window.__writes.length), 2);
    console.log('PASS: edit/save, conflict preservation, retry and confirmed discard without write');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

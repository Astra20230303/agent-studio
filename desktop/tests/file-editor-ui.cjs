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
        if (input.action === 'read' && window.__readFail) return { ok: false, error: 'Read failed' };
        if (input.action === 'read' && window.__latest) return { ok: true, result: window.__latest };
        if (input.action === 'write') { window.__writes.push(input); return window.__fail ? { ok: false, error: '文件已被外部修改' } : { ok: true, result: { text: input.edit.text, revision: 'new' } }; }
        return { ok: true, result: input.action === 'read' ? { text: 'original\r\nline', revision: 'old' } : { entries: [{ name: 'file.txt', path: 'file.txt' }] } };
      } };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '浏览工作区文件', exact: true }).click();
    await page.getByRole('button', { name: '▧ file.txt', exact: true }).click();
    await page.getByRole('button', { name: '编辑文件', exact: true }).click();
    const editor = page.getByRole('textbox', { name: '文件内容' });
    assert.equal(await page.getByRole('button', { name: '保存文件', exact: true }).isDisabled(), true);
    await editor.fill('new 中文\nline');
    await page.getByRole('button', { name: '保存文件', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '文件已被外部修改' }).waitFor();
    assert.equal(await editor.inputValue(), 'new 中文\nline');
    await page.evaluate(() => { window.__fail = false; });
    await page.getByRole('button', { name: '保存文件', exact: true }).click();
    await page.getByRole('dialog', { name: '编辑工作区文件' }).waitFor({ state: 'detached' });
    assert.equal(await page.locator('.workspace-files pre').textContent(), 'new 中文\r\nline');
    assert.deepEqual(await page.evaluate(() => window.__writes[0].edit), { text: 'new 中文\r\nline', revision: 'old' });
    await page.getByRole('button', { name: '编辑文件', exact: true }).click();
    await editor.fill('discard');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: '取消编辑' }).click();
    assert.equal(await editor.inputValue(), 'discard');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '取消编辑' }).click();
    await editor.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => window.__writes.length), 2);
    await page.getByRole('button', { name: '编辑文件', exact: true }).click();
    await editor.fill('keep until reload succeeds');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: '重新读取磁盘文件' }).click();
    assert.equal(await editor.inputValue(), 'keep until reload succeeds');
    await page.evaluate(() => { window.__readFail = true; });
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '重新读取磁盘文件' }).click();
    await page.getByRole('alert').filter({ hasText: 'Read failed' }).waitFor();
    assert.equal(await editor.inputValue(), 'keep until reload succeeds');
    for (const latest of [{ binary: true }, { text: 'partial', revision: 'partial-hash', truncated: true }]) {
      await page.evaluate(latest => { window.__readFail = false; window.__latest = latest; }, latest);
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: '重新读取磁盘文件' }).click();
      await page.getByRole('alert').filter({ hasText: '当前编辑内容已保留' }).waitFor();
      assert.equal(await editor.inputValue(), 'keep until reload succeeds');
    }
    await page.evaluate(() => { window.__readFail = false; window.__latest = { text: 'disk\nversion', revision: 'disk-revision' }; });
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '重新读取磁盘文件' }).click();
    await page.waitForFunction(() => document.querySelector('textarea[aria-label="文件内容"]').value === 'disk\nversion');
    assert.equal(await page.getByRole('button', { name: '保存文件', exact: true }).isDisabled(), true);
    await editor.fill('edited\nversion');
    await editor.selectText();
    await editor.press('Tab');
    assert.equal(await editor.inputValue(), '  edited\n  version');
    await editor.press('Shift+Tab');
    assert.equal(await editor.inputValue(), 'edited\nversion');
    await editor.press('Control+m');
    await editor.press('Tab');
    assert.equal(await editor.evaluate(element => element === document.activeElement), false);
    await editor.focus();
    await editor.press('Control+s');
    await editor.waitFor({ state: 'detached' });
    assert.deepEqual(await page.evaluate(() => window.__writes.at(-1).edit), { text: 'edited\nversion', revision: 'disk-revision' });
    console.log('PASS: edit/save, conflict preservation, retry and confirmed discard without write');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

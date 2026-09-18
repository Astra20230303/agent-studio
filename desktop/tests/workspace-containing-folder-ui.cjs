const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', path: 'D:/Project', name: 'Project', git: {} }], threads: [] }));
      window.__reads = []; window.__attachments = [];
      window.desktop = { workspaceFile: async input => {
        window.__reads.push(input);
        if (input.action === 'list' && window.__denyFolder) return { ok: false, error: 'Folder unavailable' };
        if (input.action === 'search' || input.action === 'search-content') return { ok: true, result: { entries: [{ name: 'found.txt', path: window.__rootFile ? 'found.txt' : 'src\\nested\\found.txt', directory: false }] } };
        if (input.action === 'read') return { ok: true, result: { text: 'Found file', revision: 'hash' } };
        return { ok: true, result: { entries: [] } };
      } };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '浏览工作区文件', exact: true }).click();
    const panel = page.getByRole('region', { name: '工作区文件', exact: true });
    const search = panel.getByRole('textbox', { name: '查找工作区文件', exact: true });
    for (const mode of ['name', 'content']) {
      await panel.getByRole('combobox', { name: '文件搜索方式' }).selectOption(mode);
      await search.fill('found'); await panel.getByRole('button', { name: '查找文件', exact: true }).click();
      await panel.getByRole('button', { name: '▧ src\\nested\\found.txt', exact: true }).click();
      await panel.getByRole('button', { name: '打开所在目录', exact: true }).click();
      await panel.getByText('src/nested', { exact: true }).waitFor();
      await panel.getByText('此目录为空。', { exact: true }).waitFor();
      assert.equal(await search.inputValue(), '');
      assert.equal(await panel.getByRole('button', { name: '清除文件查找', exact: true }).count(), 0);
      assert.deepEqual(await page.evaluate(() => window.__reads.at(-1)), { root: 'D:/Project', path: 'src/nested', action: 'list', query: '' });
      await panel.getByRole('button', { name: '上级目录', exact: true }).click();
      await panel.getByText('src', { exact: true }).waitFor();
    }
    await page.evaluate(() => { window.__rootFile = true; });
    await search.fill('found'); await panel.getByRole('button', { name: '查找文件', exact: true }).click();
    await panel.getByRole('button', { name: '▧ found.txt', exact: true }).click();
    await panel.getByRole('button', { name: '打开所在目录', exact: true }).click();
    await panel.getByText('.', { exact: true }).waitFor();
    assert.equal(await panel.getByRole('button', { name: '上级目录', exact: true }).count(), 0);
    await search.fill('found'); await panel.getByRole('button', { name: '查找文件', exact: true }).click();
    await panel.getByRole('button', { name: '▧ found.txt', exact: true }).click();
    await page.evaluate(() => { window.__denyFolder = true; });
    await panel.getByRole('button', { name: '打开所在目录', exact: true }).click();
    await panel.getByRole('alert').getByText('Folder unavailable', { exact: true }).waitFor();
    await page.evaluate(() => { window.__denyFolder = false; });
    await panel.getByRole('button', { name: '刷新文件', exact: true }).click();
    await panel.getByText('此目录为空。', { exact: true }).waitFor();
    assert.equal(await panel.getByRole('alert').count(), 0);
    assert.equal(await page.locator('.attachment-list').count(), 0);
    console.log('PASS: name/content search opens containing folder, clears search and uses consistent parent/root navigation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

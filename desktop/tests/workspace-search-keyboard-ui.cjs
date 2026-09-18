const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeProjectId: 'p', projects: [{ id: 'p', path: 'D:/Project', name: 'Project', git: {} }], threads: [] }));
      window.__reads = [];
      window.desktop = {
        listModels: async () => ({ ok: true, models: ['test'] }),
        providerStatus: async () => ({ keyConfigured: true }),
        workspaceFile: async input => {
          window.__reads.push(input);
          if (input.action === 'read') return { ok: true, result: { text: input.path, revision: 'v1' } };
          return { ok: true, result: { entries: input.query && input.query !== 'missing' ? [1, 2, 3].map(n => ({ name: `file${n}.ts`, path: `src/file${n}.ts`, directory: false, ...(input.action === 'search-content' ? { line: n, column: 1, snippet: 'match', revision: 'v1' } : {}) })) : [] } };
        },
      };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '浏览工作区文件', exact: true }).click();
    const input = page.getByRole('textbox', { name: '查找工作区文件' });
    const rows = page.locator('.workspace-file-row');
    async function checkActive(index) {
      assert.equal(await rows.nth(index).getAttribute('aria-current'), 'true');
      assert.ok(await rows.nth(index).evaluate(el => el === document.activeElement));
      assert.equal(await page.locator('.workspace-file-row[aria-current=true]').count(), 1);
    }
    for (const mode of ['name', 'content']) {
      await page.getByRole('combobox', { name: '文件搜索方式' }).selectOption(mode);
      assert.equal(await page.locator('.workspace-file-row[aria-current=true]').count(), 0);
      await input.fill('file');
      await input.press('Enter');
      await rows.nth(2).waitFor();
      await input.press('Home');
      assert.ok(await input.evaluate(el => el === document.activeElement && el.selectionStart === 0));
      await input.press('End');
      assert.ok(await input.evaluate(el => el === document.activeElement && el.selectionStart === el.value.length));
      await input.press('ArrowDown');
      await checkActive(0);
      await page.keyboard.press('End');
      await checkActive(2);
      await page.keyboard.press('Home');
      await checkActive(0);
      await page.keyboard.press('Tab');
      await checkActive(1);
      await page.keyboard.press('ArrowUp');
      await checkActive(0);
      await page.keyboard.press('ArrowUp');
      await checkActive(2);
      await page.keyboard.press('ArrowDown');
      await checkActive(0);
      await page.keyboard.press('ArrowDown');
      await checkActive(1);
      await page.keyboard.press('Enter');
      await page.locator('.workspace-files h3').getByText('file2.ts', { exact: true }).waitFor();
      await page.locator('.workspace-files pre').waitFor();
      assert.equal(await page.evaluate(() => window.__reads.filter(x => x.action === 'read').at(-1).path), 'src/file2.ts');
      await page.getByRole('button', { name: '返回目录', exact: true }).click();
      await rows.nth(2).waitFor();
      assert.equal(await page.locator('.workspace-file-row[aria-current=true]').count(), 0);
      await input.press('ArrowUp');
      await checkActive(2);
      await page.getByRole('button', { name: '刷新文件', exact: true }).click();
      await rows.nth(2).waitFor();
      assert.equal(await page.locator('.workspace-file-row[aria-current=true]').count(), 0);
      await input.press('ArrowDown');
      await checkActive(0);
    }
    await input.fill('missing');
    await input.press('ArrowDown');
    assert.ok(await input.evaluate(el => el === document.activeElement));
    await input.press('Enter');
    await page.getByText('没有匹配文件。', { exact: true }).waitFor();
    await input.press('ArrowUp');
    assert.ok(await input.evaluate(el => el === document.activeElement));
    console.log('PASS: name/content keyboard navigation, wraparound, Enter target, focus/highlight, refresh reset, changed query and empty results');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

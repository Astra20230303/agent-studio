const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { workspaceFile } = require('../electron/workspace-files.cjs');

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-options-ui-'));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    await fs.writeFile(path.join(root, 'sample.txt'), 'Needle\nneedle\nneedles\n');
    const page = await browser.newPage();
    await page.exposeFunction('readWorkspace', async input => {
      try { return { ok: true, result: await workspaceFile(input.root, input.path, input.action, input.query, input.edit, input.searchOptions) }; }
      catch (error) { return { ok: false, error: error.message }; }
    });
    await page.addInitScript(root => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeProjectId: 'p', projects: [{ id: 'p', path: root, name: 'Project', git: {} }], threads: [] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }), workspaceFile: input => window.readWorkspace(input) };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    }, root);
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '浏览工作区文件', exact: true }).click();
    const mode = page.getByRole('combobox', { name: '文件搜索方式' });
    const input = page.getByRole('textbox', { name: '查找工作区文件' });
    const sensitive = page.getByRole('checkbox', { name: '区分大小写' });
    const whole = page.getByRole('checkbox', { name: '全字匹配' });
    assert.equal(await sensitive.count(), 0);
    await mode.selectOption('content');
    await input.fill('needle');
    await input.press('Enter');
    async function expectLines(lines) {
      await page.waitForFunction(lines => {
        const actual = [...document.querySelectorAll('.workspace-file-row')].map(el => Number(el.textContent.match(/sample\.txt:(\d+):/)?.[1]));
        return JSON.stringify(actual) === JSON.stringify(lines);
      }, lines);
    }
    await expectLines([1, 2, 3]);
    await input.press('ArrowDown');
    assert.equal(await page.locator('.workspace-file-row[aria-current=true]').count(), 1);
    await whole.check();
    await expectLines([1, 2]);
    assert.equal(await page.locator('.workspace-file-row[aria-current=true]').count(), 0);
    await sensitive.check();
    await expectLines([2]);
    await input.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.locator('.workspace-files pre span[style]').waitFor();
    assert.equal((await page.locator('.workspace-files pre span[style]').innerText()).trim(), 'needle');
    await sensitive.uncheck();
    await expectLines([1, 2]);
    assert.equal(await page.locator('.workspace-files h3').count(), 0);
    await whole.uncheck();
    await expectLines([1, 2, 3]);
    await mode.selectOption('name');
    assert.equal(await sensitive.count(), 0);
    await input.fill('SAMPLE');
    await input.press('Enter');
    await page.getByRole('button', { name: '▧ sample.txt', exact: true }).waitFor();
    console.log('PASS: UI options use real filesystem search, recompute results, reset selection, preserve preview line, and leave filename search unchanged');
  } finally {
    await browser.close();
    await fs.rm(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

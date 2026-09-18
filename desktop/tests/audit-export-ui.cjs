const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { saveConversation } = require('../electron/conversation-export.cjs');
(async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-audit-export-'));
  const file = path.join(folder, 'audit.md');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    let mode = 'hold'; let release; let calls = 0;
    await page.exposeFunction('__saveAudit', async input => {
      calls++;
      if (mode === 'hold') await new Promise(resolve => { release = resolve; });
      if (mode === 'fail') return { ok: false, error: 'Disk full' };
      return saveConversation(input, async () => mode === 'cancel' ? { canceled: true } : { filePath: file });
    });
    await page.addInitScript(() => {
      localStorage.setItem('felix-audit-log-v1', JSON.stringify([
        { id: 'one', at: '2026-09-19T00:00:00Z', action: '归档会话', detail: 'remote-one' },
        { id: 'two', at: '2026-09-19T00:01:00Z', action: '切换项目', detail: 'D:/private' },
      ]));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), saveConversation: input => window.__saveAudit(input) };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('button', { name: '操作记录', exact: true }).click();
    const search = page.getByRole('searchbox', { name: '搜索操作记录', exact: true });
    await search.fill('归档');
    await page.getByRole('button', { name: '导出筛选记录（1）', exact: true }).evaluate(button => { button.click(); button.click(); });
    await page.getByRole('button', { name: '正在导出操作记录…', exact: true }).waitFor();
    // Wait for the native bridge call, not a timer-based assumption.
    while (!release) await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 1);
    await search.fill('切换'); mode = 'save'; release();
    await page.getByText('已导出 1 条操作记录', { exact: true }).waitFor();
    const first = await fs.readFile(file, 'utf8');
    assert.match(first, /归档会话/); assert.match(first, /remote-one/);
    assert.doesNotMatch(first, /切换项目|private/);
    mode = 'cancel';
    await page.getByRole('button', { name: '导出筛选记录（1）', exact: true }).click();
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].some(button => button.textContent === '正在导出操作记录…'));
    assert.equal(await page.getByText('已导出 1 条操作记录', { exact: true }).count(), 0);
    assert.equal(await fs.readFile(file, 'utf8'), first);
    mode = 'fail';
    await page.getByRole('button', { name: '导出筛选记录（1）', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Disk full' }).waitFor();
    mode = 'save';
    await page.getByRole('button', { name: '导出筛选记录（1）', exact: true }).click();
    await page.getByText('已导出 1 条操作记录', { exact: true }).waitFor();
    assert.match(await fs.readFile(file, 'utf8'), /切换项目/);
    assert.doesNotMatch(await fs.readFile(file, 'utf8'), /private/);
    await search.fill('no-match');
    assert.ok(await page.getByRole('button', { name: '导出筛选记录（0）', exact: true }).isDisabled());
    const broken = await browser.newPage();
    await broken.addInitScript(() => { localStorage.setItem('felix-audit-log-v1', '{broken'); });
    await broken.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await broken.getByRole('button', { name: '设置', exact: true }).click();
    await broken.getByRole('button', { name: '操作记录', exact: true }).click();
    await broken.getByRole('alert').filter({ hasText: '操作记录读取失败' }).waitFor();
    assert.ok(await broken.getByRole('button', { name: '导出筛选记录（0）', exact: true }).isDisabled());
    console.log('PASS: filtered audit snapshot saved to real file; duplicate/cancel/failure/retry/redaction/read-failure guards');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

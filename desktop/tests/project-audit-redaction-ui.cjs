const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const failWrite of [false, true]) {
      const page = await browser.newPage();
      await page.addInitScript(({ failWrite }) => {
        const key = 'felix-audit-log-v1';
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify([
          { id: 'old-project', at: '2026-09-18T10:00:00Z', action: '切换项目', detail: 'C:\\Users\\Private\\secret-project' },
          { id: 'other', at: '2026-09-18T09:00:00Z', action: '切换会话', detail: 'thread-123' },
        ]));
        window.__failAudit = failWrite;
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'felix-audit-log-v1' && window.__failAudit) throw Error('Disk full');
          return original.call(this, key, value);
        };
        window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
        window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
      }, { failWrite });
      await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5329');
      await page.getByRole('button', { name: '设置', exact: true }).click();
      await page.getByRole('button', { name: '操作记录', exact: true }).click();
      const records = page.getByRole('region', { name: '操作记录', exact: true });
      await records.getByText('切换项目', { exact: true }).waitFor();
      assert.equal((await records.innerText()).includes('secret-project'), false);
      if (failWrite) {
        await records.getByRole('alert').filter({ hasText: '操作记录未能保存，请重试。' }).waitFor();
        await page.evaluate(() => { window.__failAudit = false; });
        await records.getByRole('button', { name: /重试/ }).click();
      }
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-audit-log-v1'))[0].detail === undefined);
      const entries = await page.evaluate(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')));
      assert.equal(entries.length, 2);
      assert.equal(entries[0].id, 'old-project');
      assert.equal(entries[1].detail, 'thread-123');
      await page.reload();
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-audit-log-v1'))), entries);
      await page.close();
    }
    console.log('PASS: historical path IDs redacted on load, persist across reload, retry after write failure, unrelated records retained');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

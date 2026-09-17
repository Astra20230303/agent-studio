const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__sent = []; window.__reject = true;
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }), pickFiles: async () => ['D:/image.png', 'D:/notes.txt'] };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        if (method === 'thread/start') return { ok: true, result: { thread: { id: 'a' } } };
        if (method === 'turn/start' || method === 'turn/steer') { window.__sent.push({ method, params }); return window.__reject ? { ok: false, error: 'Rejected' } : { ok: true, result: method === 'turn/start' ? { turn: { id: 'turn', status: 'inProgress' } } : { turnId: 'turn' } }; }
        return { ok: true, result: { data: [] } };
      }, onNotification: fn => { window.__notify = fn; return () => {}; }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '新对话', exact: true }).click();
    const add = page.getByRole('button', { name: '添加附件', exact: true });
    await add.click();
    await page.getByRole('button', { name: '移除附件：D:/notes.txt', exact: true }).click();
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.getByText('发送失败：Rejected', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '移除附件：D:/image.png', exact: true }).count(), 1);
    await page.evaluate(() => { window.__reject = false; });
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.getByRole('button', { name: '停止生成', exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.__sent[1].params.input), [{ type: 'localImage', path: 'D:/image.png' }]);
    await page.locator('.attachment-list').waitFor({ state: 'hidden' });
    await add.click();
    await page.getByRole('button', { name: '追加指令', exact: true }).click();
    await page.waitForFunction(() => window.__sent.length === 3);
    assert.equal(await page.evaluate(() => window.__sent[2].method), 'turn/steer');
    assert.equal(await page.evaluate(() => window.__sent[2].params.input[0].type), 'localImage');
    await add.click();
    await page.getByRole('button', { name: '本轮完成后发送', exact: true }).click();
    await page.evaluate(() => window.__notify({ method: 'turn/completed', params: { threadId: 'a', turn: { id: 'turn', status: 'completed' } } }));
    await page.waitForFunction(() => window.__sent.length === 4);
    assert.equal(await page.evaluate(() => window.__sent[3].params.input[0].type), 'localImage');
    console.log('PASS: attachment-only send, removal, rejection retention, steering and queued attachments');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

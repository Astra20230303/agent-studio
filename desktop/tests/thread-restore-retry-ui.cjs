const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__calls = []; window.__fail = true;
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', model: 'test', threads: [
        { id: 'a', remoteId: 'remote-a', title: 'Thread A', cwd: 'D:/old', status: 'completed', messages: [], updatedAt: new Date().toISOString() },
        { id: 'b', title: 'Local B', status: 'completed', messages: [], updatedAt: new Date().toISOString() },
      ] }));
      localStorage.setItem('felix-thread-drafts-v1', JSON.stringify({ a: 'draft A', b: 'draft B' }));
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        if (method === 'thread/resume') {
          if (window.__hold) await new Promise(resolve => window.__release = resolve);
          return window.__fail ? { ok: false, error: 'temporary resume failure' } : { ok: true, result: { thread: { id: params.threadId, cwd: 'D:/confirmed', turns: [] } } };
        }
        if (method === 'turn/start') return { ok: true, result: { turn: { id: 'turn', status: 'completed' } } };
        return { ok: true, result: { data: [] } };
      }, onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5329');
    const error = page.getByRole('alert', { name: '会话恢复失败' });
    await error.waitFor();
    const send = page.getByRole('button', { name: '发送', exact: true });
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    assert.ok(await send.isDisabled());
    await input.fill('edited A'); await input.press('Enter');
    assert.equal(await page.evaluate(() => window.__calls.filter(x => x.method === 'turn/start').length), 0);
    await page.getByRole('button', { name: 'Local B', exact: true }).click();
    await error.waitFor({ state: 'hidden' });
    assert.equal(await input.inputValue(), 'draft B'); assert.ok(await send.isEnabled());
    await page.getByRole('button', { name: 'Thread A', exact: true }).click();
    await error.waitFor();
    assert.equal(await input.inputValue(), 'edited A');
    await page.evaluate(() => { window.__fail = false; window.__hold = true; });
    const retry = error.getByRole('button', { name: '重试恢复会话' });
    await retry.click();
    await page.waitForFunction(() => !!window.__release);
    assert.ok(await retry.isDisabled()); assert.ok(await send.isDisabled());
    await page.evaluate(() => window.__release());
    await error.waitFor({ state: 'hidden' });
    await send.click();
    await page.waitForFunction(() => window.__calls.some(x => x.method === 'turn/start'));
    const sent = await page.evaluate(() => window.__calls.find(x => x.method === 'turn/start').params);
    assert.equal(sent.threadId, 'remote-a'); assert.equal(sent.cwd, 'D:/confirmed');
    assert.equal(sent.input[0].text, 'edited A');
    console.log('PASS: failed resume blocks sending, keeps editable isolated drafts, retry waits for confirmation and sends with recovered cwd');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      if (!localStorage.getItem('codex-desktop-state-v1')) localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', projects: [], threads: [] }));
      window.__calls = [];
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        return { ok: true, result: method === 'thread/start' ? { thread: { id: 'keyboard', turns: [] } } : method === 'turn/start' ? { turn: { id: 'turn', status: 'completed' } } : { data: [] } };
      }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('button', { name: '键盘快捷键', exact: true }).click();
    await page.getByRole('combobox', { name: '发送快捷键' }).selectOption('mod-enter');
    await page.getByRole('button', { name: /返回应用/ }).click();
    await page.reload();
    const editor = page.getByRole('textbox', { name: '消息', exact: true });
    await editor.fill('Line one'); await editor.press('Enter'); await editor.type('Line two');
    assert.equal(await editor.inputValue(), 'Line one\nLine two');
    assert.equal(await page.evaluate(() => window.__calls.filter(call => call.method === 'turn/start').length), 0);
    await editor.press('Control+Enter');
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'turn/start'));
    assert.equal(await page.evaluate(() => window.__calls.find(call => call.method === 'turn/start').params.input[0].text), 'Line one\nLine two');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).sendShortcut), 'mod-enter');
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('button', { name: '键盘快捷键', exact: true }).click();
    await page.getByRole('combobox', { name: '发送快捷键' }).selectOption('enter');
    await page.getByRole('button', { name: /返回应用/ }).click();
    await editor.fill('中文草稿');
    await editor.dispatchEvent('compositionstart');
    await editor.press('Enter');
    await editor.dispatchEvent('compositionend');
    assert.equal(await page.evaluate(() => window.__calls.filter(call => call.method === 'turn/start').length), 1);
    await editor.fill('First'); await editor.press('Shift+Enter'); await editor.type('Second');
    assert.equal(await editor.inputValue(), 'First\nSecond');
    await editor.press('Enter');
    await page.waitForFunction(() => window.__calls.filter(call => call.method === 'turn/start').length === 2);
    assert.equal(await page.evaluate(() => window.__calls.filter(call => call.method === 'turn/start')[1].params.input[0].text), 'First\nSecond');
    console.log('PASS: shortcut setting persists and Enter newline/Ctrl+Enter send work');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

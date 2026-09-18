const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({
        model: 'alpha-model', activeThreadId: 'local-a', threads: [{ id: 'local-a', remoteId: 'remote-a', providerId: 'a', model: 'alpha-model', title: 'Existing conversation', messages: [{ id: 'm', role: 'user', content: 'Keep this history', createdAt: new Date().toISOString() }], status: 'completed', pinned: false, archived: false, updatedAt: new Date().toISOString() }], projects: [], automations: [],
      }));
      window.__badCatalog = true; window.__calls = []; window.__provider = 'a'; window.__model = 'alpha-model';
      window.desktop = {
        listProviders: async () => [{ id: 'a', name: 'Alpha', enabled: true }, { id: 'b', name: 'Beta' }],
        listModels: async input => ({ ok: true, models: input?.providerId === 'b' && window.__badCatalog ? ['beta-model', null] : [input?.providerId === 'b' ? 'beta-model' : 'alpha-model'] }),
        providerStatus: async () => ({ keyConfigured: true }),
      };
      window.codex = {
        connect: async () => ({ ok: true }), notify: async () => ({}),
        request: async (method, params) => {
          window.__calls.push({ method, params });
          if (method === 'thread/resume') return { ok: true, result: { providerId: window.__provider, model: window.__model, thread: { id: 'remote-a', turns: [] } } };
          if (method === 'felix/thread/provider') return new Promise(resolve => { window.__migration = resolve; });
          if (method === 'turn/start') return { ok: true, result: { turn: { id: 'turn', status: 'inProgress' } } };
          return { ok: true, result: { data: [] } };
        },
        onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const select = page.getByRole('combobox', { name: '会话渠道', exact: true });
    const editor = page.getByRole('textbox', { name: '消息', exact: true });
    await page.waitForFunction(() => document.querySelector('[aria-label="会话渠道"]') && !document.querySelector('[aria-label="会话渠道"]').disabled);
    await editor.fill('Retain my draft');
    await select.selectOption('b');
    await page.getByText('切换会话渠道失败：模型列表格式无效，请刷新重试。', { exact: true }).waitFor();
    assert.equal(await select.inputValue(), 'a');
    assert.equal(await editor.inputValue(), 'Retain my draft');
    assert.equal(await page.evaluate(() => window.__calls.filter(call => call.method === 'felix/thread/provider').length), 0);
    await page.evaluate(() => { window.__badCatalog = false; });
    await select.selectOption('b');
    await page.waitForFunction(() => !!window.__migration);
    assert.equal(await select.inputValue(), 'a');
    assert.ok(await select.isDisabled());
    assert.ok(await page.getByRole('button', { name: '发送', exact: true }).isDisabled());
    await editor.press('Enter');
    assert.equal(await page.evaluate(() => window.__calls.filter(call => call.method === 'turn/start').length), 0);
    await page.evaluate(() => { window.__migration({ ok: false, error: 'Migration failed' }); window.__migration = undefined; });
    await page.getByText('切换会话渠道失败：Migration failed', { exact: true }).waitFor();
    assert.equal(await select.inputValue(), 'a');
    assert.equal(await editor.inputValue(), 'Retain my draft');
    await select.selectOption('b');
    await page.waitForFunction(() => !!window.__migration);
    for (const result of [
      {},
      { thread: { id: 'wrong-thread' }, providerId: 'b', model: 'beta-model' },
      { thread: { id: 'remote-a' }, providerId: 'a', model: 'beta-model' },
      { thread: { id: 'remote-a' }, providerId: 'b', model: 'wrong-model' },
    ]) {
      await page.evaluate(result => { window.__migration({ ok: true, result }); window.__migration = undefined; }, result);
      await page.getByText('切换会话渠道失败：服务端渠道切换确认无效，本地设置未更改，请重新打开会话核对后重试。', { exact: true }).waitFor();
      assert.equal(await select.inputValue(), 'a');
      assert.equal(await editor.inputValue(), 'Retain my draft');
      const original = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(thread => thread.id === 'local-a'));
      assert.equal(original.remoteId, 'remote-a');
      assert.equal(original.providerId, 'a');
      assert.equal(original.model, 'alpha-model');
      assert.equal(original.messages[0].content, 'Keep this history');
      await select.selectOption('b');
      await page.waitForFunction(() => !!window.__migration);
    }
    await page.getByRole('button', { name: '新对话', exact: true }).click();
    await editor.fill('Independent draft');
    await page.evaluate(() => { window.__provider = 'b'; window.__model = 'beta-model'; window.__migration({ ok: true, result: { providerId: 'b', model: 'beta-model', thread: { id: 'remote-a' } } }); });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(thread => thread.id === 'local-a').providerId === 'b');
    assert.equal(await editor.inputValue(), 'Independent draft');
    assert.equal(await select.inputValue(), 'a');
    await page.getByRole('button', { name: 'Existing conversation', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.model-button')?.textContent.includes('beta-model'));
    assert.equal(await select.inputValue(), 'b');
    assert.equal(await editor.inputValue(), 'Retain my draft');
    await page.getByText('Keep this history', { exact: true }).waitFor();
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'turn/start'));
    const calls = await page.evaluate(() => window.__calls);
    assert.equal(calls.some(call => call.method === 'thread/start'), false);
    assert.deepEqual(calls.find(call => call.method === 'felix/thread/provider').params, { threadId: 'remote-a', providerId: 'b', model: 'beta-model' });
    assert.equal(calls.find(call => call.method === 'turn/start').params.model, 'beta-model');
    assert.equal(calls.find(call => call.method === 'turn/start').params.threadId, 'remote-a');
    console.log('PASS: existing thread migration locks sending, preserves failed selection and draft, then uses target catalog without replacing history');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

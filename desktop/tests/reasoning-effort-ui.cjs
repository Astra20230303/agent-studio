const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('thread-model-seeded')) {
        localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'model-a', activeThreadId: 'a', threads: ['a', 'b'].map(id => ({ id, remoteId: id, title: 'Chat ' + id, messages: [], status: 'completed', updatedAt: '' })) }));
        sessionStorage.setItem('thread-model-seeded', 'true');
      }
      window.__calls = []; const listeners = new Set();
      window.__notify = event => listeners.forEach(fn => fn(event));
      window.desktop = { listModels: async () => ({ ok: true, models: ['model-a', 'model-b'] }), providerStatus: async () => ({ keyConfigured: true }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        return { ok: true, result: method === 'thread/resume' ? { model: 'model-a', reasoningEffort: 'minimal', thread: { id: params.threadId, turns: [] } } : method === 'turn/start' ? { turn: { id: 'turn', status: 'inProgress' } } : { data: [] } };
      }, onNotification: fn => { listeners.add(fn); return () => listeners.delete(fn); }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '推理强度：极低', exact: true }).waitFor();
    await page.getByRole('button', { name: '推理强度：极低', exact: true }).click();
    await page.getByRole('button', { name: '极高', exact: true }).click();
    await page.getByRole('button', { name: 'Chat b', exact: true }).click();
    await page.getByRole('button', { name: '推理强度：极低', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Chat a', exact: true }).click();
    await page.getByRole('button', { name: '推理强度：极高', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: '推理强度：极高', exact: true }).waitFor();
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    await input.fill('Higher effort');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'turn/start'));
    let sent = await page.evaluate(() => window.__calls.find(call => call.method === 'turn/start').params);
    assert.equal(sent.effort, 'xhigh');
    assert.equal(sent.collaborationMode.settings.reasoning_effort, 'xhigh');
    await page.evaluate(() => window.__notify({ method: 'turn/completed', params: { threadId: 'a', turn: { id: 'turn', status: 'completed' } } }));
    await page.getByRole('button', { name: '推理强度：极高', exact: true }).click();
    await page.getByRole('dialog', { name: '推理强度', exact: true }).getByRole('button', { name: '关闭', exact: true }).click();
    await page.getByRole('button', { name: '推理强度：关闭', exact: true }).click();
    await input.fill('Explicit none');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => window.__calls.filter(call => call.method === 'turn/start').length === 2);
    sent = await page.evaluate(() => window.__calls.filter(call => call.method === 'turn/start')[1].params);
    assert.equal(sent.effort, 'none');
    assert.equal(sent.collaborationMode.settings.reasoning_effort, 'none');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: '推理强度：关闭', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '推理强度', exact: true });
    for (const [value, label] of [['minimal', '极低'], ['xhigh', '极高'], ['max', 'Max'], ['ultra', 'Ultra'], ['persistent', 'Persistent']]) {
      const option = dialog.getByRole('button', { name: label, exact: true });
      await option.click();
      assert.equal(await option.getAttribute('aria-pressed'), 'true');
      await page.waitForFunction(expected => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(t => t.id === 'a').reasoningEffort === expected, value);
      const bounds = await option.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    }
    const slider = dialog.getByRole('slider', { name: '推理强度', exact: true });
    await slider.focus(); await slider.press('Home');
    await page.getByRole('button', { name: '推理强度：模型默认', exact: true }).waitFor();
    await slider.press('End');
    await page.getByRole('button', { name: '推理强度：Persistent', exact: true }).waitFor();
    await dialog.getByRole('button', { name: '恢复默认强度', exact: true }).click();
    await page.getByRole('button', { name: '推理强度：模型默认', exact: true }).waitFor();
    console.log('PASS: extended effort restores, persists across reload, stays per thread and reaches turn request; none is explicit');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

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
      window.desktop = { listModels: async () => ({ ok: true, models: ['model-a', 'model-b'], effortCapabilities: [{ model: 'model-a', values: ['low','high'] }, { model: 'model-b', values: [] }] }), providerStatus: async () => ({ keyConfigured: true }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        return { ok: true, result: method === 'thread/resume' ? { model: 'model-a', thread: { id: params.threadId, turns: [] } } : method === 'turn/start' ? { turn: { id: 'turn', status: 'inProgress' } } : { data: [] } };
      }, onNotification: fn => { listeners.add(fn); return () => listeners.delete(fn); }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '推理强度：低', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '推理强度', exact: true });
    assert.equal(await dialog.getByRole('button', { name: '极高', exact: true }).count(), 0);
    await dialog.getByRole('button', { name: '高', exact: true }).click();
    await page.getByRole('button', { name: '选择模型', exact: true }).click();
    await page.getByRole('option', { name: 'model-b', exact: true }).click();
    await page.getByRole('button', { name: '推理强度：高', exact: true }).click();
    await dialog.getByText(/当前强度不在此模型声明/).waitFor();
    assert.equal(await dialog.getByRole('slider').isDisabled(), true);
    assert.equal(await dialog.getByRole('button', { name: '高', exact: true }).count(), 0);
    await dialog.getByRole('button', { name: '模型默认', exact: true }).click();
    assert.equal(await dialog.getByRole('slider').isEnabled(), true);
    await page.evaluate(() => {
      window.desktop.listModels = async () => ({ok:true,models:['model-a','model-b']});
      window.dispatchEvent(new Event('provider-changed'));
    });
    await dialog.getByRole('button', { name: '极高', exact: true }).waitFor();
    console.log('PASS: explicit model effort capabilities filter options; unsupported selection stays visible; absent metadata restores choices');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'model-a', activeThreadId: 'a', threads: ['a', 'b'].map(id => ({ id, remoteId: id, title: 'Chat ' + id, model: 'model-b', reasoningEffort: 'high', planningMode: 'plan', pinned: true, messages: [{ id: 'reply', turnId: 'turn', role: 'assistant', content: 'Answer', createdAt: new Date().toISOString() }], status: 'completed', updatedAt: '' })) }));
      window.__calls = []; const listeners = new Set();
      window.__notify = event => listeners.forEach(fn => fn(event));
      window.desktop = { listModels: async () => ({ ok: true, models: ['model-a', 'model-b'] }), providerStatus: async () => ({ keyConfigured: true }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        if (method === 'thread/fork') return new Promise(resolve => { window.__finishFork = fail => resolve(fail ? { ok: false, error: { message: 'fork rejected' } } : { ok: true, result: { thread: { id: 'fork-' + window.__calls.filter(c => c.method === 'thread/fork').length }, sandbox: { type: 'readOnly' }, approvalPolicy: 'never' } }); });
        return { ok: true, result: method === 'thread/resume' ? { thread: { id: params.threadId, turns: [] } } : { data: [] } };
      }, onNotification: fn => { listeners.add(fn); return () => listeners.delete(fn); }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const fork = page.getByRole('button', { name: '分叉', exact: true });
    await fork.click();
    assert.ok(await page.getByRole('button', { name: '正在分叉…', exact: true }).isDisabled());
    assert.ok(await page.getByRole('button', { name: '分支到新聊天', exact: true }).isDisabled());
    await page.getByRole('button', { name: 'Chat b', exact: true }).click();
    await page.evaluate(() => window.__finishFork(false));
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.some(t => t.remoteId === 'fork-1'));
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
    assert.equal(state.activeThreadId, 'b');
    const branch = state.threads.find(t => t.remoteId === 'fork-1');
    assert.equal(branch.model, 'model-b'); assert.equal(branch.reasoningEffort, 'high'); assert.equal(branch.planningMode, 'plan');
    assert.equal(branch.status, 'idle'); assert.equal(branch.pinned, false); assert.equal(branch.effectivePermissions.sandbox, 'readOnly');
    await fork.click(); await page.evaluate(() => window.__finishFork(true));
    await page.getByText('分叉失败：fork rejected', { exact: true }).waitFor();
    await fork.click(); await page.evaluate(() => window.__finishFork(false));
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).activeThreadId === 'remote-fork-3');
    await page.evaluate(() => window.__notify({ method: 'turn/started', params: { threadId: 'fork-3', turn: { id: 'busy' } } }));
    assert.ok(await fork.isDisabled());
    assert.equal(await page.evaluate(() => window.__calls.filter(c => c.method === 'thread/fork').length), 3);
    console.log('PASS: fork settings, shared busy guard, navigation preservation, retry and running guard');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

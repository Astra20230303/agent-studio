const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'a', threads: ['a', 'b'].map(id => ({ id, remoteId: id, title: `Thread ${id}`, status: 'completed', pinned: false, archived: false, messages: [], updatedAt: new Date().toISOString() })) }));
      window.__requests = [];
      window.__turns = {};
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }), getProjectRoot: async () => 'D:\\workspace' };
      window.codex = {
        connect: async () => ({ ok: true }), notify: async () => {},
        request: async (method, params) => {
          window.__requests.push({ method, params });
          if (method === 'thread/resume') return { ok: true, result: { thread: { id: params.threadId, turns: window.__turns[params.threadId] ? [{ id: window.__turns[params.threadId], status: 'inProgress', items: [] }] : [] } } };
          if (method === 'turn/start') {
            const id = `${params.threadId}-turn`;
            window.__turns[params.threadId] = id;
            window.__notify({ method: 'turn/started', params: { threadId: params.threadId, turn: { id } } });
            if (window.__instant) {
              delete window.__turns[params.threadId];
              window.__notify({ method: 'turn/completed', params: { threadId: params.threadId, turn: { id, status: 'completed' } } });
            }
            return { ok: true, result: { turn: { id, status: 'inProgress' } } };
          }
          if (method === 'turn/steer') return window.__failSteer ? { ok: false, error: 'Steering rejected' } : { ok: true, result: { turnId: params.expectedTurnId } };
          if (method === 'turn/interrupt') return window.__failStop ? { ok: false, error: 'Stop rejected' } : { ok: true, result: {} };
          return { ok: true, result: { data: [] } };
        },
        onNotification: fn => { window.__notify = fn; return () => {}; }, onServerRequest: () => () => {},
        onError: () => () => {}, onStderr: () => () => {}, onClosed: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => window.__requests.some(r => r.method === 'thread/resume'));
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    const stop = page.getByRole('button', { name: '停止生成', exact: true });
    const select = async id => { await page.getByRole('button', { name: `Thread ${id}`, exact: true }).click(); await page.waitForFunction(id => window.__requests.filter(r => r.method === 'thread/resume' && r.params.threadId === id).length > 0, id); };
    await input.fill('Start A');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await stop.waitFor();
    await select('b');
    await stop.waitFor({ state: 'hidden' });
    await input.fill('Start B');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await stop.waitFor();
    await page.evaluate(() => { delete window.__turns.a; window.__notify({ method: 'turn/completed', params: { threadId: 'a', turn: { id: 'a-turn', status: 'completed' } } }); });
    assert.equal(await stop.isVisible(), true);
    await input.fill('Additional constraint');
    await page.getByRole('button', { name: '追加指令', exact: true }).click();
    await page.waitForFunction(() => window.__requests.some(r => r.method === 'turn/steer'));
    const steer = await page.evaluate(() => window.__requests.find(r => r.method === 'turn/steer'));
    assert.deepEqual(steer.params, { threadId: 'b', expectedTurnId: 'b-turn', input: [{ type: 'text', text: 'Additional constraint' }] });
    await page.evaluate(() => { window.__failSteer = true; });
    await input.fill('Keep this draft');
    await page.getByRole('button', { name: '追加指令', exact: true }).click();
    await page.getByText('追加指令失败：Steering rejected', { exact: true }).waitFor();
    assert.equal(await input.inputValue(), 'Keep this draft');
    assert.equal(await page.locator('.message.user', { hasText: 'Keep this draft' }).count(), 0);
    await stop.click();
    await page.waitForFunction(() => window.__requests.some(r => r.method === 'turn/interrupt'));
    assert.deepEqual(await page.evaluate(() => window.__requests.find(r => r.method === 'turn/interrupt').params), { threadId: 'b', turnId: 'b-turn' });
    await select('a');
    await stop.waitFor({ state: 'hidden' });
    await select('b');
    await stop.waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: concurrent threads, isolated completion, steering, retained rejected draft, correct stop target, resume');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

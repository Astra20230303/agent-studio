const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ mode: 'work', activeThreadId: 'a', threads: ['a', 'b'].map(id => ({ id, remoteId: id, cwd: 'D:/' + id, title: 'Chat ' + id, status: 'completed', messages: [], updatedAt: '' })) }));
      window.__calls = []; window.__late = [];
      window.desktop = { getProjectRoot: async () => 'D:/wrong-default', listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        if (method === 'plugin/list') {
          const name = params.cwds[0] === 'D:/a' ? 'Plugin A' : 'Plugin B';
          const result = { ok: true, result: { marketplaces: [{ name: 'local', path: 'D:/catalog', plugins: [{ id: name, name, installed: true, enabled: true, interface: { displayName: name } }] }] } };
          if (name === 'Plugin A' && window.__hold) return new Promise(resolve => window.__late.push(() => resolve(result)));
          return result;
        }
        return { ok: true, result: method === 'thread/resume' ? { thread: { id: params.threadId, turns: [] } } : { data: [] } };
      }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.locator('.work-plugins').click();
    await page.getByRole('button', { name: 'Plugin A', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.__hold = true);
    await page.locator('.work-plugins').click();
    await page.waitForFunction(() => window.__late.length > 0);
    await page.getByRole('button', { name: 'Chat b', exact: true }).click();
    await page.locator('.work-plugins').click();
    await page.getByRole('button', { name: 'Plugin B', exact: true }).waitFor();
    await page.evaluate(() => window.__late.forEach(resolve => resolve()));
    await page.getByRole('button', { name: 'Plugin B', exact: true }).click();
    assert.equal(await page.getByLabel('本次使用的插件').innerText(), 'Plugin B');
    const directories = await page.evaluate(() => window.__calls.filter(c => c.method === 'plugin/list').flatMap(c => c.params.cwds));
    assert.ok(directories.includes('D:/a')); assert.ok(directories.includes('D:/b'));
    assert.ok(!directories.includes('D:/wrong-default'));
    console.log('PASS: conversation plugin directory, workspace switch and stale catalog isolation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

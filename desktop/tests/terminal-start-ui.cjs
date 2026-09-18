const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__creates = []; window.__closes = []; const listeners = new Set();
      window.__emit = event => listeners.forEach(fn => fn(event));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), terminal: {
        create: () => new Promise((resolve, reject) => window.__creates.push({ resolve, reject })),
        write: async () => ({}), resize: async () => ({}),
        close: async id => { window.__closes.push(id); return { ok: true }; },
        onData: fn => { listeners.add(fn); return () => listeners.delete(fn); }
      } };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '打开终端', exact: true }).click();
    const restart = page.getByRole('button', { name: '重新启动终端', exact: true });
    const status = page.locator('.terminal-session:not([hidden]) header [role=status]');
    await page.waitForFunction(() => window.__creates.length === 1);
    assert.equal(await restart.isDisabled(), true);
    await restart.evaluate(button => { button.click(); button.click(); });
    assert.equal(await page.evaluate(() => window.__creates.length), 1);
    await page.evaluate(() => window.__creates[0].reject(Error('spawn failed')));
    await status.filter({ hasText: '启动失败' }).waitFor();
    await page.getByRole('alert').filter({ hasText: 'spawn failed' }).waitFor();
    await restart.evaluate(button => { button.click(); button.click(); });
    await page.waitForFunction(() => window.__creates.length === 2);
    assert.equal(await restart.isDisabled(), true);
    await page.evaluate(() => window.__creates[1].resolve({ ok: true, id: 'session-2' }));
    await status.filter({ hasText: '运行中' }).waitFor();
    assert.equal(await restart.isDisabled(), true);
    await page.evaluate(() => window.__emit({ id: 'session-2', type: 'exit', code: 0 }));
    await status.filter({ hasText: '已退出' }).waitFor();
    await restart.click();
    await page.waitForFunction(() => window.__creates.length === 3);
    await page.getByRole('button', { name: '关闭当前终端', exact: true }).click();
    await page.getByRole('button', { name: '新建终端', exact: true }).click();
    await page.waitForFunction(() => window.__creates.length === 4);
    await page.evaluate(() => window.__creates[2].resolve({ ok: true, id: 'late-session' }));
    await page.waitForFunction(() => window.__closes.includes('late-session'));
    assert.equal(await status.textContent(), '正在启动');
    assert.equal(await restart.isDisabled(), true);
    await page.evaluate(() => window.__creates[3].resolve({ ok: true, id: 'replacement' }));
    await status.filter({ hasText: '运行中' }).waitFor();
    assert.equal(await page.evaluate(() => window.__closes.includes('replacement')), false);
    console.log('PASS: pending start deduplication, failure/retry, exit/restart and late disposed creation cleanup');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

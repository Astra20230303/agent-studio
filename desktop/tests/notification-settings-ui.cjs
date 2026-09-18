const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__readFail = true; window.__writes = []; window.__settings = { completed: false, failed: false, input: false, backgroundOnly: true };
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), conversationNotifications: async input => {
        if (!input && window.__readFail) return { ok: false, error: 'Read unavailable' };
        if (input) window.__writes.push(input);
        if (input && window.__hold) await new Promise(resolve => window.__release = resolve);
        if (input && window.__fail) return { ok: false, error: 'Disk unavailable' };
        if (input) window.__settings = input;
        return { ok: true, settings: window.__settings, supported: true };
      } };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('button', { name: '通知', exact: true }).click();
    const completion = page.getByRole('checkbox', { name: '会话完成', exact: true });
    await page.getByRole('button', { name: '重试加载通知设置' }).waitFor();
    await page.evaluate(() => { window.__readFail = false; });
    await page.getByRole('button', { name: '重试加载通知设置' }).click();
    await completion.check();
    assert.equal(await page.evaluate(() => window.__settings.completed), true);
    await page.getByRole('button', { name: '常规', exact: true }).click();
    await page.getByRole('button', { name: '通知', exact: true }).click();
    assert.equal(await completion.isChecked(), true);
    await page.evaluate(() => { window.__fail = true; });
    await page.getByRole('checkbox', { name: '执行失败', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Disk unavailable' }).waitFor();
    assert.equal(await page.getByRole('checkbox', { name: '执行失败', exact: true }).isChecked(), false);
    await page.evaluate(() => { window.__fail = false; window.__hold = true; });
    await page.getByRole('button', { name: '重试保存通知设置' }).click();
    await page.waitForFunction(() => !!window.__release);
    assert.ok(await completion.isDisabled());
    await page.evaluate(() => window.__release());
    await page.waitForFunction(() => window.__settings.failed);
    assert.equal(await page.evaluate(() => window.__settings.failed), true);
    assert.deepEqual(await page.evaluate(() => window.__writes.at(-1)), await page.evaluate(() => window.__writes.at(-2)));
    console.log('PASS: notification settings read/save/remount, rejected save and retry');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

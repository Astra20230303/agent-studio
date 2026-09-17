const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.__responses = [];
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = {
        connect: async () => ({ ok: true }), notify: async () => {}, request: async () => ({ ok: true, result: { data: [] } }),
        respond: async (id, result) => { if (window.__fail) return { ok: false, error: 'Retry test' }; window.__responses.push({ id, result }); return { ok: true }; },
        onNotification: fn => { window.__notify = fn; return () => {}; },
        onServerRequest: fn => { window.__ask = fn; return () => {}; },
        onError: () => () => {}, onStderr: () => () => {}, onClosed: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => !!window.__ask);
    const ask = (id, questions) => page.evaluate(({ id, questions }) => window.__ask({ id, method: 'item/tool/requestUserInput', params: { threadId: 'thread', questions } }), { id, questions });
    await ask(1, [
      { id: 'mode', header: 'Mode', question: 'Choose mode', isOther: true, options: [{ label: 'Local', description: 'Local workspace' }, { label: 'Remote', description: 'Remote workspace' }] },
      { id: 'detail', header: 'Detail', question: 'Project name' },
      { id: 'secret', header: 'Secret', question: 'Token', isSecret: true },
    ]);
    assert.equal(await page.getByRole('button', { name: '提交', exact: true }).isDisabled(), true);
    await page.getByRole('radio', { name: 'Local Local workspace' }).check();
    await page.getByRole('textbox', { name: 'Project name' }).fill('Felix');
    await page.getByLabel('Token', { exact: true }).fill('private-value');
    assert.equal(await page.getByLabel('Token', { exact: true }).getAttribute('type'), 'password');
    await ask(2, [{ id: 'next', header: 'Next', question: 'Second request' }]);
    await page.evaluate(() => { window.__fail = true; });
    await page.getByRole('button', { name: '提交', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('textbox', { name: 'Project name' }).inputValue(), 'Felix');
    await page.evaluate(() => { window.__fail = false; });
    const artifacts = path.resolve(__dirname, '../../.project-cache/ui-checks');
    fs.mkdirSync(artifacts, { recursive: true });
    await page.screenshot({ path: path.join(artifacts, 'user-input-desktop.png') });
    await page.getByRole('button', { name: '提交', exact: true }).click();
    await page.getByRole('textbox', { name: 'Second request' }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.__responses[0]), { id: 1, result: { answers: { mode: { answers: ['Local'] }, detail: { answers: ['Felix'] }, secret: { answers: ['private-value'] } } } });
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await page.waitForFunction(() => window.__responses.length === 2);
    assert.deepEqual(await page.evaluate(() => window.__responses[1].result), { answers: { next: { answers: [] } } });
    await ask(3, [{ id: 'custom', header: 'Custom', question: 'Choose target', isOther: true, options: [{ label: 'Default', description: 'Default target' }] }]);
    await page.getByRole('radio', { name: '其他', exact: true }).check();
    await page.getByRole('textbox', { name: 'Choose target' }).fill('Custom target');
    await page.setViewportSize({ width: 390, height: 720 });
    await page.screenshot({ path: path.join(artifacts, 'user-input-mobile.png') });
    assert.equal(await page.locator('.user-input-dialog').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await page.getByRole('button', { name: '提交', exact: true }).click();
    await page.waitForFunction(() => window.__responses.length === 3);
    assert.deepEqual(await page.evaluate(() => window.__responses[2].result), { answers: { custom: { answers: ['Custom target'] } } });
    await ask(4, [{ id: 'expired', header: 'Expired', question: 'Expired question' }]);
    await page.evaluate(() => window.__notify({ method: 'serverRequest/resolved', params: { threadId: 'thread', requestId: 4 } }));
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 2500 });
    assert.deepEqual(errors, []);
    console.log('PASS: answers, masking, queue, retry, cancel, custom option, responsive layout, resolved request');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

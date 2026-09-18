const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      if (!localStorage.getItem('codex-desktop-state-v1')) {
        localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: ['a', 'b'].map(id => ({ id, title: `Thread ${id}`, status: 'idle', messages: [], updatedAt: '' })) }));
        localStorage.setItem('felix-skill-drafts-v1', JSON.stringify({ a: [{ name: 'keep', path: 'D:/keep/SKILL.md' }, { name: 'remove', path: 'D:/remove/SKILL.md' }], b: [{ name: 'other', path: 'D:/other/SKILL.md' }] }));
      }
      window.__fail = true;
      const write = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { if (key === 'felix-skill-drafts-v1' && window.__fail) throw Error('quota'); return write.call(this, key, value); };
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async () => ({ ok: true, result: { data: [] } }), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const retry = page.getByRole('button', { name: '重试保存技能选择', exact: true });
    await retry.click();
    await page.getByRole('button', { name: '移除技能 remove', exact: true }).click();
    await page.getByRole('button', { name: 'Thread b', exact: true }).click();
    await page.getByRole('button', { name: '移除技能 other', exact: true }).waitFor();
    await retry.click();
    await page.getByRole('button', { name: 'Thread a', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: '移除技能 remove', exact: true }).count(), 0);
    await page.getByRole('button', { name: '移除技能 keep', exact: true }).waitFor();
    await page.evaluate(() => { window.__fail = false; });
    await retry.click(); await retry.waitFor({ state: 'detached' });
    const expected = { a: [{ name: 'keep', path: 'D:/keep/SKILL.md' }], b: [{ name: 'other', path: 'D:/other/SKILL.md' }] };
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-skill-drafts-v1'))), expected);
    await page.reload();
    await page.getByRole('button', { name: '移除技能 keep', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '移除技能 remove', exact: true }).count(), 0);
    await page.getByRole('button', { name: '移除技能 keep', exact: true }).click();
    await page.evaluate(() => { window.__fail = false; });
    await retry.click(); await retry.waitFor({ state: 'detached' });
    const cleared = await page.evaluate(() => JSON.parse(localStorage.getItem('felix-skill-drafts-v1')));
    assert.deepEqual(cleared.a, []);
    assert.deepEqual(cleared.b, expected.b);
    console.log('PASS: skill save retry preserves latest per-thread selection across quota failure and reload');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
   if (!localStorage.getItem('codex-desktop-state-v1')) localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', title: 'Private title', cwd: 'D:/private/project', status: 'completed', messages: [{ id: 'm', role: 'user', content: 'Private message' }], updatedAt: '' }] }));
   window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
   window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async () => ({ ok: true, result: { data: [] } }), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
  });
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
  await page.getByRole('button', { name: 'Private title', exact: true }).getByRole('button', { name: '置顶', exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads[0].pinned);
  await page.keyboard.press('Control+Shift+P');
  await page.getByRole('combobox', { name: '搜索命令' }).fill('取消置顶当前会话');
  await page.getByRole('option', { name: '取消置顶当前会话', exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads[0].pinned === false);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')).length === 2);
  const entries = await page.evaluate(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')));
  assert.deepEqual(entries.map(entry => entry.action), ['取消置顶会话', '置顶会话']);
  assert.ok(entries.every(entry => entry.detail === undefined));
  assert.ok(!JSON.stringify(entries).includes('Private') && !JSON.stringify(entries).includes('D:/'));
  await page.reload();
  await page.getByRole('button', { name: 'Private title', exact: true }).getByRole('button', { name: '置顶', exact: true }).waitFor();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('button', { name: '操作记录', exact: true }).click();
  const region = page.getByRole('region', { name: '操作记录', exact: true });
  await region.getByText('置顶会话', { exact: true }).waitFor();
  await region.getByText('取消置顶会话', { exact: true }).waitFor();
  console.log('PASS: sidebar and palette pin changes persist one privacy-safe audit event each and survive reload');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

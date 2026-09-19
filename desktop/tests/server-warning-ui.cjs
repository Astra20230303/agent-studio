const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      const listeners = new Set(); window.__emit = message => listeners.forEach(listener => listener(message));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async () => ({ ok: true, result: { data: [] } }), onNotification: listener => { listeners.add(listener); return () => listeners.delete(listener); }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => !!window.__emit);
    await page.evaluate(() => window.__emit({ method: 'warning', params: { message: '<b>Service warning</b>' } }));
    await page.getByRole('alert').getByText('<b>Service warning</b>', { exact: true }).waitFor();
    assert.equal(await page.getByRole('alert').locator('b').count(), 0);
    await page.getByRole('button', { name: '关闭服务警告' }).click();
    await page.getByText('<b>Service warning</b>', { exact: true }).waitFor({ state: 'detached' });
    await page.evaluate(() => {
      window.__emit({ method: 'warning', params: { message: 'First pending warning' } });
      window.__emit({ method: 'warning', params: { message: 'Second pending warning' } });
      window.__emit({ method: 'warning', params: { message: 'Third pending warning' } });
    });
    await page.getByRole('alert').filter({ hasText: 'First pending warning' }).waitFor();
    await page.getByText('（另有 2 条待处理警告）', { exact: true }).waitFor();
    assert.equal(await page.getByRole('alert').filter({ hasText: 'Second pending warning' }).count(), 0);
    await page.getByRole('button', { name: '关闭服务警告' }).click();
    await page.getByRole('alert').filter({ hasText: 'Second pending warning' }).waitFor();
    await page.getByText('（另有 1 条待处理警告）', { exact: true }).waitFor();
    await page.getByRole('button', { name: '关闭服务警告' }).click();
    await page.getByRole('alert').getByText('Third pending warning', { exact: true }).waitFor();
    await page.getByRole('button', { name: '关闭服务警告' }).click();
    await page.evaluate(() => {
      window.__emit({ method: 'warning', params: { message: 'Repeated warning' } });
      window.__emit({ method: 'warning', params: { message: 'Repeated warning' } });
    });
    const closeWarning = page.getByRole('button', { name: '关闭服务警告' });
    await closeWarning.focus();
    await closeWarning.press('Enter');
    await page.getByRole('alert').getByText('Repeated warning', { exact: true }).waitFor();
    assert.ok(await closeWarning.evaluate(element => element === document.activeElement));
    await page.evaluate(() => window.__emit({ method: 'warning', params: { message: 'Arrived while reading' } }));
    await page.getByText('（另有 1 条待处理警告）', { exact: true }).waitFor();
    await closeWarning.press('Enter');
    await page.getByRole('alert').getByText('Arrived while reading', { exact: true }).waitFor();
    assert.ok(await closeWarning.evaluate(element => element === document.activeElement));
    await closeWarning.press('Enter');
    await closeWarning.waitFor({ state: 'detached' });
    await page.evaluate(() => window.__emit({ method: 'warning', params: { threadId: 'background', message: 'Thread warning' } }));
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.some(thread => thread.remoteId === 'background' && thread.messages.some(message => message.content === '警告：Thread warning')));
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
    assert.notEqual(state.activeThreadId, state.threads.find(thread => thread.remoteId === 'background').id);
    await page.evaluate(() => {
      window.__emit({ method: 'warning', params: { threadId: 'background', message: 'Second warning' } });
      window.__emit({ method: 'warning', params: { threadId: 'background', message: null } });
      window.__emit({ method: 'warning', params: { message: '   ' } });
    });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(thread => thread.remoteId === 'background').messages.length === 2);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.filter(thread => thread.remoteId === 'background').length), 1);
    assert.equal(await page.getByRole('button', { name: '关闭服务警告' }).count(), 0);
    await page.evaluate(()=>{window.__emit({method:'configWarning',params:{summary:'Unknown option',details:'Replace <script>literal</script>\nRestart after editing',path:'D:/config.toml',range:{start:{line:3,column:7},end:{line:3,column:9}}}});window.__emit({method:'deprecationNotice',params:{summary:'Old option removed',details:'Use the replacement option'}});});
    const diagnostic=page.getByRole('alert').filter({hasText:'配置警告：Unknown option'});await diagnostic.waitFor();assert.ok((await diagnostic.textContent()).includes('第 3 行，第 7 列'));assert.equal(await diagnostic.locator('script').count(),0);
    await page.getByRole('button',{name:'关闭服务警告'}).click();await page.getByRole('alert').filter({hasText:'弃用提示：Old option removed'}).waitFor();await page.getByRole('button',{name:'关闭服务警告'}).click();
    await page.reload();
    assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.some(thread => thread.remoteId === 'background' && thread.messages.some(message => message.role === 'system'))));
    console.log('PASS: global warnings are literal and dismissible; background warnings persist without taking focus');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

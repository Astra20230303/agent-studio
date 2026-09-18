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
    await page.evaluate(() => {
      for (const event of [null, {}, { id: 'replacement', type: 'unknown', code: 0 }, { id: 'replacement', type: 'exit', code: '0' }, { id: 'replacement', type: 'data', data: { bad: true } }, { id: 'other-session', type: 'exit', code: 1 }]) window.__emit(event);
      window.__emit({ id: 'replacement', type: 'data', data: 'VALID_TERMINAL_OUTPUT\r\n' });
    });
    await page.waitForFunction(() => document.querySelector('.terminal-session:not([hidden]) .xterm-screen')?.textContent?.includes('VALID_TERMINAL_OUTPUT'));
    assert.equal(await status.textContent(), '运行中');
    assert.equal(await restart.isDisabled(), true);

    await page.evaluate(() => {
      window.__emit({ id: 'replacement', type: 'exit', code: 0 });
      window.__originalCreate = window.desktop.terminal.create;
      window.desktop.terminal.create = () => { throw Error('synchronous spawn failure'); };
    });
    await restart.click();
    await status.filter({ hasText: '启动失败' }).waitFor();
    await page.getByRole('alert').filter({ hasText: 'synchronous spawn failure' }).waitFor();
    assert.equal(await restart.isEnabled(), true);
    await page.evaluate(() => { window.desktop.terminal.create = window.__originalCreate; });
    for (const result of [{ ok: true }, { ok: true, id: '  ' }, { ok: 'yes', id: 'invalid' }]) {
      const count = await page.evaluate(() => window.__creates.length);
      await restart.click();
      await page.waitForFunction(count => window.__creates.length === count + 1, count);
      await page.evaluate(result => window.__creates.at(-1).resolve(result), result);
      await status.filter({ hasText: '启动失败' }).waitFor();
      assert.equal(await restart.isEnabled(), true);
    }
    const count = await page.evaluate(() => window.__creates.length);
    await restart.click();
    await page.waitForFunction(count => window.__creates.length === count + 1, count);
    // Exit can arrive before create acknowledgement; it must not leave running enabled.
    await page.evaluate(() => {
      for (let i = 0; i < 1100; i++) window.__emit({ id: 'already-exited', type: 'invalid' });
      window.__emit({ id: 'already-exited', type: 'exit', code: 7 });
      window.__creates.at(-1).resolve({ ok: true, id: 'already-exited' });
    });
    await status.filter({ hasText: '已退出 (7)' }).waitFor();
    assert.equal(await restart.isEnabled(), true);
    assert.equal(await page.getByRole('button', { name: '终止终端', exact: true }).isDisabled(), true);
    await page.evaluate(() => {
      window.desktop.saveTerminal = async input => { window.__exported = input.content; return { ok: true }; };
      window.__emit({ id: 'already-exited', type: 'exit', code: 99 });
      window.__emit({ id: 'already-exited', type: 'data', data: 'LATE_OUTPUT_MUST_NOT_APPEAR\r\n' });
    });
    assert.equal(await status.textContent(), '已退出 (7)');
    await page.getByRole('button', { name: '导出终端日志', exact: true }).click();
    await page.getByText('已导出当前终端缓冲区', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__exported), '');
    const overflowCount = await page.evaluate(() => window.__creates.length);
    await restart.click();
    await page.waitForFunction(count => window.__creates.length === count + 1, overflowCount);
    await page.evaluate(() => {
      window.__emit({ id: 'overflow', type: 'data', data: 'x'.repeat(1024 * 1024 + 1) });
      window.__emit({ id: 'overflow', type: 'exit', code: 42 });
      window.__creates.at(-1).resolve({ ok: true, id: 'overflow' });
    });
    await status.filter({ hasText: '已退出 (42)' }).waitFor();
    await page.getByRole('alert').filter({ hasText: '日志可能不完整' }).waitFor();
    assert.equal(await restart.isEnabled(), true);
    await page.getByRole('button', { name: '导出终端日志', exact: true }).click();
    await page.getByText('已导出当前终端缓冲区', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__exported), '');
    console.log('PASS: bounded startup output reports truncation and preserves exit status, event validation and retry');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

const { chromium } = require('playwright');
const { TerminalManager } = require('../electron/terminal.cjs');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const events = [];
  const manager = new TerminalManager(event => { events.push(event); void page.evaluate(message => window.__terminalEvent?.(message), event).catch(() => {}); });
  try {
    await page.exposeFunction('__createTerminal', cwd => ({ ok: true, ...manager.create(cwd) }));
    await page.exposeFunction('__writeTerminal', (id, data) => manager.write(id, data));
    await page.exposeFunction('__resizeTerminal', (id, cols, rows) => manager.resize(id, cols, rows));
    await page.exposeFunction('__closeTerminal', id => manager.close(id));
    await page.addInitScript(({ cwd, second }) => {
      const listeners = new Set();
      window.__terminalEvent = event => listeners.forEach(listener => listener(event));
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'terminal-test', model: 'test', threads: [{ id: 'terminal-test', title: 'Terminal test', cwd, messages: [], updatedAt: new Date().toISOString() }, { id: 'second-project', title: 'Second project', cwd: second, messages: [], updatedAt: new Date().toISOString() }] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), terminal: {
        create: window.__createTerminal, write: window.__writeTerminal, resize: window.__resizeTerminal, close: window.__closeTerminal,
        onData: listener => { listeners.add(listener); return () => listeners.delete(listener); }
      }};
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    }, { cwd: process.cwd(), second: path.resolve('..') });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '打开终端', exact: true }).click();
    await page.locator('.terminal-panel').getByRole('status').filter({ hasText: '运行中' }).waitFor();
    await page.locator('.xterm-helper-textarea').focus();
    await page.keyboard.type("Write-Output ('FELIX_' + 'PTY_OK'); (Get-Location).Path");
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.xterm-screen')?.textContent?.includes('FELIX_PTY_OK'));
    assert.ok(events.some(event => event.data?.includes('FELIX_PTY_OK')));
    assert.ok(events.map(event => event.data || '').join('').includes(process.cwd()));
    await page.keyboard.type("Write-Output ('SLEEP_' + 'START'); Start-Sleep -Seconds 60");
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.xterm-screen')?.textContent?.includes('SLEEP_START'));
    const promptCount = await page.locator('.xterm-screen').evaluate(node => (node.textContent.match(/PS /g) || []).length);
    await page.keyboard.press('Control+c');
    await page.waitForFunction(count => (document.querySelector('.xterm-screen')?.textContent?.match(/PS /g) || []).length > count, promptCount);
    await page.keyboard.type("Write-Output ('INTERRUPT_' + 'OK')");
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.xterm-screen')?.textContent?.includes('INTERRUPT_OK'));
    const ids = [...manager.sessions.keys()];
    assert.equal(ids.length, 1);
    await page.getByRole('button', { name: '隐藏终端' }).click();
    await page.getByRole('button', { name: '打开终端' }).click();
    assert.deepEqual([...manager.sessions.keys()], ids);
    await page.getByRole('button', { name: 'Second project', exact: true }).click();
    await page.getByRole('button', { name: '新建终端', exact: true }).click();
    await page.getByRole('tabpanel').getByRole('status').filter({ hasText: '运行中' }).waitFor();
    assert.equal(manager.sessions.size, 2);
    assert.equal(await page.locator('.terminal-session:not([hidden]) header span').getAttribute('title'), path.resolve('..'));
    await page.locator('.terminal-session:not([hidden]) .xterm-helper-textarea').focus();
    await page.keyboard.type("Write-Output ('SECOND_' + 'SESSION')");
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.terminal-session:not([hidden]) .xterm-screen')?.textContent?.includes('SECOND_SESSION'));
    await page.getByRole('tab', { name: '终端 1', exact: true }).click();
    assert.equal(await page.locator('.terminal-session:not([hidden]) header span').getAttribute('title'), process.cwd());
    assert.equal(await page.locator('.terminal-session:not([hidden]) .xterm-screen').evaluate(node => node.textContent.includes('SECOND_SESSION')), false);
    await page.getByRole('tab', { name: '终端 1', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: '终端 2', exact: true }).getAttribute('aria-selected'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'terminal-tab-2');
    await page.getByRole('button', { name: '关闭当前终端', exact: true }).click();
    assert.deepEqual([...manager.sessions.keys()], ids);
    const composer = await page.locator('.composer').boundingBox();
    const panel = await page.locator('.terminal-panel').boundingBox();
    assert.ok(composer.y + composer.height <= panel.y + 1, 'Terminal must not cover composer');
    fs.mkdirSync(path.resolve('../.project-cache/ui-checks'), { recursive: true });
    await page.screenshot({ path: '../.project-cache/ui-checks/terminal-desktop.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    const box = await page.locator('.terminal-panel').boundingBox();
    assert.ok(box.width <= 390);
    await page.screenshot({ path: '../.project-cache/ui-checks/terminal-mobile.png' });
    await page.getByRole('button', { name: '终止终端', exact: true }).click();
    await page.locator('.terminal-panel').getByRole('status').filter({ hasText: '已退出' }).waitFor();
    assert.equal(manager.sessions.size, 0);
    await page.getByRole('button', { name: '重新启动终端' }).click();
    await page.locator('.terminal-panel').getByRole('status').filter({ hasText: '运行中' }).waitFor();
    await page.getByRole('button', { name: '关闭当前终端', exact: true }).click();
    assert.equal(await page.getByRole('tab').count(), 0);
    await page.getByRole('button', { name: '新建终端', exact: true }).click();
    await page.getByRole('tabpanel').getByRole('status').filter({ hasText: '运行中' }).waitFor();
    assert.equal(manager.sessions.size, 1);
    console.log('PASS: real PowerShell output, xterm input, retained session, resize, stop and restart');
  } finally { await manager.closeAll(); await browser.close(); }
})().then(() => process.exit(0), error => { console.error(error); process.exit(1); });

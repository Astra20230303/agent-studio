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
    await page.addInitScript(cwd => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'terminal-test', model: 'test', threads: [{ id: 'terminal-test', title: 'Terminal test', cwd, messages: [], updatedAt: new Date().toISOString() }] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), terminal: {
        create: window.__createTerminal, write: window.__writeTerminal, resize: window.__resizeTerminal, close: window.__closeTerminal,
        onData: listener => { window.__terminalEvent = listener; return () => { window.__terminalEvent = undefined; }; }
      }};
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    }, process.cwd());
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '打开终端', exact: true }).click();
    await page.locator('.terminal-panel').getByRole('status').filter({ hasText: '运行中' }).waitFor();
    await page.locator('.xterm-helper-textarea').focus();
    await page.keyboard.type("Write-Output ('FELIX_' + 'PTY_OK'); (Get-Location).Path");
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.xterm-screen')?.textContent?.includes('FELIX_PTY_OK'));
    assert.ok(events.some(event => event.data?.includes('FELIX_PTY_OK')));
    const ids = [...manager.sessions.keys()];
    assert.equal(ids.length, 1);
    await page.getByRole('button', { name: '隐藏终端' }).click();
    await page.getByRole('button', { name: '打开终端' }).click();
    assert.deepEqual([...manager.sessions.keys()], ids);
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
    console.log('PASS: real PowerShell output, xterm input, retained session, resize, stop and restart');
  } finally { manager.closeAll(); await browser.close(); }
})().then(() => process.exit(0), error => { console.error(error); process.exit(1); });

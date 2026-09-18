const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.evaluate(async () => {
      const reactModule = await import('/node_modules/.vite/deps/react.js');
      const React = reactModule.default || reactModule;
      const client = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { createRoot } = client.default || client;
      const { CommandPalette } = await import('/src/CommandPalette.tsx');
      const host = document.createElement('div'); document.body.append(host);
      const root = createRoot(host);
      window.__executed = [];
      window.__renderCommands = ids => root.render(React.createElement(CommandPalette, {
        commands: ids.map(id => ({ id, label: id, keywords: id, run: () => window.__executed.push(id) })), onClose: () => {},
      }));
      window.__renderCommands(['alpha', 'beta', 'gamma']);
    });
    const search = page.getByRole('combobox', { name: '搜索命令', exact: true });
    await search.waitFor(); await search.press('ArrowDown');
    assert.equal(await search.getAttribute('aria-activedescendant'), 'app-command-beta');
    await page.evaluate(() => window.__renderCommands(['gamma', 'alpha', 'beta']));
    await page.waitForFunction(() => document.querySelector('[aria-selected="true"]')?.textContent === 'beta');
    assert.equal(await search.getAttribute('aria-activedescendant'), 'app-command-beta');
    await search.press('ArrowDown');
    assert.equal(await search.getAttribute('aria-activedescendant'), 'app-command-gamma');
    await search.press('End');
    assert.equal(await search.getAttribute('aria-activedescendant'), 'app-command-beta');
    await search.press('Home');
    assert.equal(await search.getAttribute('aria-activedescendant'), 'app-command-gamma');
    await page.evaluate(() => window.__renderCommands(['alpha', 'beta']));
    await page.waitForFunction(() => document.querySelector('[aria-selected="true"]')?.textContent === 'alpha');
    await search.fill('no-match');
    for (const key of ['Home', 'End', 'ArrowUp', 'ArrowDown', 'Enter']) await search.press(key);
    assert.equal(await search.getAttribute('aria-activedescendant'), null);
    assert.equal(await page.locator('[aria-selected="true"]').count(), 0);
    assert.deepEqual(await page.evaluate(() => window.__executed), []);
    await search.fill('');
    await page.waitForFunction(() => document.querySelector('[aria-selected="true"]')?.textContent === 'alpha');
    await search.press('ArrowUp');
    assert.equal(await search.getAttribute('aria-activedescendant'), 'app-command-beta');
    await search.fill('beta'); await search.press('Enter');
    await page.waitForFunction(() => window.__executed.length === 1);
    assert.deepEqual(await page.evaluate(() => window.__executed), ['beta']);
    console.log('PASS: command identity survives reorder, removed selection falls back, cyclic arrows and Home/End execute matching command');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

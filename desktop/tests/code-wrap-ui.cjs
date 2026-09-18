const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 600, height: 800 } });
  const source = '  const url = "' + 'long-path/'.repeat(90) + '";\n\tconsole.log(url);';
  await page.addInitScript(source => {
   Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.__copied = text; } } });
   const content = '```js\n' + source + '\n```\n\n```text\nsecond block\n```';
   localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 't', threads: [{ id: 't', title: 'Code wrap', status: 'completed', updatedAt: '', messages: [{ id: 'm', role: 'assistant', content, createdAt: '' }] }] }));
  }, source);
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
  const blocks = page.locator('.code-block');
  await blocks.first().waitFor();
  const pre = blocks.first().locator('pre');
  const toggle = blocks.first().getByRole('button', { name: '代码自动换行', exact: true });
  assert.equal(await pre.evaluate(node => node.scrollWidth > node.clientWidth), true);
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(await blocks.nth(1).getByRole('button', { name: '代码自动换行', exact: true }).getAttribute('aria-pressed'), 'false');
  assert.equal(await pre.evaluate(node => node.scrollWidth <= node.clientWidth + 1), true);
  assert.equal(await pre.locator('code').textContent(), source);
  await blocks.first().getByRole('button', { name: '复制代码', exact: true }).click();
  await page.waitForFunction(() => typeof window.__copied === 'string');
  assert.equal(await page.evaluate(() => window.__copied), source);
  await toggle.focus(); await page.keyboard.press('Space');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  await pre.focus();
  assert.equal(await pre.evaluate(node => node === document.activeElement), true);
  await page.keyboard.press('ArrowRight');
  await page.evaluate(async () => {
   const { default: React } = await import('/node_modules/.vite/deps/react.js');
   const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
   const { CodeBlock } = await import('/src/CodeBlock.tsx');
   const host = document.createElement('div'); host.id = 'updating-code'; document.body.appendChild(host);
   const root = ReactDOM.createRoot(host);
   window.__updateCode = source => root.render(React.createElement(CodeBlock, { source, language: 'text' }));
   window.__updateCode('partial');
  });
  const updating = page.locator('#updating-code');
  await updating.getByRole('button', { name: '代码自动换行', exact: true }).click();
  await page.evaluate(() => window.__updateCode('partial\ncompleted 中文'));
  await updating.locator('code').filter({ hasText: 'completed 中文' }).waitFor();
  assert.equal(await updating.getByRole('button', { name: '代码自动换行', exact: true }).getAttribute('aria-pressed'), 'true');
  await updating.getByRole('button', { name: '复制代码', exact: true }).click();
  await page.waitForFunction(() => window.__copied === 'partial\ncompleted 中文');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.getByRole('button', { name: '展开侧栏', exact: true }).count(), 1);
  await blocks.first().getByRole('button', { name: '代码自动换行', exact: true }).click();
  assert.equal(await pre.evaluate(node => node.scrollWidth <= node.clientWidth + 1), true);
  console.log('PASS: independent code wrap, exact copy, keyboard access, 390px layout and incremental source updates');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

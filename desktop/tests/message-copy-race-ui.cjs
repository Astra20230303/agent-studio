const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage();
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
  await page.evaluate(async () => {
   const { default: React } = await import('/node_modules/.vite/deps/react.js');
   const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
   const { MessageActions } = await import('/src/ReplyActions.tsx');
   const { UserMessageCopy } = await import('/src/UserMessageCopy.tsx');
   const host = document.createElement('div'); host.id = 'copy-race'; document.body.appendChild(host);
   const root = ReactDOM.createRoot(host); window.__copies = []; window.__errors = [];
   Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: text => new Promise((resolve, reject) => window.__copies.push({ text, resolve, reject })) } });
   window.__renderCopy = (kind, content) => root.render(React.createElement(kind === 'user' ? UserMessageCopy : MessageActions, { content, onError: error => window.__errors.push(error), onFork: async () => {}, disabled: true }));
  });
  const host = page.locator('#copy-race');
  for (const kind of ['user', 'assistant']) {
   await page.evaluate(kind => window.__renderCopy(kind, 'old content'), kind);
   const button = host.locator('button').first();
   const count = await page.evaluate(() => window.__copies.length);
   await button.evaluate(node => { node.click(); node.click(); });
   await page.waitForFunction(count => window.__copies.length === count + 1, count);
   assert.equal(await button.isDisabled(), true);
   await page.evaluate(kind => window.__renderCopy(kind, 'new content'), kind);
   await page.evaluate(() => window.__copies.at(-1).resolve());
   await page.waitForFunction(() => !document.querySelector('#copy-race button').disabled);
   assert.equal((await button.getAttribute('aria-label')).includes('已复制'), false);
   await button.click();
   assert.equal(await page.evaluate(() => window.__copies.at(-1).text), 'new content');
   await page.evaluate(() => window.__copies.at(-1).reject(Error('denied')));
   await page.waitForFunction(() => !document.querySelector('#copy-race button').disabled);
   assert.equal((await button.getAttribute('aria-label')).includes('已复制'), false);
   await button.click();
   await page.evaluate(() => window.__copies.at(-1).resolve());
   await page.waitForFunction(() => document.querySelector('#copy-race button').getAttribute('aria-label').includes('已复制'));
  }
  assert.equal(await page.evaluate(() => window.__errors.length), 2);
  console.log('PASS: user and assistant copy deduplicate, preserve snapshots, ignore stale success and retry failures');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

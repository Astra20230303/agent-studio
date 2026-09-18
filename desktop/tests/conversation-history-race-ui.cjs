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
   const { ConversationFind } = await import('/src/ConversationFind.tsx');
   const host = document.createElement('div'); host.id = 'history-race'; document.body.appendChild(host);
   const root = ReactDOM.createRoot(host); const view = { current: host }; const searching = { current: false };
   window.__loads = [];
   const loadHistory = options => new Promise((resolve, reject) => window.__loads.push({ options, resolve, reject }));
   window.__renderFind = reset => root.render(React.createElement(ConversationFind, { messages: [], view, searching, loadHistory, reset }));
   window.__renderFind(0);
  });
  const host = page.locator('#history-race');
  const open = host.getByRole('button', { name: '会话内查找', exact: true });
  const load = host.getByRole('button', { name: '加载完整历史', exact: true });
  await open.click(); await load.click();
  await page.waitForFunction(() => window.__loads.length === 1);
  await page.evaluate(() => window.__renderFind(1));
  await page.waitForFunction(() => window.__loads[0].options.signal.aborted);
  await open.click(); await load.click();
  await page.waitForFunction(() => window.__loads.length === 2);
  await page.evaluate(() => {
   window.__loads[1].options.onProgress({ pages: 2, items: 20 });
   window.__loads[0].options.onProgress({ pages: 99, items: 999 });
   window.__loads[0].resolve();
  });
  await host.getByText('已读取 2 页，20 条记录', { exact: true }).waitFor();
  assert.equal(await host.getByRole('button', { name: '正在加载历史…', exact: true }).isDisabled(), true);
  await host.getByRole('button', { name: '取消加载历史', exact: true }).click();
  await page.evaluate(() => { window.__loads[1].options.onProgress({ pages: 3, items: 30 }); window.__loads[1].resolve(); });
  await host.getByText('已取消加载，已有消息保留', { exact: true }).waitFor();
  await load.click();
  await page.waitForFunction(() => window.__loads.length === 3);
  await page.evaluate(() => window.__loads[2].resolve());
  await host.getByText('历史已加载，可查找消息和工具记录', { exact: true }).waitFor();
  await load.click();
  await page.waitForFunction(() => window.__loads.length === 4);
  await page.evaluate(() => window.__renderFind(2));
  await page.waitForFunction(() => window.__loads[3].options.signal.aborted);
  await open.click(); await load.click();
  await page.waitForFunction(() => window.__loads.length === 5);
  await page.evaluate(() => {
   window.__loads[4].options.onProgress({ pages: 1, items: 10 });
   window.__loads[3].reject(Error('stale failure'));
  });
  await host.getByText('已读取 1 页，10 条记录', { exact: true }).waitFor();
  assert.equal(await host.getByRole('button', { name: '正在加载历史…', exact: true }).isDisabled(), true);
  await page.evaluate(() => window.__loads[4].reject(Error('current failure')));
  await host.getByText('加载失败：current failure', { exact: true }).waitFor();
  await load.click();
  await page.waitForFunction(() => window.__loads.length === 6);
  await page.evaluate(() => window.__loads[5].resolve());
  await host.getByText('历史已加载，可查找消息和工具记录', { exact: true }).waitFor();
  console.log('PASS: stale progress/success/failure isolation, cancellation, current failure and successful retry');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

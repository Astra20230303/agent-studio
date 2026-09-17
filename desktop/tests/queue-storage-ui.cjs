const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.evaluate(async () => {
      const { default: React } = await import('/node_modules/.vite/deps/react.js');
      const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { useTurnQueue } = await import('/src/useTurnQueue.ts');
      const key = 'felix-turn-queue-v1';
      window.__item = { id: 'q', localId: 'a', threadId: 'a', text: 'keep me', model: 'test', effort: 'low', plugins: [], status: 'waiting' };
      localStorage.setItem(key, JSON.stringify([window.__item]));
      const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key) { if (key === 'felix-turn-queue-v1' && window.__readFail) throw Error('read denied'); return get.call(this, key); };
      Storage.prototype.setItem = function (key, value) { if (key === 'felix-turn-queue-v1' && window.__writeFail) throw Error('quota'); return set.call(this, key, value); };
      const host = document.createElement('div'); document.body.append(host);
      const root = ReactDOM.createRoot(host);
      function Harness() { window.__queue = useTurnQueue(); return React.createElement('div', null, String(window.__queue.saveFailed)); }
      window.__mount = () => root.render(React.createElement(Harness, { key: Math.random() }));
      window.__readFail = true; window.__mount();
    });
    await page.waitForFunction(() => window.__queue?.saveFailed);
    assert.equal(await page.evaluate(() => window.__queue.change(() => [], true)), false);
    await page.evaluate(() => { window.__readFail = false; window.__queue.retry(); });
    await page.waitForFunction(() => window.__queue.items.length === 1 && !window.__queue.saveFailed);
    await page.evaluate(() => { window.__writeFail = true; window.__accepted = window.__queue.change(items => [...items, { ...window.__item, id: 'new' }], true); });
    await page.waitForFunction(() => window.__queue.saveFailed);
    assert.equal(await page.evaluate(() => window.__accepted), false);
    assert.equal(await page.evaluate(() => window.__queue.items.length), 1);
    assert.equal(await page.evaluate(() => window.__queue.items[0].status), 'paused');
    assert.equal(await page.evaluate(() => window.__queue.change(items => items.map(item => ({ ...item, status: 'sending' })), true)), false);
    await page.evaluate(() => window.__queue.change(() => []));
    await page.waitForFunction(() => window.__queue.items.length === 0);
    await page.evaluate(() => { window.__writeFail = false; window.__queue.retry(); });
    await page.waitForFunction(() => !window.__queue.saveFailed);
    assert.equal(await page.evaluate(() => localStorage.getItem('felix-turn-queue-v1')), '[]');
    assert.deepEqual(errors, []);
    console.log('PASS: unread queue protected, failed enqueue/send blocked, in-memory removal and retry persisted');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

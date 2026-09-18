const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const cases = [
   { hook: 'useThreadDraft', key: 'felix-thread-drafts-v1', edited: 'new message', restored: 'old message', empty: '', label: '消息草稿' },
   { hook: 'useAttachmentDraft', key: 'felix-attachments-v1', edited: ['D:/new.txt'], restored: ['D:/old.txt'], empty: [], label: '附件' },
   { hook: 'usePluginDraft', key: 'felix-plugin-drafts-v1', edited: [{ id: 'new', name: 'New' }], restored: [{ id: 'old', name: 'Old' }], empty: [], label: '插件选择' },
  ];
  for (const fixture of cases) {
   const page = await browser.newPage();
   await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
   await page.evaluate(async fixture => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const module = await import(`/src/${fixture.hook}.ts`);
    const host = document.createElement('div'); document.body.append(host);
    const root = ReactDOM.createRoot(host);
    function Harness() { window.__draft = module[fixture.hook]('a'); return null; }
    window.__mountDraft = () => root.render(React.createElement(Harness, { key: Math.random() }));
   }, fixture);
   for (const raw of ['{broken', 'null', '[]', JSON.stringify({ a: fixture.restored, b: null })]) {
    await page.evaluate(({ key, raw }) => { localStorage.setItem(key, raw); window.__mountDraft(); }, { key: fixture.key, raw });
    await page.waitForFunction(() => window.__draft[2].readFailed);
    await page.evaluate(f => { window.__draft[1](f.edited); window.__draft[1](f.empty, 'b'); }, fixture);
    await page.waitForFunction(edited => JSON.stringify(window.__draft[0]) === JSON.stringify(edited), fixture.edited);
    await page.evaluate(() => window.__draft[2].retry());
    assert.equal(await page.evaluate(key => localStorage.getItem(key), fixture.key), raw);
    await page.evaluate(f => { localStorage.setItem(f.key, JSON.stringify({ a: f.restored, b: f.restored, c: f.restored })); window.__draft[2].retry(); }, fixture);
    await page.waitForFunction(() => !window.__draft[2].readFailed);
    await page.waitForFunction(f => JSON.stringify(JSON.parse(localStorage.getItem(f.key)).a) === JSON.stringify(f.edited), fixture);
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), fixture.key), { a: fixture.edited, c: fixture.restored });
   }
   await page.close();
   const app = await browser.newPage();
   await app.addInitScript(key => localStorage.setItem(key, '{broken'), fixture.key);
   await app.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
   const retry = app.getByRole('button', { name: `重试读取${fixture.label}`, exact: true });
   await retry.click();
   assert.equal(await app.evaluate(key => localStorage.getItem(key), fixture.key), '{broken');
   await app.evaluate(f => localStorage.setItem(f.key, JSON.stringify({ new: f.restored })), fixture);
   await retry.click(); await retry.waitFor({ state: 'detached' });
   await app.close();
  }
  console.log('PASS: message/attachment/plugin corrupt drafts protected; recovery merges edits, explicit clearing and untouched threads; app retry controls work');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

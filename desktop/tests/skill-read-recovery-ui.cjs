const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage();
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
  await page.evaluate(async () => {
   const { default: React } = await import('/node_modules/.vite/deps/react.js');
   const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
   const { useSkillDraft } = await import('/src/useSkillDraft.ts');
   const host = document.createElement('div'); document.body.append(host);
   const root = ReactDOM.createRoot(host);
   function Harness() { window.__skill = useSkillDraft('a'); return null; }
   window.__mountSkill = () => root.render(React.createElement(Harness, { key: Math.random() }));
  });
  for (const raw of ['{broken', 'null', '[]', '{"a":[{"name":"keep","path":"x"}],"b":[null]}']) {
   await page.evaluate(raw => { localStorage.setItem('felix-skill-drafts-v1', raw); window.__mountSkill(); }, raw);
   await page.waitForFunction(() => window.__skill[2].readFailed);
   await page.evaluate(() => { window.__skill[1]([{ name: 'edited', path: 'new' }]); window.__skill[1]([], 'b'); });
   await page.waitForFunction(() => window.__skill[0][0]?.name === 'edited');
   await page.evaluate(() => window.__skill[2].retry());
   assert.equal(await page.evaluate(() => localStorage.getItem('felix-skill-drafts-v1')), raw);
   await page.evaluate(() => {
    localStorage.setItem('felix-skill-drafts-v1', JSON.stringify({ a: [{ name: 'old', path: 'old' }], b: [{ name: 'removed', path: 'b' }], c: [{ name: 'retained', path: 'c' }] }));
    window.__skill[2].retry();
   });
   await page.waitForFunction(() => !window.__skill[2].readFailed);
   await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-skill-drafts-v1')).a[0].name === 'edited');
   assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-skill-drafts-v1'))), { a: [{ name: 'edited', path: 'new' }], b: [], c: [{ name: 'retained', path: 'c' }] });
  }
  const app = await browser.newPage();
  await app.addInitScript(() => localStorage.setItem('felix-skill-drafts-v1', '{broken'));
  await app.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
  const retry = app.getByRole('button', { name: '重试读取技能选择', exact: true });
  await retry.click();
  assert.equal(await app.evaluate(() => localStorage.getItem('felix-skill-drafts-v1')), '{broken');
  await app.evaluate(() => localStorage.setItem('felix-skill-drafts-v1', JSON.stringify({ new: [{ name: 'restored', path: 'D:/restored/SKILL.md' }] })));
  await retry.click(); await retry.waitFor({ state: 'detached' });
  await app.getByRole('button', { name: '移除技能 restored', exact: true }).waitFor();
  console.log('PASS: corrupt skill drafts stay untouched; repaired reads merge edits and explicit removal without losing other threads');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

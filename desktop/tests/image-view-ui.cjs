const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { artifactRequest } = require('../electron/artifacts.cjs');
const { restoreMessages } = require('../src/toolActivity.ts');

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-image-view-'));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const picture = path.join(root, 'picture.png');
    await fs.writeFile(picture, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));
    const page = await browser.newPage(); const reads = [];
    await page.exposeFunction('readImageFixture', async input => {
      if (input.path === 'picture.png') reads.push(input);
      try { return { ok: true, result: await artifactRequest(root, input) }; }
      catch (error) { return { ok: false, error: error.message }; }
    });
    const messages = restoreMessages([{ turnId: 'turn', item: { id: 'view', type: 'imageView', path: 'picture.png' } }], []);
    await page.addInitScript(({ root, messages }) => {
      if (!sessionStorage.getItem('image-fixture-seeded')) {
        localStorage.setItem('codex-desktop-state-v1', JSON.stringify({activeThreadId:'images',threads:[{id:'images',title:'Images',cwd:root,status:'completed',messages,updatedAt:''}]}));
        sessionStorage.setItem('image-fixture-seeded', 'true');
      }
      window.desktop = { artifact: input => window.readImageFixture(input) };
    }, { root, messages });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const panel = page.getByRole('region', { name: '图片查看结果' });
    await panel.getByRole('img', { name: 'picture.png' }).waitFor();
    await page.waitForFunction(() => document.querySelector('.artifact-image')?.naturalWidth === 1);
    assert.ok(reads.some(input => input.root === root));
    assert.equal(await panel.getByRole('link').getAttribute('download'), 'picture.png');
    await fs.rename(picture, picture + '.saved');
    await panel.getByRole('button', { name: '重新读取图片' }).click();
    await panel.getByText(/ENOENT/).waitFor();
    await fs.rename(picture + '.saved', picture);
    await panel.getByRole('button', { name: '重新读取图片' }).click();
    await panel.getByRole('img').waitFor();
    const count = reads.length;
    await page.evaluate(messages => { const state=JSON.parse(localStorage.getItem('codex-desktop-state-v1'));state.threads[0].messages=messages;localStorage.setItem('codex-desktop-state-v1',JSON.stringify(state)); }, restoreMessages([{ type: 'imageView', id: 'bad', path: 'https://example.com/private.png' }], []));
    await page.reload();
    await panel.getByRole('alert').waitFor();
    assert.equal(reads.length, count);
    assert.equal(await panel.getByRole('img').count(), 0);
    console.log('PASS: restored image tool renders real workspace image, downloads, retries and rejects nonlocal paths');
  } finally { await browser.close(); await fs.rm(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });

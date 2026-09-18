const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [
      { id: 'a', title: 'Same title', cwd: 'D:/alpha', messages: [], status: 'completed', updatedAt: '' },
      { id: 'b', title: 'Same title', cwd: 'D:/beta/' + 'long-directory/'.repeat(20), messages: [], status: 'completed', updatedAt: '' },
      { id: 'c', title: 'No workspace', messages: [], status: 'completed', updatedAt: '' },
    ] })));
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5329');
    const rows = page.locator('.recent');
    await rows.first().waitFor();
    const a = rows.filter({ hasText: 'D:/alpha' });
    const b = rows.filter({ hasText: 'D:/beta/' });
    assert.equal(await a.getAttribute('aria-label'), 'Same title');
    assert.equal(await a.getAttribute('title'), 'Same title\nD:/alpha');
    const desc = await a.getAttribute('aria-describedby');
    assert.equal(await page.locator(`[id="${desc}"]`).innerText(), 'D:/alpha');
    await b.click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).activeThreadId === 'b');
    await b.getByRole('button', { name: '置顶', exact: true }).click();
    assert.ok(await b.getByRole('button', { name: '取消置顶', exact: true }).count());
    const directory = path.resolve(__dirname, '../../.project-cache/ui-checks'); fs.mkdirSync(directory, { recursive: true });
    for (const width of [1280, 600]) {
      await page.setViewportSize({ width, height: 820 });
      for (const row of await rows.all()) {
        const box = await row.boundingBox();
        for (const label of await row.locator('.thread-title-viewport, .thread-workspace').all()) {
          const rect = await label.boundingBox();
          assert.ok(rect.y >= box.y && rect.y + rect.height <= box.y + box.height + 1);
          assert.ok(rect.x + rect.width <= box.x + box.width + 1);
        }
      }
      await page.screenshot({ path: path.join(directory, `thread-workspaces-${width}.png`) });
    }
    console.log('PASS: same-title workspace descriptions, navigation, pin actions and stable desktop/narrow row bounds');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

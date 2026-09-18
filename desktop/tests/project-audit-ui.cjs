const { chromium } = require('playwright');
const assert = require('node:assert/strict');

async function openCase(browser, pickProject) {
  const page = await browser.newPage();
  await page.addInitScript(({ pickMode }) => {
    localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', model: 'test', threads: [{ id: 'a', title: 'Current', status: 'completed', messages: [], updatedAt: new Date().toISOString() }] }));
    localStorage.setItem('felix-audit-log-v1', '[]');
    window.desktop = {
      providerStatus: async () => ({ keyConfigured: true }),
      listModels: async () => ({ ok: true, models: ['test'] }),
      getProjectRoot: async () => 'D:/Felix',
      pickProject: async () => pickMode === 'cancel' ? null : (() => { throw Error('picker failed'); })(),
    };
    window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async () => ({ ok: true, result: { data: [] } }), onNotification: () => () => {}, onClosed: () => () => {}, onServerRequest: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
  }, { pickMode: pickProject });
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5329');
  await page.locator('.project-strip .project').click();
  await page.getByRole('button', { name: '打开文件夹…', exact: true }).click();
  await page.waitForTimeout(100);
  return page;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const mode of ['cancel', 'failure']) {
      const page = await openCase(browser, mode);
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-audit-log-v1'))), []);
      await page.close();
    }
    console.log('PASS: canceled and failed project pickers do not create success audit entries');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

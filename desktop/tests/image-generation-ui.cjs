const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { restoreMessages, applyToolEvent } = require('../src/toolActivity.ts');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
    const messages = restoreMessages([
      { id: 'done', type: 'imageGeneration', status: 'completed', result: png, revisedPrompt: '<b>Draw a tree</b>' },
      { id: 'running', type: 'imageGeneration', status: 'inProgress', result: '' },
      { id: 'failed', type: 'imageGeneration', status: 'failed', result: png, failure: { type: 'usageLimitExceeded', limitId: 'image', resetsAt: null } },
      { id: 'bad', type: 'imageGeneration', status: 'completed', result: 'https://example.com/image.png' }
    ], []);
    await page.addInitScript(messages => localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{id:'a',title:'Images',status:'completed',messages,updatedAt:''}] })), messages);
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByText('正在生成图片…', {exact:true}).waitFor();
    await page.getByText('图片生成额度已用完，请稍后重试。', {exact:true}).waitFor();
    await page.getByText('未提供可预览的图片结果。', {exact:true}).waitFor();
    await page.waitForFunction(() => document.querySelector('img[alt="生成的图片"]')?.naturalWidth === 1);
    assert.equal(await page.getByRole('img', {name:'生成的图片',exact:true}).count(), 1);
    assert.equal(await page.getByRole('link', {name:'下载生成图片',exact:true}).getAttribute('download'), 'generated.png');
    await page.getByText('生成提示词',{exact:true}).click();
    await page.getByText('<b>Draw a tree</b>',{exact:true}).waitFor();
    const thread = { messages: restoreMessages([{ id: 'live', type: 'imageGeneration', status: 'inProgress', result: '' }], []) };
    applyToolEvent(thread, 'item/completed', { turnId: 'turn', item: { id: 'live', type: 'imageGeneration', status: 'completed', result: png } });
    assert.equal(thread.messages.length, 1);
    assert.equal(thread.messages[0].tool.status, 'completed');
    const restored = restoreMessages([{ id: 'live', type: 'imageGeneration', status: 'completed', result: png }], thread.messages);
    assert.equal(restored.length, 1); assert.equal(restored[0].tool.rawRecord.item.result, png);
    console.log('PASS: restored image generation PNG decoding, download, prompt escaping, running and failure states');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

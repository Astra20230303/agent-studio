const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__calls = []; window.__fail = true;
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', model: 'test', threads: [
        { id: 'a', remoteId: 'remote-a', title: 'Thread A', cwd: 'D:/old', status: 'completed', messages: [{id:'saved-message',role:'assistant',content:'Saved conversation content',createdAt:new Date().toISOString()}], updatedAt: new Date().toISOString() },
        { id: 'b', title: 'Local B', status: 'completed', messages: [], updatedAt: new Date().toISOString() },
      ] }));
      localStorage.setItem('felix-thread-drafts-v1', JSON.stringify({ a: 'draft A', b: 'draft B' }));
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        if (method === 'thread/resume') {
          if (window.__resumeOverride) return {ok:true,result:window.__resumeOverride};
          if (window.__hold) await new Promise(resolve => window.__release = resolve);
          if (window.__invalid) return {ok:true,result:{thread:{id:params.threadId,turns:[{id:'bad-turn',items:[{id:'bad',type:'agentMessage',text:42}]}]}}};
          return window.__fail ? { ok: false, error: 'temporary resume failure' } : { ok: true, result: { thread: { id: params.threadId, cwd: 'D:/confirmed', turns: [] } } };
        }
        if (method === 'turn/start') return { ok: true, result: { turn: { id: 'turn', status: 'completed' } } };
        return { ok: true, result: { data: [] } };
      }, onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5329');
    const error = page.getByRole('alert', { name: '会话恢复失败' });
    await error.waitFor();
    const send = page.getByRole('button', { name: '发送', exact: true });
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    assert.ok(await send.isDisabled());
    await input.fill('edited A'); await input.press('Enter');
    assert.equal(await page.evaluate(() => window.__calls.filter(x => x.method === 'turn/start').length), 0);
    await page.getByRole('button', { name: 'Local B', exact: true }).click();
    await error.waitFor({ state: 'hidden' });
    assert.equal(await input.inputValue(), 'draft B'); assert.ok(await send.isEnabled());
    await page.getByRole('button', { name: 'Thread A', exact: true }).click();
    await error.waitFor();
    assert.equal(await input.inputValue(), 'edited A');
    await page.evaluate(() => { window.__invalid = true; });
    await error.getByRole('button', { name: '重试恢复会话' }).click();
    await error.getByText(/服务端历史条目无效/).waitFor();
    assert.ok(await send.isDisabled()); assert.equal(await input.inputValue(),'edited A');
    await page.evaluate(() => { window.__invalid = false; });
    for(const response of [
      {thread:{id:'wrong-thread',cwd:'D:/wrong',turns:[]},providerId:'wrong-provider'},
      {thread:{id:'remote-a',cwd:'D:/wrong'}},
      {thread:{id:'remote-a',cwd:'D:/wrong',turns:[{id:'t',items:null}]}},
      {thread:{id:'remote-a',cwd:{invalid:true},turns:[]}},
    ]) {
      await page.evaluate(value=>{window.__resumeOverride=value;},response);
      await error.getByRole('button',{name:'重试恢复会话'}).click();
      await error.getByText(/已有会话已保留/).waitFor();
      assert.ok(await send.isDisabled());assert.equal(await input.inputValue(),'edited A');
      await page.getByText('Saved conversation content',{exact:true}).waitFor();
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(t=>t.id==='a'));
      assert.equal(saved.cwd,'D:/old');assert.equal(saved.providerId,undefined);
    }
    await page.evaluate(()=>{window.__resumeOverride=null;});
    await page.evaluate(() => { window.__fail = false; window.__hold = true; });
    const retry = error.getByRole('button', { name: '重试恢复会话' });
    await retry.click();
    await page.waitForFunction(() => !!window.__release);
    assert.ok(await retry.isDisabled()); assert.ok(await send.isDisabled());
    await page.evaluate(() => window.__release());
    await error.waitFor({ state: 'hidden' });
    await send.click();
    await page.waitForFunction(() => window.__calls.some(x => x.method === 'turn/start'));
    const sent = await page.evaluate(() => window.__calls.find(x => x.method === 'turn/start').params);
    assert.equal(sent.threadId, 'remote-a'); assert.equal(sent.cwd, 'D:/confirmed');
    assert.equal(sent.input[0].text, 'edited A');
    // A late failure from a previously selected thread must not block Local B.
    await page.getByRole('button', { name: 'Local B', exact: true }).click();
    await page.evaluate(() => { window.__fail = true; window.__hold = true; window.__release = undefined; });
    await page.getByRole('button', { name: 'Thread A', exact: true }).click();
    await page.waitForFunction(() => !!window.__release);
    await page.getByRole('button', { name: 'Local B', exact: true }).click();
    await page.evaluate(() => { window.__hold = false; window.__release(); });
    assert.equal(await input.inputValue(), 'draft B');
    assert.ok(await send.isEnabled());
    assert.equal(await error.count(), 0);
    await page.getByRole('button', { name: 'Thread A', exact: true }).click();
    await error.waitFor();
    assert.ok(await send.isDisabled());
    console.log('PASS: failed resume blocks sending, keeps editable isolated drafts, retry waits for confirmation and sends with recovered cwd');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

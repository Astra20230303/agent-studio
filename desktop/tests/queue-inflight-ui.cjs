const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'a', title: 'A', messages: [], status: 'running', updatedAt: new Date().toISOString() }] }));
      window.__sent = []; window.__live = 'initial'; window.__interrupts = 0;
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = {
        connect: async () => ({ ok: true }), notify: async () => ({ ok: true }),
        request: async (method, params) => {
          if (method === 'turn/interrupt') window.__interrupts++;
          if (method === 'thread/resume') return { ok: true, result: { thread: { turns: [{ id: window.__live, status: 'inProgress', items: [] }] } } };
          if (method === 'turn/start') {
            window.__sent.push(params);
            await new Promise(resolve => { window.__releaseSend = resolve; });
            if (window.__reject) return { ok: false, error: 'Rejected' };
            const id = `turn-${window.__sent.length}`; window.__live = id;
            window.__notify({ method: 'turn/started', params: { threadId: 'a', turn: { id, status: 'inProgress' } } });
            if (window.__failImmediately) window.__notify({ method: 'turn/completed', params: { threadId: 'a', turn: { id, status: 'failed', error: { message: 'Immediate failure' } } } });
            return { ok: true, result: { turn: { id, status: 'inProgress' } } };
          }
          return { ok: true, result: { data: [] } };
        },
        onNotification: fn => { window.__listeners ||= new Set(); window.__listeners.add(fn); window.__notify = message => window.__listeners.forEach(listener => listener(message)); return () => window.__listeners.delete(fn); }, onClosed: fn => { window.__close = fn; return () => {}; },
        onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    const add = page.getByRole('button', { name: '本轮完成后发送', exact: true });
    await add.waitFor();
    await page.evaluate(() => {
      const write = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'felix-turn-queue-v1' && window.__quota) throw Error('quota');
        return write.call(this, key, value);
      };
    });
    for (const text of ['in-flight', 'successor']) { await input.fill(text); await add.click(); }
    await page.evaluate(() => window.__notify({method:'turn/completed',params:{threadId:'a',turn:{id:'initial',status:'completed'}}}));
    await page.waitForFunction(() => window.__sent.length === 1 && window.__releaseSend);
    await page.evaluate(() => {
      window.__quota = true;
      window.__notify({method:'turn/completed',params:{threadId:'other',turn:{id:'unrelated',status:'completed'}}});
    });
    await page.getByRole('button', {name:'重试保存队列',exact:true}).waitFor();
    assert.ok(await page.getByRole('button', {name:'编辑排队消息：in-flight',exact:true}).isDisabled());
    assert.ok(await page.getByRole('button', {name:'取消排队：in-flight',exact:true}).isDisabled());
    assert.ok(await page.getByRole('button', {name:'下移排队消息：in-flight',exact:true}).isDisabled());
    assert.ok(await page.getByRole('button', {name:'上移排队消息：successor',exact:true}).isDisabled());
    await page.evaluate(() => { window.__quota = false; });
    await page.getByRole('button', {name:'重试保存队列',exact:true}).click();
    await page.getByRole('button', {name:'重试保存队列',exact:true}).waitFor({state:'hidden'});
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-turn-queue-v1')).map(item=>item.status)), ['sending','paused']);
    assert.equal(await page.evaluate(() => window.__sent.length), 1);
    await page.evaluate(() => { window.__quota = true; window.__releaseSend(); });
    await page.getByRole('button', {name:'取消排队：in-flight',exact:true}).waitFor({state:'hidden'});
    await page.getByRole('button', {name:'重试保存队列',exact:true}).waitFor();
    await page.evaluate(() => { window.__quota = false; });
    await page.getByRole('button', {name:'重试保存队列',exact:true}).click();
    await page.getByRole('button', {name:'重试保存队列',exact:true}).waitFor({state:'hidden'});
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-turn-queue-v1')).map(item=>item.text)), ['successor']);
    await page.evaluate(() => window.__notify({method:'turn/completed',params:{threadId:'a',turn:{id:window.__live,status:'completed'}}}));
    await page.getByRole('button', {name:'继续队列',exact:true}).waitFor();
    assert.equal(await page.evaluate(() => window.__sent.length), 1);
    await page.getByRole('button', {name:'继续队列',exact:true}).click();
    await page.waitForFunction(() => window.__sent.length === 2);
    assert.equal(await page.evaluate(() => window.__sent[1].input[0].text), 'successor');
    await page.evaluate(() => window.__releaseSend());
    await page.getByRole('region', {name:'待发送消息'}).waitFor({state:'hidden'});
    assert.deepEqual(errors, []);
    console.log('PASS: pending dispatch remains locked on quota failure, acknowledged removal persists, no replay and explicit successor resume');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

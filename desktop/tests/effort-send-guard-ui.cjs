const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('thread-model-seeded')) {
        localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'model-a', activeThreadId: 'a', threads: ['a', 'b'].map(id => ({ id, remoteId: id, title: 'Chat ' + id, messages: [], status: 'completed', reasoningEffort: 'xhigh', updatedAt: '' })) }));
        sessionStorage.setItem('thread-model-seeded', 'true');
      }
      window.__calls = []; const listeners = new Set();
      window.__notify = event => listeners.forEach(fn => fn(event));
      window.desktop = { listModels: async () => ({ ok: true, models: ['model-a', 'model-b'], effortCapabilities: [{ model: 'model-a', values: ['low','high'] }, { model: 'model-b', values: [] }] }), providerStatus: async () => ({ keyConfigured: true }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        return { ok: true, result: method === 'thread/resume' ? { model: 'model-a', thread: { id: params.threadId, turns: [] } } : method === 'turn/steer' ? { turnId: 'turn' } : method === 'turn/start' ? { turn: { id: 'turn', status: 'inProgress' } } : { data: [] } };
      }, onNotification: fn => { listeners.add(fn); return () => listeners.delete(fn); }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const input = page.getByRole('textbox', {name:'消息',exact:true});
    const send = page.getByRole('button', {name:'发送',exact:true});
    await input.fill('Preserved draft');
    await page.getByText('此模型不支持当前推理强度，请重新选择后开始新回合或加入队列；草稿已保留。', {exact:true}).waitFor();
    assert.equal(await send.isDisabled(),true);
    await page.setViewportSize({width:390,height:844});
    await page.locator('aside.sidebar').waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth),false);
    assert.equal(await page.locator('.composer').evaluate(node=>node.scrollWidth>node.clientWidth),false);
    const sendBounds=await send.boundingBox();
    assert.ok(sendBounds.x >= 0 && sendBounds.x + sendBounds.width <= 390);
    await page.setViewportSize({width:1280,height:900});
    await input.press('Enter');
    assert.equal(await input.inputValue(),'Preserved draft');
    assert.equal(await page.evaluate(()=>window.__calls.some(call=>call.method==='turn/start')),false);
    await page.getByRole('button',{name:'推理强度：极高',exact:true}).click();
    await page.getByRole('dialog',{name:'推理强度',exact:true}).getByRole('button',{name:'低',exact:true}).click();
    await input.press('Escape');
    await send.click();
    await page.waitForFunction(()=>window.__calls.some(call=>call.method==='turn/start'));
    await page.getByRole('button',{name:'选择模型',exact:true}).click();
    await page.getByRole('option',{name:'model-b',exact:true}).click();
    await input.fill('Steer existing turn');
    const enqueue = page.getByRole('button',{name:'本轮完成后发送',exact:true});
    assert.equal(await enqueue.isDisabled(),true);
    const steer=page.getByRole('button',{name:'追加指令',exact:true});
    assert.equal(await steer.isEnabled(),true);
    await steer.click();
    await page.waitForFunction(()=>window.__calls.some(call=>call.method==='turn/steer'));
    assert.equal(await page.evaluate(()=>window.__calls.find(call=>call.method==='turn/steer').params.input[0].text),'Steer existing turn');
    await input.fill('Queue after correcting effort');
    await page.getByRole('button',{name:'推理强度：低',exact:true}).click();
    await page.getByRole('dialog',{name:'推理强度',exact:true}).getByRole('button',{name:'模型默认',exact:true}).click();
    await input.press('Escape');
    await enqueue.click();
    const queue=await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-turn-queue-v1')));
    assert.equal(queue[0].effort,'default');
    assert.equal(queue[0].text,'Queue after correcting effort');
    console.log('PASS: unsupported new turns and enqueue preserve draft, supported correction proceeds, steering remains available');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});

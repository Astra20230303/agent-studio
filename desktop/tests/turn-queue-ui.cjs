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
      localStorage.setItem('felix-attachments-v1', JSON.stringify({ a: ['D:/missing.png', 'D:/keep.png'] }));
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = {
        connect: async () => ({ ok: true }), notify: async () => ({ ok: true }),
        request: async (method, params) => {
          if (method === 'turn/interrupt') window.__interrupts++;
          if (method === 'thread/resume') return { ok: true, result: { thread: { turns: [{ id: window.__live, status: 'inProgress', items: [] }] } } };
          if (method === 'turn/start') {
            window.__sent.push(params);
            if (window.__reject) return { ok: false, error: 'Rejected' };
            const id = `turn-${window.__sent.length}`; window.__live = id;
            window.__notify({ method: 'turn/started', params: { threadId: 'a', turn: { id, status: 'inProgress' } } });
            if (window.__failImmediately) window.__notify({ method: 'turn/completed', params: { threadId: 'a', turn: { id, status: 'failed', error: { message: 'Immediate failure' } } } });
            return { ok: true, result: { turn: { id, status: 'inProgress' } } };
          }
          return { ok: true, result: { data: [] } };
        },
        onNotification: fn => { window.__notify = fn; return () => {}; }, onClosed: fn => { window.__close = fn; return () => {}; },
        onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    const add = page.getByRole('button', { name: '本轮完成后发送', exact: true });
    await add.waitFor();
    await page.evaluate(() => {
      const write = Storage.prototype.setItem;
      window.__queueQuota = true;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'felix-turn-queue-v1' && window.__queueQuota) throw Error('quota');
        return write.call(this, key, value);
      };
    });
    await input.fill('keep draft on quota'); await add.click();
    await page.getByRole('button', { name: '重试保存队列', exact: true }).waitFor();
    assert.equal(await input.inputValue(), 'keep draft on quota');
    assert.equal(await page.evaluate(() => window.__sent.length), 0);
    assert.equal(await page.getByRole('region', { name: '待发送消息' }).count(), 0);
    await page.evaluate(() => { window.__queueQuota = false; });
    await page.getByRole('button', { name: '重试保存队列', exact: true }).click();
    await page.getByRole('button', { name: '重试保存队列', exact: true }).waitFor({ state: 'hidden' });

    for (const text of ['first', 'second', 'cancel-me']) { await input.fill(text); await add.click(); }
    await page.getByRole('button', { name: '编辑排队消息：second', exact: true }).click();
    const cancelledEdit = page.getByRole('dialog', { name: '编辑排队消息', exact: true });
    await cancelledEdit.getByRole('textbox').fill('');
    assert.ok(await cancelledEdit.getByRole('button', { name: '保存排队消息' }).isDisabled());
    await cancelledEdit.getByRole('textbox').fill('discard this draft');
    await cancelledEdit.getByRole('button', { name: '取消编辑' }).click();
    assert.deepEqual(await page.evaluate(() => {
      const item = JSON.parse(localStorage.getItem('felix-turn-queue-v1')).find(item => item.text === 'second');
      return { text: item.text, status: item.status };
    }), { text: 'second', status: 'paused' });
    await page.getByRole('button', { name: '编辑排队消息：first', exact: true }).click();
    const edit = page.getByRole('dialog', { name: '编辑排队消息', exact: true });
    await edit.getByRole('textbox').fill('');
    assert.equal(await edit.getByRole('button', { name: '保存排队消息', exact: true }).isDisabled(), false);
    await edit.getByRole('button', { name: '移除排队附件：D:/keep.png', exact: true }).click();
    await edit.getByRole('button', { name: '移除排队附件：D:/missing.png', exact: true }).click();
    assert.equal(await edit.getByRole('button', { name: '保存排队消息', exact: true }).isDisabled(), true);
    await edit.getByRole('button', { name: '取消编辑', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-turn-queue-v1'))[0].attachments), ['D:/missing.png', 'D:/keep.png']);
    await page.getByRole('button', { name: '编辑排队消息：first', exact: true }).click();
    assert.equal(await edit.getByRole('textbox').inputValue(), 'first');
    await edit.getByRole('button', { name: '移除排队附件：D:/keep.png', exact: true }).waitFor();
    await edit.getByRole('button', { name: '移除排队附件：D:/missing.png', exact: true }).click();
    await edit.getByRole('textbox', { name: '排队消息正文' }).fill('edited first');
    await page.evaluate(() => { window.__queueQuota = true; });
    await edit.getByRole('button', { name: '保存排队消息', exact: true }).click();
    await edit.getByRole('alert').waitFor();
    assert.equal(await edit.getByRole('textbox').inputValue(), 'edited first');
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-turn-queue-v1'))[0].attachments), ['D:/missing.png', 'D:/keep.png']);
    assert.equal(await edit.getByRole('button', { name: '移除排队附件：D:/missing.png', exact: true }).count(), 0);
    await page.evaluate(() => { window.__queueQuota = false; });
    await edit.getByRole('button', { name: '保存排队消息', exact: true }).click();
    await edit.waitFor({ state: 'hidden' });
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-turn-queue-v1'))[0].attachments), ['D:/keep.png']);
    await page.getByRole('button', { name: '继续队列', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__sent.length), 0);
    await page.getByRole('button', { name: '取消排队：cancel-me', exact: true }).click();
    const finish = status => page.evaluate(status => window.__notify({ method: 'turn/completed', params: { threadId: 'a', turn: { id: window.__live, status } } }), status);
    await page.getByRole('button', { name: '暂停队列', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__interrupts), 0);
    assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-turn-queue-v1')).every(item => item.status === 'paused')));
    await finish('completed');
    await page.getByRole('button', { name: '继续队列', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__sent.length), 0);
    await page.getByRole('button', { name: '继续队列', exact: true }).click();
    await page.waitForFunction(() => window.__sent.length === 1);
    assert.equal(await page.evaluate(() => window.__sent[0].input[0].text), 'edited first');
    assert.deepEqual(await page.evaluate(() => window.__sent[0].input.filter(item => item.type === 'localImage')), [{ type: 'localImage', path: 'D:/keep.png' }]);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__sent.length), 1);
    await finish('failed');
    await page.getByRole('button', { name: '继续队列', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__sent.length), 1);
    await page.evaluate(() => { window.__reject = true; });
    await page.getByRole('button', { name: '继续队列', exact: true }).click();
    await page.getByText(/发送未确认：Rejected/).waitFor();
    assert.equal(await page.evaluate(() => window.__sent.length), 2);
    await page.evaluate(() => { window.__reject = false; });
    await page.getByRole('button', { name: '继续队列', exact: true }).click();
    await page.waitForFunction(() => window.__sent.length === 3);
    assert.equal(await page.evaluate(() => window.__sent[2].input[0].text), 'second');
    await page.getByRole('region', { name: '待发送消息' }).waitFor({ state: 'hidden' });
    await input.fill('persisted'); await add.click();
    await page.getByRole('button', { name: '暂停队列', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: '继续队列', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__sent.length), 0);
    await page.getByRole('button', { name: '继续队列', exact: true }).click();
    await input.fill('must-not-run'); await add.click();
    await page.evaluate(() => { window.__failImmediately = true; });
    await finish('completed');
    await page.waitForFunction(() => window.__sent.length > 0);
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.__sent.length), 1, 'early failed turn must pause its successor');
    await page.getByRole('button', { name: '继续队列', exact: true }).waitFor();
    await page.evaluate(() => { window.__failImmediately = false; });
    await page.getByRole('button', { name: '继续队列', exact: true }).click();
    await page.waitForFunction(() => window.__sent.length === 2);
    await input.fill('paused-by-stop'); await add.click();
    await page.getByRole('button', { name: '停止生成', exact: true }).click();
    await finish('completed');
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__sent.length), 2);
    await page.getByRole('button', { name: '继续队列', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: FIFO, cancellation, failed turn pause, rejected send retry, persisted queue without replay');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

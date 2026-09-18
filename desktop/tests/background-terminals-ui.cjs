const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
   localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: ['a','b'].map(id => ({ id, remoteId: id, title: id, status: 'completed', messages: [], updatedAt: '' })) }));
   window.__kills = []; window.__failList = true; window.__badList = '';
   window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
   window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
    if (method === 'thread/backgroundTerminals/list') {
     if (window.__failList) return { ok: false, error: 'List unavailable' };
     if (window.__badList === 'duplicate') return { ok: true, result: { data: [{ processId:'dup', command:'one', cwd:'D:/test' }, { processId:'dup', command:'two', cwd:'D:/test' }] } };
     if (window.__badList === 'metric') return { ok: true, result: { data: [{ processId:'bad', command:'bad', cwd:'D:/test', cpuPercent:-1 }] } };
     const id = params.cursor ? '2' : '1';
     return { ok: true, result: { data: [{ processId: id, command: `command ${params.threadId} ${id}`, cwd: 'D:/test', ...(params.cursor ? {} : { osPid: 321, cpuPercent: window.__cpu || 0, rssKb: 2048 }) }], nextCursor: params.cursor ? null : 'next' } };
    }
    if (method === 'thread/backgroundTerminals/terminate') { window.__kills.push(params); return new Promise(resolve => { window.__finish = resolve; }); }
    return { ok: true, result: method === 'thread/resume' ? { thread: { id: params.threadId, turns: [] } } : { data: [] } };
   }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
  });
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
  await page.getByText('后台命令', { exact: true }).click();
  const refresh = page.getByRole('button', { name: '刷新后台命令' });
  await refresh.click(); await page.getByRole('alert').filter({ hasText: 'List unavailable' }).waitFor();
  await page.evaluate(() => { window.__failList = false; });
  await refresh.click(); await page.getByText('command a 1', { exact: true }).waitFor();
  await page.getByRole('button', { name: '加载更多后台命令' }).click();
  await page.getByText('command a 2', { exact: true }).waitFor();
  await page.getByText('PID 321 · CPU 0.0% · 内存 2.0 MiB', { exact: true }).waitFor();
  await page.getByText('PID 未知 · CPU 未知 · 内存 未知', { exact: true }).waitFor();
  await page.evaluate(() => { window.__badList = 'duplicate'; });
  await refresh.click(); await page.getByRole('alert').filter({ hasText: '后台命令条目格式无效' }).waitFor();
  await page.getByText('command a 1', { exact: true }).waitFor();
  await page.evaluate(() => { window.__badList = 'metric'; });
  await refresh.click(); await page.getByRole('alert').filter({ hasText: '后台命令条目格式无效' }).waitFor();
  await page.evaluate(() => { window.__badList = ''; });
  await refresh.click(); await page.getByText('command a 1', { exact: true }).waitFor();
  await page.evaluate(() => { window.__cpu = 150; });
  await refresh.click();
  await page.getByText('PID 321 · CPU 150.0% · 内存 2.0 MiB', { exact: true }).waitFor();
  const kill = page.getByRole('button', { name: '终止后台命令 1', exact: true });
  await kill.evaluate(el => { el.click(); el.click(); });
  assert.equal(await page.evaluate(() => window.__kills.length), 1);
  await page.evaluate(() => window.__finish({ ok: false, error: 'Kill unavailable' }));
  await page.getByRole('alert').filter({ hasText: 'Kill unavailable' }).waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-audit-log-v1') || '[]').filter(e => e.action === '终止后台命令').length), 0);
  await kill.click(); await page.waitForFunction(() => window.__kills.length === 2);
  await page.getByRole('button', { name: 'b', exact: true }).click();
  await page.getByText('后台命令', { exact: true }).click();
  await refresh.click(); await page.getByText('command b 1', { exact: true }).waitFor();
  await page.evaluate(() => window.__finish({ ok: true, result: { terminated: true } }));
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-audit-log-v1') || '[]').filter(e => e.action === '终止后台命令').length === 1);
  assert.equal(await page.getByText('command b 1', { exact: true }).count(), 1);
  await kill.click(); await page.waitForFunction(() => window.__kills.length === 3);
  await page.evaluate(() => window.__finish({ ok: true, result: { terminated: false } }));
  await page.getByText('后台命令已退出', { exact: true }).waitFor();
  const audit = await page.evaluate(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')).filter(e => e.action === '终止后台命令'));
  assert.equal(audit.length, 1); assert.equal(audit[0].detail, undefined);
  assert.deepEqual(await page.evaluate(() => window.__kills), [{threadId:'a',processId:'1'},{threadId:'a',processId:'1'},{threadId:'b',processId:'1'}]);
  await page.reload();
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await page.getByRole('button',{name:'操作记录',exact:true}).click();
  const region=page.getByRole('region',{name:'操作记录',exact:true});
  await region.getByRole('searchbox',{name:'搜索操作记录'}).fill('终止后台命令');
  await region.getByText('终止后台命令',{exact:true}).waitFor();
  assert.equal(await region.getByText('终止后台命令',{exact:true}).count(),1);
  console.log('PASS: background terminal list retry/pagination, termination lock/retry and thread isolation');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });

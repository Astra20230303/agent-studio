const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__calls = []; window.__fail = true;
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', threads: [] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), request: async (method, params) => {
        window.__calls.push({ method, params });
        if(method==='thread/search') {
          if(params.searchTerm==='invalid')return {ok:true,result:{data:[{snippet:'broken'}]}};
          if(params.searchTerm==='pages')return {ok:true,result:{data:[{thread:{id:params.cursor?'page2':'page1',name:params.cursor?'Second match':'First match',updatedAt:60},snippet:params.cursor?'pages second snippet':'pages first snippet'}],nextCursor:params.cursor?null:'search-next'}};
          if(params.searchTerm==='slow')return new Promise(resolve=>{window.__resolveSlow=()=>resolve({ok:true,result:{data:[{thread:{id:'stale',name:'Stale result',updatedAt:50},snippet:'slow'}]}});});
          return {ok:true,result:{data:[{thread:{id:'hidden',name:'Remote match',updatedAt:40},snippet:'hidden content <script>plain text</script>'}]}};
        }
        if (method === 'thread/list') {
          if (params.searchTerm === 'slow') return new Promise(resolve => { window.__resolveSlow = () => resolve({ ok: true, result: { data: [{ id: 'stale', name: 'Stale result', updatedAt: 50 }] } }); });
          if (params.searchTerm) return { ok: true, result: { data: [{ id: 'hidden', name: 'Remote match', updatedAt: 40 }] } };
          if (params.cursor && window.__fail) return { ok: false, error: { message: 'Page unavailable' } };
          return { ok: true, result: params.cursor ? { data: [{ id: 'new', name: 'Newest', updatedAt: 30 }, { id: 'old', name: 'Older', updatedAt: 10 }, { id: 'invalid', name: 'Invalid timestamp', updatedAt: 'invalid' }, null] } : { data: [{ id: 'new', name: 'Newest', updatedAt: 30 }, { id: 'mid', name: 'Middle', updatedAt: 20 }], nextCursor: 'older-page' } };
        }
        return { ok: true, result: { data: [] } };
      }, notify: async () => ({}), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '加载更多会话' }).click();
    await page.getByRole('alert').filter({ hasText: 'Page unavailable' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Newest', exact: true }).count(), 1);
    await page.evaluate(() => { window.__fail = false; });
    await page.getByRole('button', { name: '重试加载会话' }).click();
    await page.getByRole('button', { name: 'Older', exact: true }).waitFor();
    assert.deepEqual(await page.locator('.recent').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))), ['Newest', 'Middle', 'Older', 'Invalid timestamp']);
    assert.equal(await page.getByRole('button', { name: '加载更多会话' }).count(), 0);
    assert.equal(await page.evaluate(() => window.__calls.filter(call => call.method === 'thread/list' && call.params.cursor === 'older-page').length), 2);
    await page.getByRole('button', { name: '搜索', exact: true }).click();
    await page.getByRole('textbox', { name: '搜索最近会话' }).fill('slow');
    await page.getByRole('button', { name: '正在加载会话…' }).waitFor();
    assert.equal(await page.getByText('没有匹配的会话', { exact: true }).count(), 0);
    await page.waitForFunction(() => window.__resolveSlow);
    await page.getByRole('textbox', { name: '搜索最近会话' }).fill('hidden');
    await page.getByRole('button', { name: 'Remote match', exact: true }).waitFor();
    await page.getByText('hidden content <script>plain text</script>',{exact:true}).waitFor();
    await page.evaluate(() => window.__resolveSlow());
    assert.equal(await page.getByRole('button', { name: 'Stale result', exact: true }).count(), 0);
    await page.getByRole('textbox', { name: '搜索最近会话' }).fill('pages');
    await page.getByText('pages first snippet',{exact:true}).waitFor();
    await page.getByRole('button',{name:'加载更多会话',exact:true}).click();
    await page.getByText('pages second snippet',{exact:true}).waitFor();
    assert.equal(await page.getByText('pages first snippet',{exact:true}).count(),1);
    await page.getByRole('textbox', { name: '搜索最近会话' }).fill('invalid');
    await page.getByText('服务端返回的会话搜索结果无效，请重试',{exact:true}).waitFor();
    assert.equal(await page.getByText('没有匹配的会话',{exact:true}).count(),0);
    await page.getByRole('textbox', { name: '搜索最近会话' }).fill('');
    await page.getByRole('button', { name: 'Newest', exact: true }).waitFor();
    const offline = await browser.newPage();
    await offline.addInitScript(()=>{
      localStorage.setItem('codex-desktop-state-v1',JSON.stringify({threads:[{id:'cached',title:'Cached unrelated title',messages:[{id:'m',role:'assistant',content:'offline needle',createdAt:''}],status:'completed',updatedAt:''}]}));
      window.codex={connect:async()=>({ok:false,error:'Offline'}),onNotification:()=>()=>{},onServerRequest:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{}};
    });
    await offline.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
    await offline.getByRole('button',{name:'搜索',exact:true}).click();
    await offline.getByRole('textbox',{name:'搜索最近会话',exact:true}).fill('offline needle');
    await offline.getByRole('button',{name:'Cached unrelated title',exact:true}).waitFor();
    await offline.close();
    console.log('PASS: thread pagination, retry, deduplication and recency ordering');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

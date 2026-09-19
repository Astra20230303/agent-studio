const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', projects: [], threads: [] }));
      const listeners = new Set(); window.__notify = event => listeners.forEach(fn => fn(event));
      window.__calls = []; window.__opened = []; window.__failReload = true;
      window.__badStatus = '';Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copied=text;}}});
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }), openExternal: async url => window.__opened.push(url) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        if (method === 'thread/start') return { ok: true, result: { thread: { id: 'resource-chat', turns: [] } } };
        if (method === 'turn/start') return { ok: true, result: { turn: { id: 'resource-turn', status: 'completed' } } };
        if (method === 'mcpServerStatus/list' && params.detail === 'full') return { ok: true, result: { data: [{ name: 'local', authStatus: 'unsupported', resources: [{ uri: 'fixture://readme', name: 'Readme' }], resourceTemplates: [{ uriTemplate: 'fixture://notes/{id}', name: 'Notes' }] }] } };
        if (method === 'mcpServer/resource/read') return {ok:true,result:{contents:[{uri:'fixture://files/report.pdf',mimeType:'application/pdf',blob:'AP+ADQo='}]}};
        if (method === 'unused-resource') {
          if (params.uri === 'fixture://slow') return await new Promise(resolve => { window.__resolveResource = () => resolve({ ok: true, result: { contents: [{ uri: params.uri, text: 'Stale resource result' }] } }); });
          if (!window.__resourceRetried) { window.__resourceRetried = true; return { ok: false, error: 'Resource temporarily unavailable' }; }
          return { ok: true, result: { contents: [{ uri: params.uri, text: '<script>unsafe()</script>Resource text' }] } };
        }
        if (method === 'mcpServerStatus/list') { if(window.__badStatus==='duplicate') return {ok:true,result:{data:[{name:'cloud',authStatus:'unsupported'},{name:'cloud',authStatus:'unsupported'}]}}; if(window.__badStatus==='broken') return {ok:true,result:{data:[{name:'cloud',authStatus:'unsupported',tools:[]} ]}}; return { ok: true, result: params.cursor ? { data: [{ name: 'local', authStatus: 'unsupported', runtimeStatus: 'connected', tools: { read: { annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}, description:'Inspect workspace documents', inputSchema:{type:'object',properties:{path:{type:'string',description:'<script>literal</script>'}},required:['path']},outputSchema:{type:'object',properties:{text:{type:'string'}}} } } }] } : { data: [{ name: 'cloud', authStatus: 'notLoggedIn', runtimeStatus: 'authenticationRequired', toolsError: 'Authentication needed', tools: {} }], nextCursor: 'page2' } }; }
        if (method === 'mcpServer/oauth/login') { if(window.__delayLogin) await new Promise(resolve=>{window.__finishLogin=resolve;}); if (window.__early) window.__notify({ method: 'mcpServer/oauthLogin/completed', params: { name: 'cloud', success: true, threadId: null } }); if(window.__failEarly)return {ok:false,error:'Obsolete login failure'}; return { ok: true, result: { authorizationUrl: 'https://example.com/login?state=test' } }; }
        if (method === 'config/mcpServer/reload' && window.__failReload) return { ok: false, error: 'Reload failed' };
        return { ok: true, result: { data: [], marketplaces: [] } };
      }, onNotification: fn => { listeners.add(fn); return () => listeners.delete(fn); }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Existing resource draft');
    await page.getByRole('button', { name: '插件', exact: true }).click();
    await page.getByRole('button', { name: '管理 MCP 服务' }).click();
    await page.getByRole('heading', { name: 'local', exact: true }).waitFor();
    await page.getByRole('checkbox',{name:'显示资源目录',exact:true}).check();await page.getByRole('button',{name:'Readme',exact:true}).click();
    const link=page.getByRole('link',{name:'下载资源文件',exact:true});await link.waitFor();
    const pending=page.waitForEvent('download');await link.click();const download=await pending;assert.equal(download.suggestedFilename(),'report.pdf');
    const bytes=require('node:fs').readFileSync(await download.path());assert.deepEqual(bytes,Buffer.from([0,255,128,13,10]));
    assert.equal(await page.getByText('媒体无法预览，请查看结构化结果。',{exact:true}).count(),0);
    console.log('PASS: binary MCP resource download preserves filename and exact bytes');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

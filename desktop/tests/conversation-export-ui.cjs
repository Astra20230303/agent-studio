const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'remote-a', title: 'Export test', model: 'model-a', reasoningEffort: 'high', planningMode: 'plan', cwd: 'D:/workspace', requestedPermission: 'workspace-write', effectivePermissions: { sandbox: 'workspaceWrite', approvalPolicy: 'on-request', reviewer: 'auto_review' }, messages: [{ id: 'local', role: 'user', content: 'local preview', createdAt: '' }], status: 'completed', updatedAt: '' }] }));
      window.__exports = []; window.__pages = []; window.__fail = false;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), saveConversation: async input => { window.__exports.push(input); if(window.__holdSave)await new Promise(resolve=>{window.__releaseSave=resolve;});return { ok: true }; } };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        if (method === 'thread/items/list') {
          window.__pages.push(params);
          if(window.__holdExport && params.cursor)await new Promise(resolve=>{window.__releaseExport=resolve;});
          if (window.__fail) return { ok: false, error: 'History unavailable' };
          if (window.__badCursor && params.cursor) return { ok: true, result: { data: [], nextCursor: { invalid: true } } };
          if (window.__badItem && params.cursor) return { ok: true, result: { data: [{ item: { type: 'agentMessage', text: 'Missing ID' } }] } };
          return { ok: true, result: params.cursor ? { data: [{ item: { id: 'reply', type: 'agentMessage', text: 'Final reply' } }, { item: { id: 'future', type: 'futureTool', payload: '``` nested ```' } }], nextCursor: null } : { data: [{ item: { id: 'user', type: 'userMessage', content: [{ type: 'text', text: '你好' }, { type: 'localImage', path: 'D:/image.png' }] } }, { item: { id: 'command', type: 'commandExecution', command: 'pwd', aggregatedOutput: 'D:/workspace' } }], nextCursor: 'second' } };
        }
        return { ok: true, result: method === 'thread/resume' ? { model:'model-a', reasoningEffort:'high', thread: { id: params.threadId, cwd:'D:/workspace', turns: [] }, sandboxPolicy:{type:'workspaceWrite'}, approvalPolicy:'on-request', approvalsReviewer:'auto_review' } : { data: [] } };
      }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button',{name:'更多会话操作',exact:true}).click();
    const button = page.getByRole('button', { name: '导出 Markdown', exact: true });
    await button.click();
    await page.waitForFunction(() => window.__exports.length === 1);
    const data = await page.evaluate(() => window.__exports[0]);
    assert.equal(data.filename, 'Export test.md');
    for (const text of ['模型：model-a', '推理强度：high', '执行模式：先规划', '工作目录：D:/workspace', '实际沙箱：workspaceWrite', '服务端完整分页记录', '你好', 'D:/image.png', 'D:/workspace', 'Final reply', 'futureTool', '````']) assert.ok(data.content.includes(text), text);
    assert.ok(data.content.indexOf('你好') < data.content.indexOf('Final reply'));
    assert.deepEqual(await page.evaluate(() => window.__pages.map(params => params.cursor)), [undefined, 'second']);
    await page.evaluate(() => { window.__fail = true; });
    await button.click();
    await page.getByText('导出失败：History unavailable', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__exports.length), 1);
    await page.evaluate(()=>{window.__fail=false;window.__holdExport=true;window.__pages=[];});
    await button.click();
    await page.getByRole('status').filter({hasText:'导出已读取 1 页，2 条记录'}).waitFor();
    await page.waitForFunction(()=>Boolean(window.__releaseExport));
    await page.getByRole('button',{name:'取消导出读取',exact:true}).click();
    await page.getByText('已取消导出，未保存文件',{exact:true}).waitFor();
    assert.ok(await button.isEnabled());assert.equal(await page.evaluate(()=>window.__exports.length),1);
    await page.evaluate(()=>{window.__holdExport=false;window.__releaseExport();return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
    assert.equal(await page.evaluate(()=>window.__exports.length),1);
    assert.equal(await page.evaluate(()=>window.__pages.length),2);
    await button.click();await page.waitForFunction(()=>window.__exports.length===2);
    await page.evaluate(() => { window.__fail = false; window.__badCursor = true; });
    await button.click();
    await page.getByText('导出失败：服务端历史格式无效', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__exports.length), 2);
    await page.evaluate(()=>{window.__badCursor=false;window.__badItem=true;});
    await button.click();
    await page.getByText('导出失败：服务端历史条目无效，已有消息已保留，请重试。', {exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.__exports.length),2);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads[0].messages[0].content),'local preview');
    await page.evaluate(()=>{window.__badItem=false;window.__holdSave=true;});
    await button.click();await page.waitForFunction(()=>Boolean(window.__releaseSave));
    assert.equal(await page.getByRole('button',{name:'取消导出读取',exact:true}).count(),0);
    assert.ok(await page.getByRole('button',{name:'正在导出…',exact:true}).isDisabled());
    await page.evaluate(()=>{window.__holdSave=false;window.__releaseSave();});
    await button.waitFor();
    await page.evaluate(()=>{window.__holdExport=true;window.__releaseExport=undefined;window.__pages=[];});
    await button.click();await page.waitForFunction(()=>Boolean(window.__releaseExport));
    await page.getByRole('button',{name:'新对话',exact:true}).click();
    await page.getByText('已取消导出，未保存文件',{exact:true}).waitFor();
    await page.evaluate(()=>{window.__holdExport=false;window.__releaseExport();return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
    assert.equal(await page.evaluate(()=>window.__exports.length),3);
    assert.equal(await page.evaluate(()=>window.__pages.length),2);
    const local = await browser.newPage();
    await local.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'local', threads: [{ id: 'local', title: 'CON', status: 'completed', messages: [{ id: 'message', role: 'user', content: 'Local body', plugins: [{id:'docs@local',name:'Docs'}], attachments: ['D:/notes.txt'], skills: [{ name: 'build', path: 'D:/SKILL.md' }] }], updatedAt: '' }] }));
      window.__saved = [];
      window.desktop = { saveConversation: async input => { window.__saved.push(input); return { ok: false, error: 'Disk full' }; } };
    });
    await local.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await local.getByRole('button',{name:'更多会话操作',exact:true}).click();
    await local.getByRole('button', { name: '导出本机记录', exact: true }).click();
    await local.getByText('导出失败：Disk full', { exact: true }).waitFor();
    const exported = await local.evaluate(() => window.__saved[0]);
    assert.equal(exported.filename, 'conversation-CON.md');
    for (const value of ['本机已加载记录（可能不完整）', 'Local body', 'docs@local', 'Docs', 'D:/notes.txt', 'D:/SKILL.md']) assert.ok(exported.content.includes(value));
    await local.close();
    console.log('PASS: full pagination, messages, attachment references, tool and unknown records, history failure without partial export');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

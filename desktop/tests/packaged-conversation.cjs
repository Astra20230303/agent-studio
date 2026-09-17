const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

(async () => {
  const source = path.resolve(process.argv[2] || path.join(__dirname, '../../.project-cache/felix-desktop-local-provider'));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-packaged-'));
  fs.writeFileSync(path.join(profile, 'marker.txt'), 'PACKAGED_CONVERSATION_OK');
  const directory = path.join(profile, 'relocated app');
  fs.cpSync(source, directory, { recursive: true, dereference: true });
  const env = { ...process.env, FELIX_DATA_DIR: profile };
  for (const key of ['ELECTRON_RUN_AS_NODE', 'FELIX_RUNTIME_DIR', 'CODEX_APP_SERVER_COMMAND', 'VITE_DEV_SERVER_URL', 'MINIMAX_API_KEY', 'NODE_PATH']) delete env[key];
  let app, requests = 0, upstreamError;
  const server = require('node:http').createServer(async (req, res) => {
    try {
      if (process.env.FELIX_TEST_NO_KEY) assert.equal(req.headers.authorization, undefined);
      if (req.url.endsWith('/models')) { res.end(JSON.stringify({data:[{id:'MiniMax-M2.1'}]})); return; }
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw); requests++;
      res.writeHead(200, {'content-type':'text/event-stream'});
      let delta;
      if (requests === 1) {
        const tool = body.tools.find(item => /(^|__)(exec_command|shell_command|shell)$/.test(item.function.name));
        assert.ok(tool);
        const props = tool.function.parameters.properties;
        const command = 'Get-Content marker.txt';
        const args = props.cmd ? {cmd:command,max_output_tokens:100} : {command:props.command.type === 'array' ? ['powershell.exe','-NoProfile','-Command',command] : command};
        delta = {tool_calls:[{index:0,id:'packaged-tool',type:'function',function:{name:tool.function.name,arguments:JSON.stringify(args)}}]};
      } else {
        const output = body.messages.find(message => message.role === 'tool' && message.tool_call_id === 'packaged-tool');
        assert.match(output.content, /PACKAGED_CONVERSATION_OK/);
        delta = {content:'Verified packaged conversation tool output.'};
      }
      res.end('data: '+JSON.stringify({choices:[{delta,finish_reason:requests===1?'tool_calls':'stop'}]})+'\n\ndata: [DONE]\n\n');
    } catch (error) { upstreamError = error; res.end('data: [DONE]\n\n'); }
  });
  server.listen(0,'127.0.0.1'); await require('node:events').once(server,'listening');
  const occupied = require('node:http').createServer((_req, res) => res.end('unrelated service'));
  const blocked = require('node:events').once(occupied, 'listening');
  occupied.listen(15821, '127.0.0.1');
  try { await blocked; } catch (error) { if (error.code !== 'EADDRINUSE') throw error; }
  try {
    app = await electron.launch({ executablePath: path.join(directory, 'Felix.exe'), args: [], cwd: profile, env, timeout: 30000 });
    let page = await app.firstWindow(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    assert.equal(await app.evaluate(({ app }) => app.isPackaged), true);
    await page.getByRole('button', { name: '已安排', exact: true }).waitFor();
    const connected = await page.evaluate(() => window.codex.connect());
    assert.equal(connected.ok, true, JSON.stringify(connected));
    const models = await page.evaluate(() => window.codex.request('model/list', {}));
    assert.equal(models.ok, true); assert.ok(models.result.data.length);
    const provider = await page.evaluate(({baseUrl,apiKey}) => window.desktop.saveProvider({name:'Local test',baseUrl,apiKey,activate:true,model:'MiniMax-M2.1'}), {baseUrl:`http://127.0.0.1:${server.address().port}/v1`,apiKey:process.env.FELIX_TEST_NO_KEY ? '' : 'local-test'});
    assert.equal(provider.ok,true,JSON.stringify(provider));
    const sandbox = process.env.FELIX_TEST_SANDBOX || 'danger-full-access';
    if (sandbox !== 'danger-full-access') {
      const setup = await page.evaluate(async cwd => {
        const completed = new Promise(resolve => {
          const off = window.codex.onNotification(event => { if (event.method === 'windowsSandbox/setupCompleted') { off(); resolve(event.params); } });
        });
        const result = await window.codex.request('windowsSandbox/setupStart', { mode: 'unelevated', cwd });
        if (!result.ok) throw Error(JSON.stringify(result.error));
        return completed;
      }, profile);
      assert.equal(setup.success, true, JSON.stringify(setup));
      await app.close(); app = undefined;
      app = await electron.launch({ executablePath: path.join(directory, 'Felix.exe'), args: [], cwd: profile, env, timeout: 30000 });
      page = await app.firstWindow();
      await page.getByLabel('已连接', { exact: true }).waitFor();
    }
    const result = await page.evaluate(async ({cwd, sandbox}) => {
      window.__completed = null;
      window.codex.onNotification(event => { if(event.method === 'turn/completed') window.__completed = event.params.turn; });
      const created = await window.codex.request('thread/start',{cwd,model:'MiniMax-M2.1',modelProvider:'minimax',approvalPolicy:'never',sandbox});
      if(!created.ok) throw Error(JSON.stringify(created.error));
      const threadId=created.result.thread.id;
      const turn=await window.codex.request('turn/start',{threadId,input:[{type:'text',text:'Print the packaged test marker and report it.'}]});
      if(!turn.ok) throw Error(JSON.stringify(turn.error));
      return threadId;
    },{cwd:profile,sandbox});
    await page.waitForFunction(() => window.__completed, {timeout:30000});
    if(upstreamError) throw upstreamError;
    const completed = await page.evaluate(() => window.__completed);
    assert.equal(completed.status,'completed',JSON.stringify(completed));
    assert.equal(requests,2);
    if (sandbox === 'read-only') {
      const denied = await page.evaluate(cwd => window.codex.request('command/exec', {
        cwd, command: ['powershell.exe', '-NoProfile', '-Command', "Set-Content -LiteralPath readonly-denied.txt -Value forbidden"],
        timeoutMs: 15000, sandboxPolicy: { type: 'readOnly', networkAccess: false },
      }), profile);
      if (denied.ok) assert.notEqual(denied.result.exitCode, 0, JSON.stringify(denied));
      else assert.match(JSON.stringify(denied.error), /sandbox denied/i);
      assert.equal(fs.existsSync(path.join(profile, 'readonly-denied.txt')), false);
    }
    const history = await page.evaluate(threadId => window.codex.request('thread/read',{threadId,includeTurns:true}),result);
    assert.ok(history.result.thread.turns.some(turn=>turn.items.some(item=>item.type==='commandExecution' && item.aggregatedOutput.includes('PACKAGED_CONVERSATION_OK'))));
    await page.evaluate(threadId => localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeThreadId:'test',model:'MiniMax-M2.1',threads:[{id:'test',remoteId:threadId,title:'Packaged chat',status:'completed',messages:[],updatedAt:''}]})),result);
    const saved = await page.evaluate(() => window.desktop.saveTask({ name: 'Packaged reminder', prompt: 'Restore packaged task', kind: 'reminder', model: '', permission: 'read-only', notify: false, schedule: { kind: 'once', at: new Date(Date.now() + 86400000).toISOString() } }));
    assert.equal(saved.ok, true);
    assert.deepEqual(errors, []);
    await app.close(); app = undefined;
    app = await electron.launch({ executablePath: path.join(directory, 'Felix.exe'), args: [], cwd: profile, env, timeout: 30000 });
    const restarted = await app.firstWindow();
    await restarted.waitForFunction(() => window.desktop?.taskDetail);
    const restored = await restarted.evaluate(id => window.desktop.taskDetail(id), saved.task.id);
    assert.equal(restored.task.name, 'Packaged reminder');
    await restarted.getByText('Verified packaged conversation tool output.',{exact:true}).waitFor();
    assert.equal(restored.task.runs.length, 0);
    assert.equal(fs.existsSync(path.join(directory, 'resources/.project-cache')), false);
    console.log('PASS: packaged local provider, real conversation tool execution, persisted history and UI restoration');
  } finally { if (app) await app.close(); occupied.closeAllConnections(); await new Promise(resolve=>occupied.close(resolve)); server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); fs.rmSync(profile, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });


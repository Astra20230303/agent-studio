const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const { createTaskRunner } = require('../electron/task-runner.cjs');
const { TaskScheduler } = require('../electron/task-scheduler.cjs');
const { spawn } = require('node:child_process');
const { CodexRpc } = require('../electron/codex-rpc.cjs');
const { findCommand } = require('../electron/codex-server.cjs');
const { startMiniMaxAdapter } = require('../electron/minimax-adapter.cjs');
const { ThreadProviderRouter } = require('../electron/thread-provider-router.cjs');
const root = path.resolve(__dirname, '../..');
const task = { reasoningEffort: 'high', name: 'Runner integration', model: 'MiniMax-M2.1', prompt: 'Print FELIX_SCHEDULE_OK using a read-only shell command and report the result.', permission: 'read-only' };

for (const apiKey of ['local-test', '']) {
test(`real scheduled tool execution (${apiKey ? 'authenticated' : 'keyless local'})`, { timeout: 60000 }, async () => {
  const workspace = fs.mkdtempSync(path.join(root, '.project-cache/tmp/task-workspace-'));
  const dataRoot = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'felix-runner-data-'));
  let requests = 0, upstreamError, activeProvider, providerReads = 0;
  const server = http.createServer(async (req, res) => {
    try {
      assert.equal(req.headers.authorization, apiKey ? `Bearer ${apiKey}` : undefined);
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw); requests++;
      if (requests <= 2) assert.equal(body.reasoning_effort, 'high');
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      if (requests === 1) {
        // Switching the global channel during a tool call must not reroute this run.
        activeProvider = { apiKey: 'different-key', baseUrl: 'http://127.0.0.1:1' };
        assert.ok(JSON.stringify(body.messages).includes(workspace.replaceAll('\\', '\\\\')), 'Task context must use the selected workspace');
        const tool = body.tools.find(item => /(^|__)(exec_command|shell_command|shell)$/.test(item.function.name));
        assert.ok(tool);
        const props = tool.function.parameters.properties;
        const command = "Write-Output 'FELIX_SCHEDULE_OK'";
        const args = props.cmd ? { cmd: command, max_output_tokens: 100 } : { command: props.command.type === 'array' ? ['powershell.exe', '-NoProfile', '-Command', command] : command };
        res.write('data: ' + JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'scheduled-call', type: 'function', function: { name: tool.function.name, arguments: JSON.stringify(args) } }] }, finish_reason: 'tool_calls' }] }) + '\n\n');
      } else if (requests === 2) {
        const result = body.messages.find(message => message.role === 'tool' && message.tool_call_id === 'scheduled-call');
        assert.ok(result); assert.match(result.content, /FELIX_SCHEDULE_OK/);
        res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Verified FELIX_SCHEDULE_OK from the scheduled run.' }, finish_reason: 'stop' }] }) + '\n\n');
      } else {
        assert.notEqual(body.reasoning_effort, 'high', 'Model default must clear the previous explicit high effort');
        assert.ok(body.messages.some(message => message.role === 'assistant' && JSON.stringify(message.content).includes('Verified FELIX_SCHEDULE_OK')));
        assert.ok(body.messages.some(message => message.role === 'user' && JSON.stringify(message.content).includes('Continue the scheduled task conversation')));
        res.write('data: ' + JSON.stringify({choices:[{delta:{content:'Continued with retained task context.'},finish_reason:'stop'}]}) + '\n\n');
      }
      res.end('data: [DONE]\n\n');
    } catch (error) { upstreamError = error; res.end('data: [DONE]\n\n'); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    activeProvider = { id:'original', apiKey, baseUrl: `http://127.0.0.1:${server.address().port}` };
    const bindings=path.join(dataRoot,'thread-providers.json');
    const router=new ThreadProviderRouter(bindings,()=>activeProvider,()=> 'http://127.0.0.1:1');
    const runner = createTaskRunner(root, { dataRoot, provider: () => { providerReads++; return activeProvider; }, onThreadCreated:({threadId,providerId,model})=>{
      assert.equal(requests,0,'Bind the conversation before starting model work');
      router.save(threadId,providerId,'minimax',model);
    }, timeoutMs: 45000 });
    const directory = fs.mkdtempSync(path.join(root, '.project-cache/tmp/task-real-runner-'));
    let clock = Date.now();
    const scheduler = new TaskScheduler({ directory, runner, now: () => clock });
    const saved = scheduler.save({ ...task, cwd: workspace, kind: 'agent', notify: false, schedule: { kind: 'once', at: new Date(clock + 1000).toISOString() } });
    await scheduler.tick(); assert.equal(requests, 0);
    clock += 1500; await scheduler.tick();
    const result = scheduler.detail(saved.id).runs[0];
    await scheduler.stop();
    if (upstreamError) throw upstreamError;
    assert.equal(result.status, 'completed', result.error);
    assert.equal(result.trigger, 'scheduled');
    assert.ok(fs.existsSync(path.join(dataRoot, 'codex-home', 'config.toml')));
    assert.equal(providerReads, 1); assert.equal(requests, 2); assert.match(result.output, /Verified FELIX_SCHEDULE_OK/); assert.ok(result.threadId);
    const restarted = new TaskScheduler({ directory, runner });
    assert.equal(restarted.detail(saved.id).runs[0].output, result.output);
    assert.equal(restarted.detail(saved.id).cwd, workspace);
    assert.ok(result.threadId);
    assert.equal(router.get(result.threadId),'original');
    const recoveredRouter=new ThreadProviderRouter(bindings,id=>({id:id||'changed-default',apiKey:'key',baseUrl:'https://example.invalid'}),()=> 'http://127.0.0.1:1');
    const routed=[];await recoveredRouter.request({request:async(method,params)=>{routed.push(params);return {}; }},'thread/resume',{threadId:result.threadId});
    assert.equal(routed[0].config['model_providers.minimax.base_url'],'http://127.0.0.1:1/providers/original/v1');
    assert.equal(routed[0].model,task.model);
    const adapter=startMiniMaxAdapter({port:0,apiKey,upstream:`http://127.0.0.1:${server.address().port}`});await once(adapter,'listening');
    const child = spawn(findCommand(root).command, ['-c', 'web_search="disabled"', '-c', 'model_providers.minimax.name="MiniMax"', '-c', 'model_providers.minimax.wire_api="responses"', '-c', `model_providers.minimax.base_url="http://127.0.0.1:${adapter.address().port}/v1"`, 'app-server', '--stdio'], {cwd:root,windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,CODEX_HOME:path.join(dataRoot,'codex-home')}});
    const rpc = new CodexRpc(child);const timer=setTimeout(()=>rpc.close(),20000);
    try {
      await rpc.request('initialize',{clientInfo:{name:'task_resume_acceptance',version:'1'},capabilities:{experimentalApi:true}});rpc.notify('initialized',{});
      const restored=await rpc.request('thread/resume',{threadId:result.threadId});
      assert.equal(restored.thread.id,result.threadId);
      assert.ok(restored.thread.turns.some(turn=>turn.items.some(item=>item.type==='agentMessage' && item.text.includes('FELIX_SCHEDULE_OK'))));
      const completed=new Promise((resolve,reject)=>{
        rpc.once('closed',reject);
        rpc.on('notification',message=>{if(message.method==='turn/completed' && message.params.threadId===result.threadId){rpc.off('closed',reject);resolve(message.params.turn);}});
      });completed.catch(()=>{});
      const next=await rpc.request('turn/start',{threadId:result.threadId,collaborationMode:{mode:'default',settings:{model:task.model,reasoning_effort:null,developer_instructions:null}},input:[{type:'text',text:'Continue the scheduled task conversation.'}]});
      const finished=await completed;assert.equal(finished.id,next.turn.id);assert.equal(finished.status,'completed',JSON.stringify(finished.error));
      if(upstreamError)throw upstreamError;assert.equal(requests,3);
      const latest=await rpc.request('thread/resume',{threadId:result.threadId});
      assert.equal(latest.reasoningEffort,null,'Restored default is represented by explicit null');
      assert.equal(latest.thread.turns.length,2);
      assert.equal(latest.thread.turns[0].id,restored.thread.turns[0].id);
      assert.equal(latest.thread.turns[1].id,next.turn.id);
      assert.ok(latest.thread.turns.some(turn=>turn.items.some(item=>item.type==='agentMessage'&&item.text==='Continued with retained task context.')));
    } finally {clearTimeout(timer);const exited=child.exitCode===null?once(child,'exit').catch(()=>{}):Promise.resolve();rpc.close();await exited;adapter.closeAllConnections();await new Promise(resolve=>adapter.close(resolve));}
    assert.equal(restarted.detail(saved.id).runs.length,1,'Interactive continuation does not fabricate another scheduled run');
    assert.equal(restarted.detail(saved.id).runs[0].output,result.output);
    assert.equal(restarted.detail(saved.id).status, 'completed'); await restarted.stop();
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

}

test('missing key fails explicitly before launching a Codex process', async () => {
  const runner = createTaskRunner(root, { apiKey: () => '' });
  await assert.rejects(runner(task, { signal: new AbortController().signal, runId: randomUUID() }), /MINIMAX_API_KEY/);
});

test('binding failure stops before model execution and retains the created conversation ID', {timeout:20000}, async()=>{
  let requests=0;
  const server=http.createServer((req,res)=>{requests++;res.writeHead(500);res.end();});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const dataRoot=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'felix-binding-failure-'));
  let created;
  try {
    const runner=createTaskRunner(root,{dataRoot,provider:()=>({id:'selected',apiKey:'test',baseUrl:`http://127.0.0.1:${server.address().port}`}),onThreadCreated:binding=>{created=binding;throw Error('Binding disk full');}});
    await assert.rejects(runner(task,{signal:new AbortController().signal,runId:randomUUID()}),error=>{
      assert.equal(error.message,'Binding disk full');assert.equal(error.threadId,created.threadId);return true;
    });
    assert.equal(created.providerId,'selected');assert.equal(created.model,task.model);assert.equal(requests,0);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('invalid workspace fails before credentials or process startup', async () => {
  const runner = createTaskRunner(root, { apiKey: () => { throw Error('must not access credentials'); } });
  for (const cwd of [path.join(root, randomUUID()), __filename, '../relative']) {
    await assert.rejects(runner({ ...task, cwd }, { signal: new AbortController().signal, runId: randomUUID() }), /工作目录/);
  }
});

test('cancellation closes active model connections and terminates the dedicated child', { timeout: 20000 }, async () => {
  const controller = new AbortController();
  let incoming;
  const requested = new Promise(resolve => { incoming = resolve; });
  const server = http.createServer((req, res) => { incoming(); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const runner = createTaskRunner(root, { apiKey: () => 'local-test', upstream: `http://127.0.0.1:${server.address().port}`, timeoutMs: 8000 });
    const done = runner(task, { signal: controller.signal, runId: randomUUID() });
    const rejected = assert.rejects(done, error => { assert.match(error.message, /停止|超过/); assert.equal(typeof error.threadId, 'string'); assert.ok(error.threadId); return true; });
    await Promise.race([requested, done.catch(() => {})]); controller.abort(); await rejected;
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});


test('subsequent runs pick up the newly selected provider', { timeout: 60000 }, async () => {
  const servers = [], received = [];
  const dataRoot = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'felix-provider-runs-'));
  try {
    for (const name of ['first', 'second']) {
      const server = http.createServer(async (req, res) => {
        for await (const chunk of req) { /* drain request */ }
        received.push({ name, authorization: req.headers.authorization });
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: name + ' provider answered' }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
      });
      servers.push(server);
      server.listen(0, '127.0.0.1'); await once(server, 'listening');
    }
    let selected;
    const runner = createTaskRunner(root, { dataRoot, provider: () => selected, timeoutMs: 20000 });
    for (const [index, name] of ['first', 'second'].entries()) {
      selected = { apiKey: name + '-key', baseUrl: `http://127.0.0.1:${servers[index].address().port}` };
      const result = await runner({ ...task, prompt: 'Reply briefly.' }, { signal: new AbortController().signal, runId: randomUUID() });
      assert.match(result.output, new RegExp(name + ' provider answered'));
    }
    assert.deepEqual(received, [
      { name: 'first', authorization: 'Bearer first-key' },
      { name: 'second', authorization: 'Bearer second-key' },
    ]);
  } finally {
    for (const server of servers) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  }
});

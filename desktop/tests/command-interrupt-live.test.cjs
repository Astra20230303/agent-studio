const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { CodexRpc } = require('../electron/codex-rpc.cjs');
const { findCommand, compatibilityCatalog } = require('../electron/codex-server.cjs');
const { startMiniMaxAdapter } = require('../electron/minimax-adapter.cjs');
const http = require('node:http');

test('real app-server terminates a retained background command after interruption and continues the same conversation', { timeout: 30000 }, async () => {
  const root = path.resolve(__dirname, '../..');
  const cache = path.join(root, '.project-cache/tmp'); fs.mkdirSync(cache, { recursive: true });
  const profile = fs.mkdtempSync(path.join(cache, 'interrupt-command-live-'));
  let completeModel = false;
  let modelRequests = 0;
  const pidFile = path.join(profile, 'command.pid');
  const doneFile = path.join(profile, 'command-finished.txt');
  let commandPid;
  let upstreamError;
  const model = http.createServer(async (req, res) => {
    try {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw); modelRequests++;
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      if (completeModel) res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Resumed successfully.' }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
      else {
        const tools = body.tools || [];
        const tool = tools.find(tool => /(^|__)shell_command$/.test(tool.function.name)) || tools.find(tool => /(^|__)(exec_command|shell)$/.test(tool.function.name));
        assert.ok(tool, 'A shell tool must be available');
        const quote = value => "'" + value.replaceAll("'", "''") + "'";
        const command = `[IO.File]::WriteAllText(${quote(pidFile)}, [string]$PID); Start-Sleep -Seconds 20; [IO.File]::WriteAllText(${quote(doneFile)}, 'unexpected completion')`;
        const props = tool.function.parameters.properties;
        const args = props.cmd ? { cmd: command, yield_time_ms: 10000, max_output_tokens: 1000 } : { command: props.command.type === 'array' ? ['powershell.exe', '-NoProfile', '-Command', command] : command, timeout_ms: 30000 };
        res.end('data: ' + JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'interrupt-command', type: 'function', function: { name: tool.function.name, arguments: JSON.stringify(args) } }] }, finish_reason: 'tool_calls' }] }) + '\n\ndata: [DONE]\n\n');
      }
    } catch (error) { upstreamError = error; res.end(); }
  });
  const waitUntil = async predicate => {
    const deadline = Date.now() + 10000;
    while (!predicate()) {
      if (upstreamError) throw upstreamError;
      if (Date.now() > deadline) throw Error('Timed out waiting for command process');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };
  const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; } };
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  const adapter = startMiniMaxAdapter({ port: 0, apiKey: 'local-test', upstream: `http://127.0.0.1:${model.address().port}` }); await once(adapter, 'listening');
  const settings = [`model_catalog_json=${JSON.stringify(compatibilityCatalog(root, profile))}`, 'model_providers.minimax.name="MiniMax"', 'model_providers.minimax.wire_api="responses"', `model_providers.minimax.base_url="http://127.0.0.1:${adapter.address().port}/v1"`, 'web_search="disabled"'];
  const child = spawn(findCommand(root).command, [...settings.flatMap(value => ['-c', value]), 'app-server', '--stdio'], { cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, CODEX_HOME: profile } });
  const rpc = new CodexRpc(child);
  const waitFor = predicate => {
    const promise = new Promise((resolve, reject) => {
      const cleanup = () => { clearTimeout(deadline); rpc.off('notification', listener); rpc.off('closed', closed); };
      const listener = message => { if (predicate(message)) { cleanup(); resolve(message); } };
      const closed = error => { cleanup(); reject(error); };
      const deadline = setTimeout(() => { cleanup(); reject(Error('Timed out waiting for turn notification')); }, 15000);
      rpc.on('notification', listener); rpc.once('closed', closed);
    });
    promise.catch(() => {});
    return promise;
  };
  const timer = setTimeout(() => rpc.close(), 25000);
  try {
    await rpc.request('initialize', { clientInfo: { name: 'felix_interrupt_acceptance', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
    const { thread } = await rpc.request('thread/start', { cwd: profile, ephemeral: false, model: 'MiniMax-M2.1', modelProvider: 'minimax', approvalPolicy: 'never', sandbox: 'danger-full-access' });
    const firstCompletion = waitFor(message => message.method === 'turn/completed' && message.params.threadId === thread.id);
    const first = await rpc.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'Run the supplied isolated test command until interrupted.' }] });
    await waitUntil(() => fs.existsSync(pidFile));
    commandPid = Number(fs.readFileSync(pidFile, 'utf8').trim());
    assert.ok(Number.isInteger(commandPid) && commandPid > 0);
    assert.equal(alive(commandPid), true);
    const source = fs.readFileSync(path.resolve(__dirname, '../src/codexClient.ts'), 'utf8');
    const compiled = require('node:module').stripTypeScriptTypes(source).replace(/^import .*;\r?\n/gm, '').replace(/\bexport /g, '') + '\nObject.assign(exports, { interruptTurn, listBackgroundTerminals, terminateBackgroundTerminal });';
    const client = {};
    require('node:vm').runInNewContext(compiled, { exports: client, require: () => ({}), window: { codex: { request: async (method, params) => ({ ok: true, result: await rpc.request(method, params) }) } } });
    await client.interruptTurn(thread.id, first.turn.id);
    const interrupted = await firstCompletion;
    assert.equal(interrupted.params.turn.id, first.turn.id);
    assert.equal(interrupted.params.turn.status, 'interrupted');
    const terminals = await client.listBackgroundTerminals(thread.id);
    const terminal = terminals.data.find(item => item.osPid === commandPid || item.command.includes('command.pid'));
    assert.ok(terminal, 'Interrupted command remains manageable as a background terminal');
    const terminated = await client.terminateBackgroundTerminal(thread.id, terminal.processId);
    assert.equal(terminated, true);
    await waitUntil(() => !alive(commandPid));
    assert.equal(fs.existsSync(doneFile), false);
    assert.equal((await client.listBackgroundTerminals(thread.id)).data.some(item => item.processId === terminal.processId), false);
    assert.equal(modelRequests, 1);
    completeModel = true;
    const secondCompletion = waitFor(message => message.method === 'turn/completed' && message.params.threadId === thread.id);
    const second = await rpc.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'Continue after the interruption.' }] });
    const completed = await secondCompletion;
    assert.notEqual(second.turn.id, first.turn.id);
    assert.equal(completed.params.turn.id, second.turn.id);
    assert.equal(completed.params.turn.status, 'completed');
    assert.equal(modelRequests, 2);
    const history = await rpc.request('thread/turns/list', { threadId: thread.id, limit: 100 });
    assert.equal(history.data.find(turn => turn.id === first.turn.id).status, 'interrupted');
    assert.equal(history.data.find(turn => turn.id === second.turn.id).status, 'completed');
    const restored = await rpc.request('thread/resume', { threadId: thread.id });
    assert.equal(restored.thread.turns.find(turn => turn.id === first.turn.id).status, 'interrupted');
    assert.ok(restored.thread.turns.find(turn => turn.id === second.turn.id).items.some(item => item.type === 'agentMessage' && item.text.includes('Resumed successfully.')));
  } finally {
    clearTimeout(timer);
    if (commandPid && alive(commandPid)) process.kill(commandPid);
    const exited = child.exitCode === null ? once(child, 'exit').catch(() => {}) : Promise.resolve();
    rpc.close(); await exited;
    adapter.closeAllConnections(); await new Promise(resolve => adapter.close(resolve));
    model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
  }
});

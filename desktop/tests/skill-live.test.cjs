const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { CodexRpc } = require('../electron/codex-rpc.cjs');
const { findCommand, compatibilityCatalog } = require('../electron/codex-server.cjs');
const { startMiniMaxAdapter } = require('../electron/minimax-adapter.cjs');
const { userInput } = require('../src/attachments.ts');
const { restoreMessages } = require('../src/toolActivity.ts');

test('real app-server loads explicitly selected skill into model context and history', { timeout: 30000 }, async () => {
  const root = path.resolve(__dirname, '../..');
  const cache = path.join(root, '.project-cache/tmp');
  fs.mkdirSync(cache, { recursive: true });
  const profile = fs.mkdtempSync(path.join(cache, 'skill-live-'));
  const project = path.join(profile, 'project');
  const skillPath = path.join(project, '.agents/skills/acceptance/SKILL.md');
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  const marker = 'FELIX_SKILL_BODY_ACCEPTANCE_84D913';
  fs.writeFileSync(skillPath, `---\nname: acceptance\ndescription: Isolated explicit skill fixture\n---\n# Acceptance\nUse this exact marker in the reply: ${marker}\n`);
  const requests = [];
  const model = http.createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      requests.push(JSON.parse(body));
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Skill test completed.' }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
    });
  });
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  const adapter = startMiniMaxAdapter({ port: 0, apiKey: 'local-test', upstream: `http://127.0.0.1:${model.address().port}` });
  await once(adapter, 'listening');
  const settings = [`model_catalog_json=${JSON.stringify(compatibilityCatalog(root, profile))}`, 'model_providers.minimax.name="MiniMax"', 'model_providers.minimax.wire_api="responses"', `model_providers.minimax.base_url="http://127.0.0.1:${adapter.address().port}/v1"`, 'web_search="disabled"'];
  const child = spawn(findCommand(root).command, [...settings.flatMap(value => ['-c', value]), 'app-server', '--stdio'], { cwd: project, windowsHide: true, env: { ...process.env, CODEX_HOME: profile } });
  const exited = once(child, 'exit');
  const rpc = new CodexRpc(child);
  const timer = setTimeout(() => rpc.close(), 25000);
  try {
    await rpc.request('initialize', { clientInfo: { name: 'felix_skill_acceptance', version: '1' }, capabilities: { experimentalApi: true } });
    rpc.notify('initialized', {});
    const listed = await rpc.request('skills/list', { cwds: [project], forceReload: true });
    const skill = listed.data.flatMap(entry => entry.skills).find(item => item.name === 'acceptance');
    assert.ok(skill?.enabled);
    const { thread } = await rpc.request('thread/start', { cwd: project, model: 'MiniMax-M2.1', modelProvider: 'minimax', approvalPolicy: 'never', sandbox: 'read-only' });
    const completed = new Promise((resolve, reject) => {
      const closed = error => { rpc.off('notification', listener); reject(error); };
      const listener = message => {
        if (message.method !== 'turn/completed' || message.params.threadId !== thread.id) return;
        rpc.off('notification', listener); rpc.off('closed', closed);
        message.params.turn.status === 'completed' ? resolve() : reject(Error('Skill turn failed'));
      };
      rpc.once('closed', closed); rpc.on('notification', listener);
    });
    completed.catch(() => {});
    const selected = { name: skill.name, path: skill.path };
    await rpc.request('turn/start', { threadId: thread.id, input: userInput('Use the selected skill.', [], [], [selected]) });
    await completed;
    assert.ok(requests.length > 0, 'A real model transport request must occur');
    assert.ok(requests.some(request => JSON.stringify(request.messages).includes(marker)), 'Skill body must reach the model endpoint');
    const history = await rpc.request('thread/items/list', { threadId: thread.id, sortDirection: 'asc', limit: 100 });
    const messages = restoreMessages(history.data, []);
    assert.ok(messages.some(message => message.skills?.some(item => item.name === selected.name && item.path === selected.path)), 'History must retain the selected skill');
    assert.ok(messages.some(message => message.role === 'assistant' && message.content.includes('Skill test completed.')));
  } finally {
    clearTimeout(timer); rpc.close(); await exited;
    adapter.closeAllConnections(); await new Promise(resolve => adapter.close(resolve));
    model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
  }
});

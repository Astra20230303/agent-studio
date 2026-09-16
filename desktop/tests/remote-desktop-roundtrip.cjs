const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { RemoteDesktop, startRemoteBridge } = require('../electron/remote-desktop.cjs');
const { createTaskRunner } = require('../electron/task-runner.cjs');

(async () => {
  const remote = new RemoteDesktop();
  remote.enabled = true;
  const bridge = await startRemoteBridge(remote);
  process.env.FELIX_REMOTE_ENDPOINT = bridge.endpoint;
  process.env.FELIX_REMOTE_TOKEN = bridge.token;
  let requests = 0, failure;
  const upstream = http.createServer(async (req, res) => {
    try {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      requests++;
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const tool = body.tools?.find(item => /remote_desktop$/.test(item.function.name));
      if (!tool) {
        const search = body.tools?.find(item => item.function.name === 'tool_search');
        assert.ok(search && requests === 1, 'Remote MCP tool missing after discovery');
        console.log('Discovering remote tool:', JSON.stringify(search.function.parameters));
        res.end('data: ' + JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'discover', type: 'function', function: { name: search.function.name, arguments: JSON.stringify({ query: 'felix_remote_desktop remote_desktop', limit: 1 }) } }] }, finish_reason: 'tool_calls' }] }) + '\n\ndata: [DONE]\n\n');
        return;
      }
      if (requests > 2) {
        const images = body.messages.flatMap(message => Array.isArray(message.content) ? message.content.filter(part => part.type === 'image_url') : []);
        assert.ok(images.length >= requests - 2, 'Remote image did not reach the provider as multimodal content');
        assert.match(images.at(-1).image_url.url, /^data:image\/png;base64,/);
        console.log(`Provider received ${images.length} PNG observation(s).`);
      }
      const action = requests === 2 ? { type: 'screenshot' } : { type: 'move', x: 100, y: 100 };
      const delta = requests < 4 ? { tool_calls: [{ index: 0, id: 'remote-' + requests, type: 'function', function: { name: tool.function.name, arguments: JSON.stringify(action) } }] } : { content: 'REMOTE_ROUNDTRIP_OK' };
      res.end('data: ' + JSON.stringify({ choices: [{ delta, finish_reason: requests < 4 ? 'tool_calls' : 'stop' }] }) + '\n\ndata: [DONE]\n\n');
    } catch (error) { failure = error; res.end('data: ' + JSON.stringify({ error: { message: error.message } }) + '\n\n'); }
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  try {
    await remote.run({ type: 'connect' });
    const runner = createTaskRunner(path.resolve(__dirname, '../..'), { apiKey: () => 'test-only', upstream: `http://127.0.0.1:${upstream.address().port}`, timeoutMs: 60000 });
    const result = await runner({ model: 'gpt-5.2', prompt: 'Use remote_desktop to take a screenshot, move pointer to 100,100, and report completion.', permission: 'danger-full-access' }, { signal: new AbortController().signal, runId: randomUUID() });
    if (failure) throw failure;
    assert.equal(requests, 4);
    assert.match(result.output, /REMOTE_ROUNDTRIP_OK/);
    console.log('PASS: real app-server -> MCP -> noVNC -> PNG -> provider -> next action. Provider responses are deterministic test fixtures.');
  } finally {
    await remote.stop();
    bridge.server.closeAllConnections();
    upstream.closeAllConnections();
    await Promise.all([new Promise(resolve => bridge.server.close(resolve)), new Promise(resolve => upstream.close(resolve))]);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

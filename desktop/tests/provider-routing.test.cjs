const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { startMiniMaxAdapter } = require('../electron/minimax-adapter.cjs');

test('explicit provider routes isolate endpoints and credentials across concurrent requests', async () => {
  const servers = [], received = [], providers = {};
  let adapter, active = 'a';
  try {
    for (const id of ['a', 'b']) {
      const server = http.createServer(async (req, res) => {
        let body = ''; for await (const chunk of req) body += chunk;
        received.push({ id, key: req.headers.authorization, model: JSON.parse(body).model });
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: id }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
      });
      servers.push(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
      providers[id] = { apiKey: id + '-secret', baseUrl: `http://127.0.0.1:${server.address().port}` };
    }
    adapter = startMiniMaxAdapter({ port: 0, resolveProvider: id => {
      const provider = providers[id === undefined ? active : id];
      if (!provider) throw Error('private registry details');
      return provider;
    } });
    await once(adapter, 'listening');
    const send = async (route, model) => {
      const response = await fetch(`http://127.0.0.1:${adapter.address().port}${route}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, input: 'Hello' }),
      });
      return { status: response.status, body: await response.text() };
    };
    active = 'b';
    const results = await Promise.all(['a', 'b'].map(id => send(`/providers/${id}/v1/responses`, id + '-model')));
    assert.ok(results.every(result => result.status === 200 && result.body.includes('response.completed')));
    assert.deepEqual(received.sort((a, b) => a.id.localeCompare(b.id)), [
      { id: 'a', key: 'Bearer a-secret', model: 'a-model' },
      { id: 'b', key: 'Bearer b-secret', model: 'b-model' },
    ]);
    delete providers.a;
    const missing = await send('/providers/a/v1/responses', 'a-model');
    assert.equal(missing.status, 404);
    assert.ok(!missing.body.includes('private'));
    assert.equal(received.length, 2);
    assert.equal((await send('/v1/responses', 'default-model')).status, 200);
    assert.deepEqual(received.at(-1), { id: 'b', key: 'Bearer b-secret', model: 'default-model' });
    providers.remote = { apiKey: '', baseUrl: 'https://example.invalid/v1' };
    assert.equal((await send('/providers/remote/v1/responses', 'remote-model')).status, 401);
    assert.equal(received.length, 3, 'Missing remote credentials must not fall back to the active channel');
    for (const route of ['/providers/b/v1/responses?channel=a', '/providers/b/other', '/providers/%62/v1/responses']) {
      assert.equal((await send(route, 'bad-route')).status, 404);
    }
    assert.equal(received.length, 3);
  } finally {
    for (const server of [adapter, ...servers].filter(Boolean)) {
      server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
  }
});

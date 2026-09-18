const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createTaskRunner } = require('../electron/task-runner.cjs');
const { TaskScheduler } = require('../electron/task-scheduler.cjs');

const root = path.resolve(__dirname, '../..');

function providerServer(name, received) {
  return http.createServer(async (req, res) => {
    for await (const chunk of req) void chunk;
    received.push({ name, authorization: req.headers.authorization });
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end(`data: ${JSON.stringify({ choices: [{ delta: { content: `${name} provider answered` }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`);
  });
}

test('scheduled tasks stay on their bound provider after the global provider changes', { timeout: 60000 }, async () => {
  const received = [];
  const servers = [providerServer('alpha', received), providerServer('beta', received)];
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-task-provider-'));
  const directory = fs.mkdtempSync(path.join(root, '.project-cache/tmp/task-provider-'));
  const workspace = fs.mkdtempSync(path.join(root, '.project-cache/tmp/task-provider-workspace-'));
  let clock = Date.now();
  const providers = {};
  try {
    for (const [id, server] of [['alpha', servers[0]], ['beta', servers[1]]]) {
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      providers[id] = { apiKey: `${id}-key`, baseUrl: `http://127.0.0.1:${server.address().port}` };
    }
    let globalProviderId = 'alpha';
    const runner = createTaskRunner(root, {
      dataRoot,
      provider: providerId => {
        const id = providerId || globalProviderId;
        const selected = providers[id];
        if (!selected) throw new Error(`Provider ${id} is unavailable`);
        return selected;
      },
      timeoutMs: 20000,
    });
    const scheduler = new TaskScheduler({ directory, now: () => clock, runner });
    const task = providerId => scheduler.save({
      name: `${providerId} scheduled task`, kind: 'agent', model: 'MiniMax-M2.1',
      prompt: 'Reply briefly.', cwd: workspace, permission: 'read-only', notify: false,
      providerId, schedule: { kind: 'once', at: new Date(clock + 1000).toISOString() },
    });
    const alpha = task('alpha');
    globalProviderId = 'beta';
    clock += 1500;
    await scheduler.tick();
    assert.equal(scheduler.detail(alpha.id).runs[0].status, 'completed');
    assert.match(scheduler.detail(alpha.id).runs[0].output, /alpha provider answered/);

    const beta = task('beta');
    await scheduler.run(beta.id);
    assert.equal(scheduler.detail(beta.id).runs[0].status, 'completed');
    assert.match(scheduler.detail(beta.id).runs[0].output, /beta provider answered/);
    assert.deepEqual(received, [
      { name: 'alpha', authorization: 'Bearer alpha-key' },
      { name: 'beta', authorization: 'Bearer beta-key' },
    ]);
    await scheduler.stop();

    delete providers.alpha;
    const missing = scheduler.detail(alpha.id);
    assert.equal(missing.providerId, 'alpha');
    await assert.rejects(runner(missing, { signal: new AbortController().signal, runId: randomUUID() }), /Provider alpha is unavailable/);
  } finally {
    for (const server of servers) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
});

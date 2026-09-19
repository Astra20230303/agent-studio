const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { CodexRpc } = require('../electron/codex-rpc.cjs');
const { parseMcpStatusPage } = require('../src/mcpStatus.ts');
const { findCommand } = require('../electron/codex-server.cjs');

// Run the fixture through the same stdio transport as a configured MCP server.
if (process.argv.includes('--fixture')) {
  require('node:readline').createInterface({ input: process.stdin }).on('line', line => {
    const message = JSON.parse(line);
    if (message.id === undefined) return;
    let result;
    switch (message.method) {
      case 'initialize': result = { protocolVersion: '2024-11-05', capabilities: { tools: {}, resources: {} }, serverInfo: { name: 'felix-acceptance', version: '1.0.0' } }; break;
      case 'resources/list': result = { resources: [{ uri: 'fixture://readme', name: 'Readme', mimeType: 'text/plain' }] }; break;
      case 'resources/templates/list': result = { resourceTemplates: [{ uriTemplate: 'fixture://notes/{id}', name: 'Notes' }] }; break;
      case 'resources/read': result = { contents: [{ uri: message.params.uri, mimeType: 'text/plain', text: 'Felix resource acceptance' }] }; break;
      case 'ping': result = {}; break;
      case 'tools/list': result = { tools: [{ name: 'echo', annotations: { readOnlyHint: true, openWorldHint: false }, description: 'Acceptance echo', inputSchema: { type: 'object', properties: { text: { type: 'string' }, fail: { type: 'boolean' } }, required: ['text'] } }] }; break;
      case 'tools/call': {
        const { text, fail } = message.params.arguments;
        result = { content: [{ type: 'text', text: fail ? 'Fixture failure' : text }], structuredContent: { echoed: text }, isError: !!fail };
        break;
      }
      default:
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Unknown method' } }) + '\n');
        return;
    }
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }) + '\n');
  });
} else {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}

async function main() {
  const root = path.resolve(__dirname, '../..');
  const scratchRoot = path.join(root, '.project-cache/tmp');
  fs.mkdirSync(scratchRoot, { recursive: true });
  const home = fs.mkdtempSync(path.join(scratchRoot, 'mcp-live-'));
  const config = names => names.map(name => `[mcp_servers.${name}]\ncommand = ${JSON.stringify(process.execPath)}\nargs = [${JSON.stringify(__filename)}, "--fixture"]\nstartup_timeout_sec = 15\ntool_timeout_sec = 15\n`).join('\n');
  fs.writeFileSync(path.join(home, 'config.toml'), config(['acceptance_a', 'acceptance_b']));
  const child = spawn(findCommand(root).command, ['app-server', '--stdio'], { cwd: home, env: { ...process.env, CODEX_HOME: home, TEMP: home, TMP: home }, windowsHide: true });
  const exited = once(child, 'exit');
  const rpc = new CodexRpc(child);
  const timer = setTimeout(() => rpc.close(), 60000);
  try {
    await rpc.request('initialize', { clientInfo: { name: 'mcp_acceptance', version: '1' }, capabilities: { experimentalApi: true } });
    rpc.notify('initialized', {});
    const inventory = async threadId => {
      const entries = []; const cursors = new Set(); let cursor;
      do {
        const page = parseMcpStatusPage(await rpc.request('mcpServerStatus/list', { threadId, cursor, limit: 1, detail: 'toolsAndAuthOnly' }));
        assert.ok(page.data.length <= 1);
        entries.push(...page.data);
        cursor = page.nextCursor;
        if (cursor) { assert.ok(!cursors.has(cursor), 'Inventory cursor must advance'); cursors.add(cursor); }
      } while (cursor);
      return entries;
    };
    const initial = await inventory();
    assert.deepEqual(initial.map(entry => entry.name).sort(), ['acceptance_a', 'acceptance_b']);
    for (const entry of initial) {
      assert.equal(entry.authStatus, 'unsupported');
      assert.deepEqual(require('../src/mcpToolHints.ts').mcpToolHints(Object.values(entry.tools).find(tool=>tool.name==='echo').annotations),['只读：是','可能访问外部系统：否']);
      assert.equal(entry.toolsError, null);
      assert.ok(Object.values(entry.tools).some(tool => tool.name === 'echo' && tool.inputSchema.required.includes('text')));
    }
    const { thread } = await rpc.request('thread/start', { cwd: home, ephemeral: true, approvalPolicy: 'never', sandbox: 'read-only' });
    const call = (text, fail = false) => rpc.request('mcpServer/tool/call', { threadId: thread.id, server: 'acceptance_a', tool: 'echo', arguments: { text, fail } });
    const success = await call('Felix MCP acceptance');
    assert.deepEqual(success.content, [{ type: 'text', text: 'Felix MCP acceptance' }]);
    assert.deepEqual(success.structuredContent, { echoed: 'Felix MCP acceptance' });
    assert.equal(success.isError, false);
    const failure = await call('error case', true);
    assert.equal(failure.isError, true);
    assert.equal(failure.content[0].text, 'Fixture failure');
    assert.equal((await call('recovered')).content[0].text, 'recovered');
    const active = await inventory(thread.id);
    assert.equal(active.find(entry => entry.name === 'acceptance_a').runtimeStatus, 'connected');
    const full = await rpc.request('mcpServerStatus/list', { threadId: thread.id, detail: 'full' });
    const resourceServer = full.data.find(entry => entry.name === 'acceptance_a');
    assert.equal(resourceServer.resources[0].uri, 'fixture://readme');
    assert.equal(resourceServer.resourceTemplates[0].uriTemplate, 'fixture://notes/{id}');
    for (const threadId of [undefined, thread.id]) {
      const resource = await rpc.request('mcpServer/resource/read', { threadId, server: 'acceptance_a', uri: 'fixture://readme' });
      assert.deepEqual(require('../src/mcpResourceContent.ts').readMcpResourceContent(resource), [{ uri: 'fixture://readme', mimeType: 'text/plain', text: 'Felix resource acceptance' }]);
    }
    const templateUri = require('../src/mcpResourceTemplate.ts').expandResourceTemplate(resourceServer.resourceTemplates[0].uriTemplate, { id: 'a/b 中文' });
    assert.equal(templateUri, 'fixture://notes/a%2Fb%20%E4%B8%AD%E6%96%87');
    const templateResource = await rpc.request('mcpServer/resource/read', { threadId: thread.id, server: 'acceptance_a', uri: templateUri });
    assert.equal(require('../src/mcpResourceContent.ts').readMcpResourceContent(templateResource)[0].uri, templateUri);
    const compositeUri = require('../src/mcpResourceTemplate.ts').expandResourceTemplate('fixture://notes{/parts*}{?filters*}', { parts: ['a/b', '中文'], filters: { q: 'a&b' } });
    assert.equal(compositeUri, 'fixture://notes/a%2Fb/%E4%B8%AD%E6%96%87?q=a%26b');
    const compositeResource = await rpc.request('mcpServer/resource/read', { threadId: thread.id, server: 'acceptance_a', uri: compositeUri });
    assert.equal(require('../src/mcpResourceContent.ts').readMcpResourceContent(compositeResource)[0].uri, compositeUri);
    fs.writeFileSync(path.join(home, 'config.toml'), config(['acceptance_a', 'acceptance_c']));
    await rpc.request('config/mcpServer/reload', {});
    assert.deepEqual((await inventory()).map(entry => entry.name).sort(), ['acceptance_a', 'acceptance_c']);
    console.log('PASS: real app-server MCP discovery, pagination, schema, calls, error recovery, resources, runtime state and config reload.');
  } finally {
    clearTimeout(timer);
    rpc.close();
    await exited;
  }
}

const { spawn } = require('node:child_process');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { CodexRpc } = require('./codex-rpc.cjs');
const { startMiniMaxAdapter } = require('./minimax-adapter.cjs');
const { runtimeDirectory, runtimeFile } = require('./runtime-directory.cjs');

function findCommand(projectRoot, runtimeRoot = runtimeDirectory()) {
  if (runtimeRoot) return { command: runtimeFile(runtimeRoot, 'bin', process.platform === 'win32' ? 'codex.exe' : 'codex'), args: [] };
  if (process.env.CODEX_APP_SERVER_COMMAND) {
    const configured = path.resolve(process.env.CODEX_APP_SERVER_COMMAND);
    if (!configured.startsWith(path.resolve(projectRoot) + path.sep)) throw new Error('CODEX_APP_SERVER_COMMAND must point inside the project directory');
    if (!fs.existsSync(configured)) throw new Error(`Project Codex executable not found: ${configured}`);
    return { command: configured, args: [] };
  }
  const candidates = [
    path.join(projectRoot, '.project-cache', 'bin', process.platform === 'win32' ? 'codex.exe' : 'codex'),
    path.join(projectRoot, 'codex-upstream', 'codex-rs', 'target', 'debug', process.platform === 'win32' ? 'codex.exe' : 'codex'),
    path.join(projectRoot, 'codex-upstream', 'codex-rs', 'target', 'release', process.platform === 'win32' ? 'codex.exe' : 'codex')
  ];
  const found = candidates.find(file => fs.existsSync(file));
  if (!found) throw new Error(`Project open-source Codex executable not found. Build codex-upstream\\codex-rs first; refusing to use an installed Codex CLI.`);
  return { command: found, args: [] };
}

function tomlString(value) {
  // JSON quoted strings use the same escapes needed by TOML basic strings.
  return JSON.stringify(String(value));
}

function nodeCommand(runtimeRoot) {
  if (runtimeRoot) return runtimeFile(runtimeRoot, 'bin', process.platform === 'win32' ? 'node.exe' : 'node');
  if (process.env.FELIX_NODE_COMMAND) return process.env.FELIX_NODE_COMMAND;
  try {
    const command = process.platform === 'win32' ? 'where.exe' : 'which';
    return execFileSync(command, ['node'], { encoding: 'utf8', windowsHide: true }).split(/\r?\n/).find(Boolean) || 'node';
  } catch {
    return 'node';
  }
}

function ensureProjectConfig(codexHome, projectRoot, runtimeRoot = runtimeDirectory()) {
  const configPath = path.join(codexHome, 'config.toml');
  const script = runtimeRoot ? runtimeFile(runtimeRoot, 'electron', 'web-search-mcp.cjs') : path.join(projectRoot, 'desktop', 'electron', 'web-search-mcp.cjs');
  let existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  // Replace only Felix's managed section, preserving all user/project config.
  const lines = existing.split(/\r?\n/);
  const section = lines.findIndex(line => line.trim() === '[mcp_servers.felix_web_search]');
  if (section >= 0) {
    let start = section;
    if (start > 0 && lines[start - 1].trim() === '# Felix project web search bridge. This config lives under .project-cache.') start--;
    let end = section + 1;
    while (end < lines.length && !/^\s*\[/.test(lines[end])) end++;
    lines.splice(start, end - start);
    existing = lines.join('\n');
  }
  const suffix = [
    '',
    '# Felix project web search bridge. This config lives under .project-cache.',
    '[mcp_servers.felix_web_search]',
    // Electron's process.execPath is electron.exe, not a Node interpreter.
    // The project launcher already requires Node on PATH for its tooling.
    `command = ${tomlString(nodeCommand(runtimeRoot))}`,
    `args = [${tomlString(script)}]`,
    'enabled = true',
    'startup_timeout_sec = 20',
    'tool_timeout_sec = 20',
    'default_tools_approval_mode = "auto"',
    ''
  ].join('\n');
  const remoteSection = '[mcp_servers.felix_remote_desktop]';
  const remoteScript = runtimeRoot ? runtimeFile(runtimeRoot, 'electron', 'remote-desktop-mcp.cjs') : path.join(projectRoot, 'desktop', 'electron', 'remote-desktop-mcp.cjs');
  const remoteMatch = existing.match(/\[mcp_servers\.felix_remote_desktop\][\s\S]*?(?=\n\s*\[|$)/);
  let remoteConfig;
  if (remoteMatch) {
    existing = existing.replace(remoteMatch[0], '');
    const remoteLines = remoteMatch[0].trimEnd().split(/\r?\n/);
    for (const [key, value] of Object.entries({ command: tomlString(nodeCommand(runtimeRoot)), args: `[${tomlString(remoteScript)}]`, tool_timeout_sec: '360' })) {
      const index = remoteLines.findIndex(line => new RegExp(`^\\s*${key}\\s*=`).test(line));
      if (index >= 0) remoteLines[index] = `${key} = ${value}`;
      else remoteLines.push(`${key} = ${value}`);
    }
    remoteConfig = '\n' + remoteLines.join('\n') + '\n';
  } else remoteConfig = [
    '', remoteSection,
    `command = ${tomlString(nodeCommand(runtimeRoot))}`,
    `args = [${tomlString(remoteScript)}]`,
    'enabled = true', 'startup_timeout_sec = 20', 'tool_timeout_sec = 360',
    'env_vars = ["FELIX_REMOTE_ENDPOINT", "FELIX_REMOTE_TOKEN"]', '',
  ].join('\n');
  fs.writeFileSync(configPath, existing.replace(/\s*$/, '') + suffix + remoteConfig, 'utf8');
}

function compatibilityCatalog(projectRoot, codexHome, runtimeRoot = runtimeDirectory()) {
  const source = runtimeRoot ? runtimeFile(runtimeRoot, 'models.json') : path.join(projectRoot, 'codex-upstream', 'codex-rs', 'models-manager', 'models.json');
  const catalog = JSON.parse(fs.readFileSync(source, 'utf8'));
  // Felix's Chat Completions adapter executes direct function calls. The
  // bundled code-mode-only profiles otherwise suppress all tools on this host.
  for (const model of catalog.models) {
    if (model.tool_mode === 'code_mode_only') model.tool_mode = 'direct';
    model.use_responses_lite = false;
  }
  const target = path.join(codexHome, 'felix-models.json');
  fs.writeFileSync(target, JSON.stringify(catalog));
  return target;
}

class CodexServer {
  constructor(projectRoot, { dataRoot = require('./data-directory.cjs').dataDirectory(projectRoot), runtimeRoot = runtimeDirectory() } = {}) { this.projectRoot = projectRoot; this.dataRoot = dataRoot; this.runtimeRoot = runtimeRoot; this.rpc = null; this.child = null; this.adapter = null; }

  start() {
    if (this.rpc) return this.rpc;
    const { readProvider } = require('./provider-config.cjs');
    const resolved = findCommand(this.projectRoot, this.runtimeRoot);
    const cache = this.dataRoot;
    const temp = path.join(cache, 'temp');
    fs.mkdirSync(temp, { recursive: true });
    const env = { ...process.env, CODEX_HOME: path.join(cache, 'codex-home'), TEMP: temp, TMP: temp, TMPDIR: temp, npm_config_cache: path.join(cache, 'npm-cache') };
    // Always bind the local compatibility endpoint. With no key it returns a
    // deliberate 401 explaining the missing environment variable, instead of
    // making app-server fail with an opaque connection-refused error.
    env.MINIMAX_API_KEY = 'local-provider-adapter';
    fs.mkdirSync(env.CODEX_HOME, { recursive: true });
    ensureProjectConfig(env.CODEX_HOME, this.projectRoot, this.runtimeRoot);
    const catalog = compatibilityCatalog(this.projectRoot, env.CODEX_HOME, this.runtimeRoot);
    this.adapter = startMiniMaxAdapter({ apiKey: () => readProvider().apiKey, upstream: () => readProvider().baseUrl, onError: error => this.rpc?.emit('stderr', `Provider adapter error: ${error.message}`) });
    // Hosted web_search is unavailable through MiniMax Chat Completions. Felix
    // exposes an equivalent local MCP tool backed by public RSS search feeds.
    this.child = spawn(resolved.command, [...resolved.args, '-c', `model_catalog_json=${tomlString(catalog)}`, '-c', 'web_search="disabled"', '-c', 'features.responses_websockets=false', '-c', 'features.responses_websockets_v2=false', 'app-server', '--stdio'], {
      cwd: this.projectRoot, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true
    });
    this.rpc = new CodexRpc(this.child);
    this.rpc.command = resolved.command;
    const rpc = this.rpc;
    const child = this.child;
    const adapter = this.adapter;
    rpc.on('closed', () => {
      adapter.close();
      if (!child.killed) { try { child.kill(); } catch {} }
      if (this.rpc === rpc) { this.rpc = null; this.child = null; this.adapter = null; }
    });
    this.child.on('error', error => this.rpc?.emit('stderr', `Codex process error: ${error.message}`));
    return this.rpc;
  }

  stop() { if (this.rpc) this.rpc.close(); if (this.adapter) this.adapter.close(); this.rpc = null; this.child = null; this.adapter = null; }
}

module.exports = { CodexServer, findCommand, ensureProjectConfig, compatibilityCatalog };

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { TerminalManager } = require('../electron/terminal.cjs');
const { TaskScheduler } = require('../electron/task-scheduler.cjs');
const { assertWorkspaceIdle } = require('../electron/workspace-usage.cjs');

test('real terminal keeps its workspace protected until exit', { timeout: 20000 }, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-usage-'));
  const child = path.join(root, 'child'); fs.mkdirSync(child);
  const terminals = new TerminalManager(() => {});
  t.after(async () => { await terminals.closeAll(); fs.rmSync(root, { recursive: true, force: true }); });
  const check = () => assertWorkspaceIdle(root, { terminals, scheduler: { active: null }, projectRoot: root });
  const { id } = terminals.create(child);
  assert.throws(check, /终端会话/);
  const closing = terminals.close(id);
  assert.throws(check, /终端会话/);
  await closing;
  check(); assert.equal(terminals.directories.size, 0);
});

test('scheduler activity protects task cwd and releases after completion', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-task-usage-'));
  const terminals = { directories: new Map() };
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const scheduler = new TaskScheduler({ directory: path.join(root, 'data'), runner: async () => { await held; return { output: 'done' }; } });
  t.after(async () => { release(); await scheduler.stop(); fs.rmSync(root, { recursive: true, force: true }); });
  const task = scheduler.save({ name: 'Usage', kind: 'agent', prompt: 'Read', model: 'test', permission: 'read-only', schedule: { kind: 'daily', time: '09:00', timezone: 'UTC' } });
  const check = () => assertWorkspaceIdle(root, { terminals, scheduler, projectRoot: root });
  const running = scheduler.run(task.id);
  assert.throws(check, /定时任务/);
  release(); await running; check();
});

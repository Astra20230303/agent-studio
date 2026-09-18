const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { workspaceFile } = require('../electron/workspace-files.cjs');
(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-attachment-preview-'));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const project = path.join(root, 'project'); await fs.mkdir(project);
    const file = path.join(root, 'outside notes.txt');
    const picture = path.join(root, 'clipboard.png');
    await fs.writeFile(file, 'Attachment outside the project');
    await fs.writeFile(picture, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));
    const page = await browser.newPage(); const reads = [];
    await page.exposeFunction('readAttachment', async input => {
      reads.push(input);
      try { return { ok: true, result: await workspaceFile(input.root, input.path, input.action) }; }
      catch (error) { return { ok: false, error: error.message }; }
    });
    await page.addInitScript(({ project, file, picture }) => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', title: 'Attachments', cwd: project, status: 'completed', messages: [{ id: 'u', role: 'user', content: 'See attached', attachments: [file, picture] }], updatedAt: '' }] }));
      window.desktop = { workspaceFile: input => window.readAttachment(input) };
    }, { project, file, picture });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const openText = page.getByRole('button', { name: `预览附件：${file}`, exact: true });
    await openText.waitFor(); assert.equal(reads.length, 0);
    await openText.click();
    const dialog = page.getByRole('dialog', { name: '消息文件预览', exact: true });
    await dialog.getByText('Attachment outside the project', { exact: true }).waitFor();
    assert.equal(path.resolve(reads[0].root, reads[0].path), file);
    await fs.unlink(file);
    await dialog.getByRole('button', { name: '刷新预览' }).click();
    await dialog.getByRole('alert').filter({ hasText: 'ENOENT' }).waitFor();
    await fs.writeFile(file, 'Repaired attachment');
    await dialog.getByRole('button', { name: '刷新预览' }).click();
    await dialog.getByText('Repaired attachment', { exact: true }).waitFor();
    await dialog.getByRole('button', { name: '关闭预览' }).click();
    await page.getByRole('button', { name: `预览附件：${picture}`, exact: true }).click();
    await dialog.getByRole('img').waitFor();
    await page.waitForFunction(() => document.querySelector('dialog img')?.naturalWidth === 1);
    const imageBytes = await fs.readFile(picture);
    await fs.writeFile(picture, 'broken PNG');
    await dialog.getByRole('button', { name: '刷新预览' }).click();
    await dialog.getByRole('alert').getByText('图片无法解码，文件可能已损坏。请修复文件后刷新预览。', { exact: true }).waitFor();
    await fs.writeFile(picture, imageBytes);
    await dialog.getByRole('button', { name: '刷新预览' }).click();
    await page.waitForFunction(() => document.querySelector('dialog img')?.naturalWidth === 1);
    assert.equal(await dialog.getByRole('alert').count(), 0);
    await dialog.getByRole('button', { name: '关闭预览' }).click();
    await page.reload(); await openText.click();
    await dialog.getByText('Repaired attachment', { exact: true }).waitFor();
    console.log('PASS: attachments read on demand, outside-project text and clipboard image preview, missing-file retry and history reload');
  } finally { await browser.close(); await fs.rm(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });

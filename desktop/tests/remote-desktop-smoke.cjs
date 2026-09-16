const { RemoteDesktop } = require('../electron/remote-desktop.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const remote = new RemoteDesktop();
  remote.enabled = true;
  try {
    const result = await remote.run({ type: 'connect' });
    const image = result.content.find(item => item.type === 'image');
    assert.ok(image?.data.length > 1000);
    const output = path.resolve(__dirname, '../../.project-cache/remote-desktop-smoke.png');
    fs.writeFileSync(output, Buffer.from(image.data, 'base64'));
    console.log(result.content[0].text);
    console.log(output);
    // Move only: confirms input reaches the connected canvas without changing remote files.
    await remote.run({ type: 'move', x: 30, y: 30 });
    console.log('Connected, captured screenshot, and moved pointer successfully.');
  } finally { await remote.stop(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

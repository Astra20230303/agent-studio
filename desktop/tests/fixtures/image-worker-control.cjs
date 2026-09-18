const { parentPort, workerData } = require('node:worker_threads');
const mode = workerData.paths[0];
if (mode === 'hang') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
else if (mode === 'crash') process.exit(7);
else parentPort.postMessage({ ok: true });

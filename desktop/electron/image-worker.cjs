const { parentPort, workerData } = require('node:worker_threads');

(async () => {
  if (workerData.type === 'validate') {
    await require('./attachment-validation.cjs').validateImageInputs('turn/start', { input: workerData.paths.map(path => ({ type: 'localImage', path })) });
    return;
  }
  if (workerData.type === 'paste') return require('./pasted-image.cjs').savePastedImage(workerData.dataRoot, workerData.bytes);
  throw Error('Unknown image operation');
})().then(result => parentPort.postMessage({ ok: true, result }), error => parentPort.postMessage({ ok: false, error: error.message || String(error) }));

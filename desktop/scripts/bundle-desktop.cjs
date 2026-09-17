const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { verifyRuntime } = require('./verify-runtime.cjs');

function bundleDesktop({ output, runtime, desktop = path.resolve(__dirname, '..') }) {
  if (process.platform !== 'win32') throw new Error('Desktop directory packaging currently supports Windows');
  if (!path.isAbsolute(output) || !path.isAbsolute(runtime)) throw new Error('Output and runtime must be absolute paths');
  if (fs.existsSync(output)) throw new Error('Output already exists; choose a new directory');
  verifyRuntime(runtime);
  if (!fs.existsSync(path.join(desktop, 'dist/index.html'))) throw new Error('Run the production build first');
  const resolve = createRequire(path.join(desktop, 'package.json'));
  const electronDist = path.dirname(resolve('electron'));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.mkdirSync(output);
  try {
    fs.cpSync(electronDist, output, { recursive: true, dereference: true });
    fs.renameSync(path.join(output, 'electron.exe'), path.join(output, 'Felix.exe'));
    const appRoot = path.join(output, 'resources/app');
    fs.mkdirSync(appRoot, { recursive: true });
    for (const directory of ['electron', 'dist']) fs.cpSync(path.join(desktop, directory), path.join(appRoot, directory), { recursive: true, dereference: true });
    const sourcePackage = JSON.parse(fs.readFileSync(path.join(desktop, 'package.json'), 'utf8'));
    fs.writeFileSync(path.join(appRoot, 'package.json'), JSON.stringify({ name: 'felix', productName: 'Felix', version: sourcePackage.version, main: 'electron/main.cjs' }, null, 2));
    const copied = new Map();
    function copyDependency(name, parentRequire) {
      let directory = path.dirname(parentRequire.resolve(name));
      while (!fs.existsSync(path.join(directory, 'package.json')) || JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8')).name !== name) {
        const parent = path.dirname(directory);
        if (parent === directory) throw new Error(`Cannot locate package ${name}`);
        directory = parent;
      }
      const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
      if (copied.has(name)) {
        if (copied.get(name) !== pkg.version) throw new Error(`Conflicting dependency versions: ${name}`);
        return;
      }
      copied.set(name, pkg.version);
      fs.cpSync(directory, path.join(appRoot, 'node_modules', name), { recursive: true, dereference: true, filter: source => path.basename(source) !== 'node_modules' });
      const childRequire = createRequire(path.join(directory, 'package.json'));
      for (const dependency of Object.keys(pkg.dependencies || {})) copyDependency(dependency, childRequire);
    }
    for (const dependency of ['node-pty', 'cron-parser', 'playwright']) copyDependency(dependency, resolve);
    fs.cpSync(runtime, path.join(output, 'resources/felix-runtime'), { recursive: true, dereference: true });
    verifyRuntime(path.join(output, 'resources/felix-runtime'));
    fs.writeFileSync(path.join(output, 'desktop-manifest.json'), JSON.stringify({ version: sourcePackage.version, platform: process.platform, arch: process.arch, dependencies: Object.fromEntries(copied) }, null, 2));
    return path.join(output, 'Felix.exe');
  } catch (error) { fs.rmSync(output, { recursive: true, force: true }); throw error; }
}

if (require.main === module) {
  try {
    const output = path.resolve(process.argv[2] || path.join(__dirname, '../../.project-cache/felix-desktop'));
    const runtime = path.resolve(process.argv[3] || path.join(__dirname, '../../.project-cache/felix-runtime-licensed'));
    console.log(`Desktop created: ${bundleDesktop({ output, runtime })}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { bundleDesktop };

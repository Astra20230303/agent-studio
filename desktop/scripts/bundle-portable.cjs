const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {verifyDesktop, digest} = require('./verify-desktop.cjs');
const {verifyRuntime} = require('./verify-runtime.cjs');
function bundlePortable({source, output}) {
  if (process.platform !== 'win32') throw Error('Portable ZIP packaging currently supports Windows');
  if (!path.isAbsolute(source) || !path.isAbsolute(output)) throw Error('Source and output must be absolute paths');
  source = fs.realpathSync(source); output = path.resolve(output);
  const relative = path.relative(source, output);
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) throw Error('Release output must be outside the desktop package');
  if (fs.existsSync(output)) throw Error('Release output already exists; choose a new directory');
  verifyDesktop(source); verifyRuntime(path.join(source, 'resources/felix-runtime'));
  fs.mkdirSync(output, {recursive:true});
  try {
    const filename = 'Felix-portable.zip'; const archive = path.join(output, filename);
    execFileSync('tar.exe', ['-a', '-cf', archive, '-C', source, '.'], {windowsHide:true, stdio:'pipe'});
    // Detect package changes during archiving before publishing its checksum.
    verifyDesktop(source);
    fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), `${digest(archive).sha256}  ${filename}\n`, {flag:'wx'});
    fs.writeFileSync(path.join(output, 'README.txt'), 'Felix for Windows (unsigned portable build)\r\n\r\nVerify the ZIP SHA-256 against SHA256SUMS.txt, then extract all files to a writable directory and run Felix.exe.\r\nGit and a supported browser are external requirements. Configure a model provider in Felix.\r\nApplication data is stored separately from the extracted app.\r\nChecksums detect corruption; they are not a publisher signature.\r\n');
    return archive;
  } catch (error) { fs.rmSync(output, {recursive:true, force:true}); throw error; }
}
if (require.main === module) {
  try {
    if (!process.argv[2] || !process.argv[3]) throw Error('Usage: node bundle-portable.cjs <desktop directory> <new release directory>');
    console.log(`Portable release created: ${bundlePortable({source:path.resolve(process.argv[2]), output:path.resolve(process.argv[3])})}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {bundlePortable};

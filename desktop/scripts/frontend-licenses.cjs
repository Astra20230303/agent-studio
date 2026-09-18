const fs = require('node:fs');
const path = require('node:path');
function packageLicense(directory) {
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') throw Error('Invalid package identity');
  const notices = fs.readdirSync(directory).sort().filter(name => /^(licen[cs]e|copying|notice)([.-]|$)/i.test(name) && fs.lstatSync(path.join(directory,name)).isFile()).map(name => ({name, text:fs.readFileSync(path.join(directory,name),'utf8')}));
  return { name:pkg.name, version:pkg.version, license:typeof pkg.license === 'string' ? pkg.license : 'UNKNOWN', notices, reviewRequired:notices.length === 0 };
}
function frontendLicensePlugin() {
  return {
    name:'felix-frontend-licenses', apply:'build',
    generateBundle(_options, bundle) {
      const directories = new Set();
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        for (const id of Object.keys(chunk.modules)) {
          const filename = id.split('?')[0];
          if (!filename.replaceAll('\\','/').includes('/node_modules/') || !fs.existsSync(filename)) continue;
          let directory = path.dirname(filename);
          while (!fs.existsSync(path.join(directory,'package.json'))) {
            const parent = path.dirname(directory); if (parent === directory) throw Error(`Missing package metadata for ${id}`); directory=parent;
          }
          directories.add(fs.realpathSync(directory));
        }
      }
      const components = [...directories].map(packageLicense).sort((a,b)=>a.name.localeCompare(b.name)||a.version.localeCompare(b.version));
      this.emitFile({type:'asset',fileName:'third-party-licenses.json',source:JSON.stringify({format:1,components},null,2)+'\n'});
    }
  };
}
module.exports={packageLicense,frontendLicensePlugin};

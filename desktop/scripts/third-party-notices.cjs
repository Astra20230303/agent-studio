const fs = require('node:fs');
const path = require('node:path');
const {packageLicense} = require('./frontend-licenses.cjs');
function writeThirdPartyNotices(root) {
  const desktop=JSON.parse(fs.readFileSync(path.join(root,'desktop-manifest.json'),'utf8'));
  const frontend=JSON.parse(fs.readFileSync(path.join(root,'resources/app/dist/third-party-licenses.json'),'utf8'));
  if(frontend.format!==1 || !Array.isArray(frontend.components) || !frontend.components.length)throw Error('Missing frontend license inventory; rebuild the UI');
  const components=frontend.components.map(entry=>({...entry,scope:'frontend'}));
  for(const [name,version] of Object.entries(desktop.dependencies)) {
    if(!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name) || name==='.' || name==='..')throw Error('Invalid dependency name');
    const entry=packageLicense(path.join(root,'resources/app/node_modules',name));
    if(entry.name!==name || entry.version!==version)throw Error(`Dependency inventory mismatch: ${name}`);
    components.push({...entry,scope:'desktop'});
  }
  const runtime=JSON.parse(fs.readFileSync(path.join(root,'resources/felix-runtime/manifest.json'),'utf8'));
  const externalNotices=[
    {name:'Electron',version:fs.readFileSync(path.join(root,'version'),'utf8').trim(),scope:'shell',files:['LICENSE','LICENSES.chromium.html']},
    {name:'Node.js',version:runtime.nodeVersion,scope:'runtime',files:['resources/felix-runtime/licenses/node-LICENSE']},
    {name:'Codex',version:runtime.codexVersion,scope:'runtime',files:['resources/felix-runtime/licenses/codex-LICENSE','resources/felix-runtime/licenses/codex-NOTICE']},
  ];
  for(const component of externalNotices)for(const file of component.files)if(!fs.statSync(path.join(root,file)).isFile())throw Error(`Missing license: ${file}`);
  const reviewRequired=['Codex transitive Rust dependencies require a separate license audit.', 'Native binary transitive dependencies require review of their bundled notices and distribution obligations.', ...components.filter(item=>item.reviewRequired || item.license==='UNKNOWN').map(item=>`Review ${item.name}@${item.version} (${item.scope}): missing license metadata or text.`)];
  const report={format:1,components,externalNotices,reviewRequired};
  fs.writeFileSync(path.join(root,'THIRD-PARTY-COMPONENTS.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  const lines=['Felix third-party components','', 'Generated inventory; outstanding review items are listed at the end.',''];
  for(const entry of components){lines.push(`${entry.name}@${entry.version} [${entry.scope}] — ${entry.license}`);for(const notice of entry.notices)lines.push(`--- ${notice.name} ---`,notice.text);lines.push('');}
  for(const entry of externalNotices)lines.push(`${entry.name} ${entry.version}: ${entry.files.join(', ')}`);
  lines.push('','Outstanding review:',...reviewRequired);
  fs.writeFileSync(path.join(root,'THIRD-PARTY-NOTICES.txt'),lines.join('\n')+'\n',{flag:'wx'});
  return report;
}
module.exports={writeThirdPartyNotices};

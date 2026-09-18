const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {packageLicense,frontendLicensePlugin}=require('../scripts/frontend-licenses.cjs');
const {writeThirdPartyNotices}=require('../scripts/third-party-notices.cjs');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'felix-licenses-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function file(root,name,text){const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);return target;}
function pkg(root,name,version='1.2.3'){file(root,'package.json',JSON.stringify({name,version,license:'MIT'}));file(root,'LICENSE','Example license text');return file(root,'index.js','export const x=1;');}
test('frontend inventory includes only bundled packages and deduplicates modules',t=>{
 const root=fixture(t);const one=path.join(root,'node_modules','one');const unused=path.join(root,'node_modules','unused');
 const id=pkg(one,'one');pkg(unused,'unused');const second=file(one,'other.js','export const y=2;');let asset;
 frontendLicensePlugin().generateBundle.call({emitFile:value=>asset=value},{},{chunk:{type:'chunk',modules:{[id]:{},[second]:{},[path.join(root,'app.js')]:{}}}});
 const report=JSON.parse(asset.source);assert.equal(report.components.length,1);assert.equal(report.components[0].name,'one');assert.equal(report.components[0].notices[0].text,'Example license text');assert.ok(!asset.source.includes(root));
});
test('missing license files are explicitly marked for review',t=>{
 const root=fixture(t);pkg(root,'unknown');fs.unlinkSync(path.join(root,'LICENSE'));
 assert.equal(packageLicense(root).reviewRequired,true);
});
test('desktop inventory matches packaged versions, references external notices and retains review gaps',t=>{
 const root=fixture(t);pkg(path.join(root,'resources/app/node_modules/native'),'native');
 file(root,'desktop-manifest.json',JSON.stringify({dependencies:{native:'1.2.3'}}));
 file(root,'resources/app/dist/third-party-licenses.json',JSON.stringify({format:1,components:[{name:'ui',version:'2',license:'UNKNOWN',notices:[],reviewRequired:true}]}));
 file(root,'resources/felix-runtime/manifest.json',JSON.stringify({nodeVersion:'v22',codexVersion:'codex 1'}));
 for(const name of ['version','LICENSE','LICENSES.chromium.html','resources/felix-runtime/licenses/node-LICENSE','resources/felix-runtime/licenses/codex-LICENSE','resources/felix-runtime/licenses/codex-NOTICE'])file(root,name,'license');
 const report=writeThirdPartyNotices(root);assert.equal(report.components.length,2);assert.equal(report.externalNotices.length,3);
 assert.ok(report.reviewRequired.some(item=>item.includes('ui@2')));assert.ok(report.reviewRequired.some(item=>item.includes('Rust')));
 assert.match(fs.readFileSync(path.join(root,'THIRD-PARTY-NOTICES.txt'),'utf8'),/Example license text/);
 file(root,'desktop-manifest.json',JSON.stringify({dependencies:{native:'wrong'}}));assert.throws(()=>writeThirdPartyNotices(root),/mismatch/);
});

const {test}=require('node:test');const assert=require('node:assert/strict');const {configNotice}=require('../src/configNotice.ts');
test('config and deprecation diagnostics preserve guidance and one-based location',()=>{
 assert.equal(configNotice('configWarning',{summary:'Ignored',details:'Use new option\nRestart',path:'D:/config.toml',range:{start:{line:2,column:4}}}),'配置警告：Ignored\nUse new option\nRestart\n配置文件：D:/config.toml（第 2 行，第 4 列）');
 assert.equal(configNotice('deprecationNotice',{summary:'Old feature',details:null}),'弃用提示：Old feature');
 assert.equal(configNotice('configWarning',{summary:'Bad',path:'file',range:{start:{line:0,column:1}}}),'配置警告：Bad\n配置文件：file');
 for(const value of [null,[],{summary:''},{summary:4},{summary:'ok',details:[]}])assert.equal(configNotice('configWarning',value),undefined);
 assert.equal(configNotice('warning',{summary:'unrelated'}),undefined);
});

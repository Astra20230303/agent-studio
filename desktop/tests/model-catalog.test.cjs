const {test}=require('node:test');const assert=require('node:assert/strict');
const {modelCatalogIds}=require('../src/modelCatalog.ts');
test('rejects entire malformed catalogs and preserves ordered unique model IDs',()=>{
 for(const models of [null,{},'model',[],[''],[' '],[' padded '],['valid',{}],['valid',null],['valid',2]])assert.throws(()=>modelCatalogIds({ok:true,models}),/模型列表格式无效/);
 assert.deepEqual(modelCatalogIds({ok:true,models:['B','a','B','模型']}),['B','a','模型']);
 assert.throws(()=>modelCatalogIds({ok:false,error:'offline'}),/offline/);
 assert.throws(()=>modelCatalogIds({ok:1,models:['model']}),/无法获取模型列表/);
});

const {test}=require('node:test');const assert=require('node:assert/strict');const {readMcpResourceContent}=require('../src/mcpResourceContent.ts');
test('resources retain returned URI, empty text and optional media type',()=>{
 assert.deepEqual(readMcpResourceContent({contents:[]}),[]);
 assert.deepEqual(readMcpResourceContent({contents:[{uri:'custom://resolved',text:'',extra:'ignored'},{uri:'custom://image',mimeType:'image/png',blob:'AAAA'}]}),[{uri:'custom://resolved',text:''},{uri:'custom://image',mimeType:'image/png',blob:'AAAA'}]);
});
test('malformed resources fail before entering render state',()=>{
 for(const value of [null,{}, {contents:{}}, {contents:[null]}, {contents:[{uri:'x'}]}, {contents:[{uri:' ',text:'x'}]}, {contents:[{uri:'x',text:3}]}, {contents:[{uri:'x',text:'ok',mimeType:{}}]}])assert.throws(()=>readMcpResourceContent(value),/MCP 资源/);
});

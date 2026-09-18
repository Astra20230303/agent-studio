const {test}=require('node:test');const assert=require('node:assert/strict');
const {parseMcpStatusPage}=require('../src/mcpStatus.ts');
test('validates MCP status pages, clones data and preserves cursor',()=>{
 const input={data:[{name:'server',authStatus:'unsupported',runtimeStatus:'connected',tools:{read:{description:'Read'}},resources:[],resourceTemplates:[]}],nextCursor:'next'};
 const result=parseMcpStatusPage(input);assert.equal(result.nextCursor,'next');result.data[0].tools.read.description='changed';assert.equal(input.data[0].tools.read.description,'Read');
});
test('rejects malformed MCP pages and duplicate servers',()=>{
 for(const page of [null,{}, {data:{}},{data:[],nextCursor:{}},{data:[],nextCursor:' '},
  {data:[null]},{data:[{name:'',authStatus:'unsupported'}]},{data:[{name:'a',authStatus:3}]},
  {data:[{name:'a',authStatus:'unsupported'},{name:'a',authStatus:'unsupported'}]},
  {data:[{name:'a',authStatus:'unsupported',tools:[]} ]},{data:[{name:'a',authStatus:'unsupported',tools:{x:{description:3}}}]},
  {data:[{name:'a',authStatus:'unsupported',resources:{}}]}]) assert.throws(()=>parseMcpStatusPage(page),/MCP/);
});
test('accepts optional status fields and an empty terminal page',()=>{assert.deepEqual(parseMcpStatusPage({data:[]}),{data:[],nextCursor:undefined});assert.equal(parseMcpStatusPage({data:[{name:'a',authStatus:'unknown'}]}).data[0].name,'a');});

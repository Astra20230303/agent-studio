const {test}=require('node:test');const assert=require('node:assert/strict');
const {taskTimezones}=require('../src/taskTimezones.ts');
test('runtime timezone directory includes regions beyond original shortlist',()=>{
 const zones=taskTimezones('US/Eastern','Asia/Shanghai');
 for(const zone of ['US/Eastern','Asia/Shanghai','UTC','Europe/Paris','Australia/Sydney','Pacific/Auckland'])assert.ok(zones.includes(zone));
 assert.equal(zones.length,new Set(zones).size);assert.ok(zones.length>100);
});
test('saved aliases and local zone survive missing or failing directory',()=>{
 const zones=taskTimezones('Saved/Alias','Local/Zone',()=>['Europe/Paris','UTC','Europe/Paris']);
 assert.deepEqual(new Set(zones),new Set(['Saved/Alias','Local/Zone','Europe/Paris','UTC']));
 const fallback=taskTimezones('US/Eastern','Asia/Tokyo',()=>{throw Error('unavailable');});
 assert.ok(fallback.includes('US/Eastern'));assert.ok(fallback.includes('Asia/Tokyo'));assert.ok(fallback.includes('UTC'));
});

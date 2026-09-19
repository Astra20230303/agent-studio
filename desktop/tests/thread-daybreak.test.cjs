const test = require('node:test');
const assert = require('node:assert/strict');
const { updateThreadDaybreakParams } = require('../src/threadMetadata.ts');
const { readThreadResume } = require('../src/threadResume.ts');
test('thread Daybreak metadata is validated and restored', () => {
  assert.deepEqual(updateThreadDaybreakParams('thread-1', true), { threadId: 'thread-1', daybreakEnabled: true });
  assert.equal(readThreadResume({ thread: { id: 'thread-1', turns: [], daybreakEnabled: false } }, 'thread-1').daybreakEnabled, false);
  assert.throws(() => updateThreadDaybreakParams('thread-1', 'true'));
  assert.throws(() => readThreadResume({ thread: { id: 'thread-1', turns: [], daybreakEnabled: 'yes' } }, 'thread-1'));
});
const { readThreadDaybreakResponse } = require('../src/threadMetadata.ts');
test('Daybreak saves require the matching thread and explicit boolean confirmation', () => {
 assert.equal(readThreadDaybreakResponse({thread:{id:'t',daybreakEnabled:false}},'t'),false);
 for (const value of [{}, {thread:{id:'other',daybreakEnabled:true}}, {thread:{id:'t',daybreakEnabled:null}}, {thread:{id:'t',daybreakEnabled:'true'}}]) assert.throws(()=>readThreadDaybreakResponse(value,'t'));
 assert.equal(readThreadResume({thread:{id:'t',turns:[],daybreakEnabled:null}},'t').daybreakEnabled,undefined);
});

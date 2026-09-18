const { test } = require('node:test');
const assert = require('node:assert/strict');
const { approvalFileChanges } = require('../src/approvalFileChanges.ts');
test('file approval never borrows changes from another thread, turn, item or tool kind', () => {
  const changes = [{path:'example.txt',diff:'+review me'}];
  const threads = [{remoteId:'remote',messages:[{id:'tool-file',tool:{turnId:'turn',kind:'fileChange',changes}}]}];
  const request = {method:'item/fileChange/requestApproval',params:{threadId:'remote',turnId:'turn',itemId:'file'}};
  assert.equal(approvalFileChanges(request, threads),changes);
  for (const key of ['threadId','turnId','itemId']) {
    for (const value of ['other','',undefined]) {
      assert.equal(approvalFileChanges({...request,params:{...request.params,[key]:value}},threads),undefined);
    }
  }
  assert.equal(approvalFileChanges({...request,method:'item/commandExecution/requestApproval'},threads),undefined);
  threads[0].messages[0].tool.kind='commandExecution';
  assert.equal(approvalFileChanges(request,threads),undefined);
  assert.equal(approvalFileChanges(null,threads),undefined);
});

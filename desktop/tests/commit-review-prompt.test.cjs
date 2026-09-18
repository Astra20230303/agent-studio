const {test}=require('node:test');const assert=require('node:assert/strict');
const {commitReviewPrompt,COMMIT_REVIEW_LIMIT}=require('../src/commitReviewPrompt.ts');
const commit='a'.repeat(40);
test('historical review includes exact revision, workspace, patch and user focus',()=>{
 const text=commitReviewPrompt('D:/repo with spaces',commit,'diff --git a/code b/code\n+changed','  检查错误处理  ');
 for(const value of [commit,'D:/repo with spaces','+changed','评审重点：检查错误处理','以目标提交及其父提交为依据'])assert.ok(text.includes(value));
 assert.ok(!text.includes('已截断'));
});
test('large detail has bounded excerpt with explicit follow-up and full identity',()=>{
 const text=commitReviewPrompt('D:/repo',commit,'x'.repeat(COMMIT_REVIEW_LIMIT)+'omitted');
 assert.ok(text.includes('已截断'));assert.ok(text.includes(commit));assert.ok(!text.includes('omitted'));assert.ok(text.length<COMMIT_REVIEW_LIMIT+1000);
 for(const [id,detail] of [['bad','patch'],[commit,' ']])assert.throws(()=>commitReviewPrompt('D:/repo',id,detail),/有效的提交详情/);
});

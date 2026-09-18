const {test}=require('node:test');const assert=require('node:assert/strict');const {parseGitWorktrees}=require('../src/gitWorktreesResponse.ts');
const head='a'.repeat(40);const base={worktrees:[{path:'D:/repo',primary:true,current:true,branch:'main',head},{path:'D:/other',branch:'feature',head}]};
test('validates and clones worktree records',()=>{const value=parseGitWorktrees(base);value[0].path='changed';assert.equal(base.worktrees[0].path,'D:/repo');});
test('rejects malformed and duplicate worktrees',()=>{for(const value of [null,{}, {worktrees:{}},{worktrees:[null]},{worktrees:[{path:''}]},{worktrees:[{path:'a',head:'bad'}]},{worktrees:[{path:'a',primary:'yes'}]},{worktrees:[{path:'a'},{path:'a'}]}])assert.throws(()=>parseGitWorktrees(value),/Git 工作树/);});
test('accepts detached, locked and prunable entries',()=>{assert.equal(parseGitWorktrees({worktrees:[{path:'a',head,detached:true,locked:true,prunable:'gone'}]})[0].locked,true);});

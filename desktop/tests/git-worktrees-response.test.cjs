const {test}=require('node:test');const assert=require('node:assert/strict');const {parseGitWorktrees}=require('../src/gitWorktreesResponse.ts');
const head='a'.repeat(40);const base={worktrees:[{path:'D:/repo',primary:true,current:true,branch:'main',head},{path:'D:/other',branch:'feature',head}]};
test('validates and clones worktree records',()=>{const value=parseGitWorktrees(base);value[0].path='changed';assert.equal(base.worktrees[0].path,'D:/repo');});
test('rejects malformed and duplicate worktrees',()=>{for(const value of [null,{}, {worktrees:{}},{worktrees:[null]},{worktrees:[{path:''}]},{worktrees:[{path:'a',head:'bad'}]},{worktrees:[{path:'a',primary:'yes'}]},{worktrees:[{path:'a'},{path:'a'}]}])assert.throws(()=>parseGitWorktrees(value),/Git 工作树/);});
test('accepts detached, locked and prunable entries',()=>{assert.equal(parseGitWorktrees({worktrees:[{path:'/repo',head,detached:true,locked:true,prunable:'gone'}]})[0].locked,true);});

test('rejects relative paths, control characters and boolean branch names',()=>{
 for(const entry of [{path:'relative'}, {path:'D:relative'}, {path:'D:/bad\n'}, {path:'D:/repo',branch:true}, {path:'D:/repo',branch:false}, {path:'D:/repo',branch:' '}]) assert.throws(()=>parseGitWorktrees({worktrees:[entry]}),/数据无效/);
 for(const path of ['D:/repo','D:\\repo','/tmp/repo','\\\\server\\share\\repo']) assert.equal(parseGitWorktrees({worktrees:[{path,branch:'main'}]})[0].path,path);
});

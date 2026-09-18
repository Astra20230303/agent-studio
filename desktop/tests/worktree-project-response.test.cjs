const {test}=require('node:test');const assert=require('node:assert/strict');const {parseWorktreeProject}=require('../src/worktreeProjectResponse.ts');
const project={id:'D:/worktree',path:'D:/worktree',name:'Worktree',environment:'worktree',git:{isRepository:true,branch:'codex/task'}};
test('validates and clones worktree project payload',()=>{const value=parseWorktreeProject(project);value.git.branch='changed';assert.equal(project.git.branch,'codex/task');});
test('rejects invalid project identity, path and git metadata',()=>{for(const value of [null,{}, {...project,id:''},{...project,path:'relative'},{...project,environment:'unknown'},{...project,git:null},{...project,git:{isRepository:false}},{...project,git:{isRepository:true,branch:3}}])assert.throws(()=>parseWorktreeProject(value),/工作树项目数据/);});

test('primary workspaces retain local environment',()=>{assert.equal(parseWorktreeProject({...project,environment:'local'}).environment,'local');});

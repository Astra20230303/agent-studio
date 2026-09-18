const {test}=require('node:test');const assert=require('node:assert/strict');
const {createProjectRepository}=require('../src/projectRepository.ts');
const project={id:'a',name:'Project',path:'D:/workspace',git:{isRepository:true,branch:'main',dirty:false},environment:'local'};
test('project picker preserves cancellation and returns independent validated snapshots',async()=>{
 let value=null;const repo=createProjectRepository(()=>({pickProject:async()=>value}));assert.equal(await repo.pick(),null);
 value=project;const picked=await repo.pick();picked.git.branch='changed';assert.equal(project.git.branch,'main');
 for(const bad of [undefined,{}, {...project,path:'relative'}, {...project,git:{isRepository:'yes'}}, {...project,environment:'unknown'}]){
  value=bad;await assert.rejects(repo.pick(),/项目数据无效/);
 }
 value=project;assert.equal((await repo.pick()).id,'a');
});
test('default root validates platform paths and propagates service failure',async()=>{
 for(const root of ['D:/workspace','C:\\work','/home/work','\\\\server\\share'])assert.equal(await createProjectRepository(()=>({getProjectRoot:async()=>root})).defaultRoot(),root);
 for(const root of ['',{},'C:relative','relative','D:/bad\0path'])await assert.rejects(createProjectRepository(()=>({getProjectRoot:async()=>root})).defaultRoot(),/工作目录无效/);
 assert.equal(await createProjectRepository(()=>undefined).defaultRoot(),undefined);
 await assert.rejects(createProjectRepository(()=>undefined).pick(),/桌面应用/);
 await assert.rejects(createProjectRepository(()=>({pickProject:async()=>{throw Error('denied');}})).pick(),/denied/);
});

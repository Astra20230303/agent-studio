const {test}=require('node:test');const assert=require('node:assert/strict');
const {removeRecentProject}=require('../src/recentProjects.ts');
test('forgetting a project retains explicit and inherited conversation workspaces',()=>{
 const state={activeProjectId:'p',projects:[{id:'p',path:'D:/project'},{id:'q',path:'D:/other'}],threads:[{id:'a',projectId:'p'},{id:'b'},{id:'c',projectId:'p',cwd:'D:/custom'},{id:'d',remoteId:'remote'},{id:'e',projectId:'q'}]};
 assert.equal(removeRecentProject(state,'p'),true);
 assert.deepEqual(state.threads,[{id:'a',cwd:'D:/project'},{id:'b',cwd:'D:/project'},{id:'c',cwd:'D:/custom'},{id:'d',remoteId:'remote'},{id:'e',projectId:'q'}]);
 assert.equal(state.activeProjectId,undefined);assert.deepEqual(state.projects,[{id:'q',path:'D:/other'}]);
 assert.equal(removeRecentProject(state,'p'),false);
});

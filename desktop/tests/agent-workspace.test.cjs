const {test}=require('node:test');const assert=require('node:assert/strict');
const {agentWorkspace,readAgentSnapshot,commandAgent}=require('../src/agentWorkspace.ts');
const message=(id,status='running',text='')=>({tool:{collaboration:{receiverThreadIds:[id],agentsStates:{[id]:{status,message:text}}}}});
test('collect known descendants once, preserve latest result and break cycles',()=>{
 const root={remoteId:'root',messages:[message('child'),message('child','failed','Failure details')]};
 const child={remoteId:'child',title:'Child task',messages:[message('root'),message('grandchild','completed','Done')]};
 const nodes=agentWorkspace([root,child],root);assert.equal(nodes.length,2);
 assert.deepEqual(nodes[0],{id:'child',parentId:'root',title:'Child task',status:'failed',message:'Failure details',depth:1});
 assert.equal(nodes[1].depth,2);assert.equal(nodes[1].parentId,'child');assert.equal(nodes[1].message,'Done');
 assert.deepEqual(agentWorkspace([root],{messages:[]}),[]);
});
test('refresh validates identity and sends to running turn or starts idle continuation',async()=>{
 let active=true;const calls=[];
 const request=async(method,params)=>{calls.push({method,params});if(method==='thread/read')return{thread:{id:'child',status:{type:active?'active':'idle'}}};if(method==='thread/resume')return{thread:{id:'child'}};if(method==='thread/turns/list')return{data:[{id:'turn',status:active?'inProgress':'completed',items:[{type:'agentMessage',text:'Result'}]}]};if(method==='turn/steer')return{turnId:'turn'};if(method==='turn/start')return{turn:{id:'next'}};return{};};
 assert.equal((await readAgentSnapshot(request,'child')).message,'Result');
 await commandAgent(request,'child','send','Continue');assert.deepEqual(calls.find(c=>c.method==='turn/steer').params,{threadId:'child',expectedTurnId:'turn',input:[{type:'text',text:'Continue'}]});
 await commandAgent(request,'child','stop');assert.equal(calls.find(c=>c.method==='turn/interrupt').params.turnId,'turn');
 active=false;await commandAgent(request,'child','send','Next');assert.equal(calls.find(c=>c.method==='turn/start').params.threadId,'child');
 await assert.rejects(readAgentSnapshot(async()=>({thread:{id:'other',status:{type:'idle'}}}),'child'),/无效/);
});

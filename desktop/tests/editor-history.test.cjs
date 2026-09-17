const test=require('node:test');const assert=require('node:assert/strict');
const {newEditorHistory,editHistory,stepHistory}=require('../src/editorHistory.ts');
test('history restores edits, branches after undo, resets and bounds retained text',()=>{
 let h=newEditorHistory('original');h=editHistory(h,'replacement');h=editHistory(h,'indented');
 h=stepHistory(h);assert.equal(h.text,'replacement');h=stepHistory(h,true);assert.equal(h.text,'indented');
 h=stepHistory(h);h=editHistory(h,'new branch');assert.equal(h.future.length,0);
 assert.equal(stepHistory(h,true).text,'new branch');
 for(let i=0;i<150;i++)h=editHistory(h,String(i));assert.equal(h.past.length,100);
 for(let i=0;i<30;i++)h=editHistory(h,'x'.repeat(256*1024)+i);
 assert.ok(h.past.reduce((sum,text)=>sum+text.length,0)<=4*1024*1024);
 assert.deepEqual(newEditorHistory('disk'),{text:'disk',past:[],future:[]});
});

const test=require('node:test');const assert=require('node:assert/strict');const {tableCells,isTableDivider}=require('../src/markdownTable.ts');
test('table columns preserve escaped pipes and optional borders',()=>{
 assert.deepEqual(tableCells(String.raw`| a\|b | c |`),['a|b','c']);
 assert.deepEqual(tableCells(String.raw`a | b\|`),['a','b|']);
 assert.deepEqual(tableCells(String.raw`a\\|b`),[String.raw`a\\`,'b']);
 assert.deepEqual(tableCells('| one |'),['one']);
 assert.equal(isTableDivider('| :--- | ---: |'),true);assert.equal(isTableDivider('a | b'),false);
});

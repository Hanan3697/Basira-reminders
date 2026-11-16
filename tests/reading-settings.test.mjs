import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('reminder settings save independently without overwriting reading progress',()=>{
 const nodes=new Map(),node=()=>({style:{},dataset:{},children:[],append(...n){this.children.push(...n)},replaceChildren(){this.children=[]},insertAdjacentHTML(){}});
 const saved={pos:87,date:'2026-11-16',font:35,wardEnd:100,times:['05:45'],custom:'preserve'};let value=JSON.stringify(saved),events=0;
 const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node,querySelectorAll:()=>[{value:'13:00'},{value:'09:00'}]};
 vm.runInNewContext(readFileSync('public/reading-settings.js','utf8'),{document,localStorage:{getItem:()=>value,setItem:(k,v)=>{value=v}},Intl,Date,Event:class{},window:{dispatchEvent:()=>events++}});
 document.getElementById('saveTimes').onclick();const result=JSON.parse(value);
 assert.deepEqual(result,{...saved,times:['09:00','13:00'],sessions:2});assert.equal(events,1);
 assert.ok(!readFileSync('public/reader.html','utf8').includes('id="reminderSettings"'));
 assert.ok(readFileSync('public/index.html','utf8').includes('href="/reading-settings.html"'));
 const sw=readFileSync('public/ward-notifications-sw.js','utf8');assert.ok(sw.includes('/reading-settings.html'));assert.ok(sw.includes('/reading-settings.js'));
});

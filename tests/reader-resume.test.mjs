import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync('public/app.js','utf8').split("fetch('./quran.json')")[0];
function reader(storage){
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{scrollIntoView(){},dataset:{}});return nodes.get(id)};
 const context={Intl,Date,Number,JSON,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{getElementById:node},window:{addEventListener(){}},requestAnimationFrame:fn=>fn(),cancelAnimationFrame(){},confirm:()=>true};
 runInNewContext(source+'\nrender=()=>{};',context);
 return code=>runInNewContext(code,context);
}
test('page navigation restores after closing and reopening without changing completed ayahs',()=>{
 const storage=new Map([['ward-v1',JSON.stringify({pos:67})]]);const first=reader(storage);
 first('jumpToPage(12)');const reopened=reader(storage);reopened('restorePage()');
 assert.equal(reopened('reviewPage'),12);assert.equal(reopened('state.pos'),67);
});
test('confirmed stop replaces stale page, and a new reading clears remembered location',()=>{
 const storage=new Map([['ward-v1',JSON.stringify({pos:0})]]);const first=reader(storage);
 first('jumpToPage(2);saveStop(68)');const reopened=reader(storage);reopened('restorePage()');
 assert.equal(reopened('state.pos'),68);assert.equal(reopened('reviewPage'),null);
 reopened('jumpToPage(12);$("newDay").onclick()');assert.equal(storage.has('ward-reader-location'),false);
});
test('next day does not erase a completed reading without explicit restart',()=>{
 const storage=new Map([['ward-v1',JSON.stringify({pos:286,date:'2000-01-01'})]]);const r=reader(storage);r('rollover()');assert.equal(r('state.pos'),286);
});
test('existing ayah 68 selection migrates to its actual page instead of stale page 2',()=>{
 const storage=new Map([['ward-v1',JSON.stringify({pos:0,wardEnd:68})],['ward-reader-location',JSON.stringify({pos:0,page:2})]]);
 const r=reader(storage);r('verses='+JSON.stringify(JSON.parse(readFileSync('public/quran.json','utf8')).data.ayahs)+';restorePage()');
 assert.equal(r('reviewPage'),10);assert.equal(r('resumeAyah'),68);assert.equal(r('state.pos'),0);
 const reopened=reader(storage);reopened('restorePage()');assert.equal(reopened('reviewPage'),10);
});

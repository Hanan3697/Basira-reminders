import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const tafsir=JSON.parse(read('public/data/muyassar.json')),refs=JSON.parse(read('public/data/message-refs.json'));
test('every Baqarah ayah and daily message has its own source tafsir',()=>{
 assert.equal(tafsir.source.key,'arabic_moyassar');assert.equal(tafsir.source.version,'1.0.0');
 for(let i=1;i<=286;i++)assert.ok(tafsir.ayahs['2:'+i]?.text);
 assert.equal(refs.length,122);for(const key of refs)assert.ok(tafsir.ayahs[key]?.text,key);
 assert.equal(Object.keys(tafsir.ayahs).length,399);
});
test('tafsir assets, source page and message references are available in the offline bundle',()=>{
 const sw=read('public/ward-notifications-sw.js');
 for(const path of ['/data/muyassar.json','/data/message-refs.json','/tafsir-data.js','/verse-study.js','/verse-study.css','/sources.html'])assert.ok(sw.includes('"'+path+'"'),path);
 const html=read('public/message.html');assert.ok(html.includes('/tafsir-data.js" defer'));assert.ok(html.includes('/message.js?v=3" defer'));
 const code=read('public/message.js');assert.ok(code.includes('currentDraw!==drawId'));assert.ok(code.includes("querySelector('.verse-panel').after(panel)"));
});

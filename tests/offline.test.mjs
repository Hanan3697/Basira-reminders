import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const origin='https://basira.example';
function harness(fail=false){
 const handlers={},stores=new Map();let skip=false;
 class LocalRequest extends Request {constructor(url,init){super(new URL(url,origin),init)}}
 const caches={async open(key){if(!stores.has(key))stores.set(key,new Map());const data=stores.get(key);return {async addAll(files){if(fail)throw Error('interrupted');for(const req of files){const path=new URL(req.url).pathname;data.set(path,new Response(readFileSync('public'+path))) }},async match(path){return data.get(path)?.clone()},async put(path,r){data.set(path,r)},async keys(){return [...data.keys()].map(p=>new LocalRequest(p))}}},async keys(){return [...stores.keys()]},async delete(k){return stores.delete(k)}};
 runInNewContext(readFileSync('public/ward-notifications-sw.js','utf8'),{URL,Request:LocalRequest,Response,Set,caches,fetch:async()=>{throw Error('offline')},self:{location:{origin},addEventListener:(n,fn)=>handlers[n]=fn,skipWaiting:async()=>{skip=true},clients:{claim:async()=>{}}}});
 return {handlers,stores,get skipped(){return skip},async install(){let promise;handlers.install({waitUntil:p=>promise=p});await promise},fetch(path,method='GET'){let result;handlers.fetch({request:new LocalRequest(path,{method}),respondWith:r=>result=r});return result}};
}
test('complete offline bundle opens all sections and exact Quran text including installed launch URL',async()=>{
 const h=harness();await h.install();assert.equal(h.skipped,true);
 for(const path of ['/?installed=1','/reader.html','/message.html','/duas.html','/laws.html','/laws/attachment.html','/ward.css?v=analytics36','/AmiriQuran.ttf'])assert.equal((await h.fetch(path)).status,200);
 assert.equal(await (await h.fetch('/quran.json')).text(),readFileSync('public/quran.json','utf8'));
});
test('private routes, external links, unknown routes and POST requests bypass offline cache',async()=>{
 const h=harness();await h.install();for(const path of ['/statistics','/api/analytics/stats','/api/analytics/collect','/dashboard.js','https://quran.com/2/1','/unknown'])assert.equal(h.fetch(path),undefined);
 assert.equal(h.fetch('/index.html','POST'),undefined);
});
test('interrupted install never activates incomplete offline content',async()=>{const h=harness(true);await assert.rejects(h.install());assert.equal(h.skipped,false)});

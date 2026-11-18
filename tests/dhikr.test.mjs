import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {dhikrTimes} from '../worker/dhikr.mjs';
import {encryptPush,decode} from '../worker/web-push.mjs';
import {ReadingPush} from '../worker/push.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const b64=x=>Buffer.from(x).toString('base64url');
test('automatic schedules stay in daytime, distinct and match each selected count',()=>{
 for(const [level,count] of Object.entries({few:3,medium:6,many:10})){const times=dhikrTimes(level);assert.equal(times.length,count);assert.equal(new Set(times).size,count);for(const t of times)assert.ok(t>='08:00'&&t<'21:00')}
 assert.deepEqual(dhikrTimes('off'),[]);
});
test('encryption matches the independent RFC 8291 known-answer example',async()=>{
 const sender='BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
 const raw=decode(sender),pub={kty:'EC',crv:'P-256',x:b64(raw.slice(1,33)),y:b64(raw.slice(33))};
 const pair={publicKey:await crypto.subtle.importKey('jwk',pub,{name:'ECDH',namedCurve:'P-256'},true,[]),privateKey:await crypto.subtle.importKey('jwk',{...pub,d:'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw'},{name:'ECDH',namedCurve:'P-256'},false,['deriveBits'])};
 const payload=await encryptPush({p256dh:'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',auth:'BTBZMqHH6r4Tts7J_aSIgg'},'When I grow up, I want to be a watermelon',{pair,salt:decode('DGv6ra1nlYgDCS1FRnbzlw')});
 assert.equal(b64(payload),'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN');
});
function device(sub){const map=new Map(sub?[['subscription',sub]]:[]);let alarm;const storage={get:async k=>map.get(k),put:async(k,v)=>map.set(k,v),delete:async k=>map.delete(k),setAlarm:async v=>alarm=v,deleteAlarm:async()=>alarm=undefined};const obj=new ReadingPush({storage,blockConcurrencyWhile:f=>f()},{});obj.keys=async()=>({});return {obj,map,get alarm(){return alarm}}}
const endpoint='https://web.push.apple.com/test';
const request=(route,data)=>new Request('https://basira.test/api/push/'+route,{method:'POST',body:JSON.stringify(data)});
const sample={endpoint,times:['05:45','09:00'],dhikr:'medium',keys:{p256dh:'existing',auth:'existing'},due:0};
test('stopping one category preserves the other; stopping both removes server schedule',async()=>{
 const d=device({...sample});
 assert.equal((await d.obj.handle(request('settings',{endpoint,category:'reading',enabled:false}))).status,200);
 assert.deepEqual(d.map.get('subscription').times,[]);assert.equal(d.map.get('subscription').dhikr,'medium');assert.ok(d.alarm>Date.now());
 await d.obj.handle(request('settings',{endpoint,category:'dhikr',level:'off'}));assert.equal(d.map.has('subscription'),false);assert.equal(d.alarm,undefined);
});
test('legacy time updates preserve opted-in dhikr and keys; invalid frequency rejected',async()=>{
 const d=device({...sample});await d.obj.handle(request('update',{endpoint,times:['13:00']}));assert.equal(d.map.get('subscription').dhikr,'medium');assert.equal(d.map.get('subscription').keys.auth,'existing');
 assert.equal((await d.obj.handle(request('settings',{endpoint,category:'dhikr',level:'invalid'}))).status,400);
});
test('legacy reading subscriptions continue scheduling; dhikr retries then expires without a burst',async()=>{
 const d=device({endpoint,times:['09:00'],due:Date.now()-1000,attempts:0});let sent=0;d.obj.send=async()=>{sent++;return 201};await d.obj.alarm();assert.equal(sent,1);assert.equal(d.map.get('subscription').kind,'reading');
 const e=device({...sample,kind:'dhikr',due:Date.now()-1000,attempts:0});e.obj.send=async(_endpoint,message)=>{assert.equal(message.kind,'dhikr');return 503};await e.obj.alarm();assert.equal(e.map.get('subscription').attempts,1);assert.ok(e.alarm>Date.now());
 e.map.get('subscription').due=Date.now()-700000;await e.obj.alarm();assert.equal(e.map.get('subscription').attempts,0);assert.ok(e.alarm>Date.now());
});
test('service worker displays dhikr text and opens home, while legacy empty pushes open reader',async()=>{
 const handlers={},shown=[],opened=[];
 const code=readFileSync('scripts/offline-worker.template.js','utf8').replace('__VERSION__','test').replace('__FILES__','[]');
 runInNewContext(code,{URL,Set,Request,self:{location:{origin:'https://basira.test'},addEventListener:(n,f)=>handlers[n]=f,registration:{showNotification:async(title,opts)=>shown.push({title,...opts})},clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}}});
 let pending;handlers.push({data:{json:()=>({kind:'dhikr',body:'الحمد لله'})},waitUntil:p=>pending=p});await pending;assert.equal(shown[0].body,'الحمد لله');assert.equal(shown[0].data.url,'/');
 handlers.notificationclick({notification:{...shown[0],close(){}},waitUntil:p=>pending=p});await pending;assert.equal(opened[0],'https://basira.test/');
 handlers.push({waitUntil:p=>pending=p});await pending;assert.equal(shown[1].tag,'ward-reading');
});

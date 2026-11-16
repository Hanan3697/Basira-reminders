import test from 'node:test';
import assert from 'node:assert/strict';
import {ReadingPush,nextReading,validEndpoint,validTimes,pushAuthorization,pushRoute} from '../worker/push.mjs';
function fixture(){const entries=new Map();let alarm=null;const storage={get:async k=>entries.get(k),put:async(k,v)=>entries.set(k,structuredClone(v)),delete:async k=>entries.delete(k),setAlarm:async n=>alarm=n,deleteAlarm:async()=>{alarm=null}};return {object:new ReadingPush({storage,blockConcurrencyWhile:fn=>fn()},{}),entries,get alarm(){return alarm}}}
const req=(route,data={})=>new Request('https://basira.example/api/push/'+route,{method:'POST',body:JSON.stringify(data)});
test('Muscat reminders advance across midnight and reject unsafe subscriptions',()=>{
 assert.equal(nextReading(['05:45','09:00'],Date.parse('2026-11-16T01:44:00Z')),Date.parse('2026-11-16T01:45:00Z'));
 assert.equal(nextReading(['05:45'],Date.parse('2026-11-16T01:45:00Z')),Date.parse('2026-11-17T01:45:00Z'));
 assert.equal(validTimes(['24:00']),false);assert.equal(validTimes([]),false);assert.equal(validTimes(['05:45']),true);
 for(const endpoint of ['https://localhost/a','http://web.push.apple.com/a','https://web.push.apple.com.evil.example/a','https://user@web.push.apple.com/a'])assert.equal(validEndpoint(endpoint),false);
 assert.equal(validEndpoint('https://web.push.apple.com/device/test'),true);
});
test('VAPID public key is stable and authentication is a verifiable ES256 token',async()=>{
 const f=fixture(),first=await(await f.object.fetch(req('key'))).json(),second=await(await f.object.fetch(req('key'))).json();assert.equal(first.key,second.key);assert.equal(first.privateKey,undefined);
 const auth=await pushAuthorization('https://web.push.apple.com/device/test',f.entries.get('keys'));
 const jwt=auth.match(/t=([^,]+)/)[1],parts=jwt.split('.'),claims=JSON.parse(Buffer.from(parts[1],'base64url'));
 assert.equal(claims.aud,'https://web.push.apple.com');assert.ok(claims.exp>Date.now()/1000);
 const publicKey=await crypto.subtle.importKey('raw',Buffer.from(first.key,'base64url'),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},publicKey,Buffer.from(parts[2],'base64url'),new TextEncoder().encode(parts.slice(0,2).join('.'))),true);
});
test('device schedules update and disable; expired subscriptions stop alarms',async()=>{
 const f=fixture(),endpoint='https://web.push.apple.com/device/test';
 assert.equal((await f.object.fetch(req('enable',{endpoint,times:['05:45','09:00']}))).status,200);assert.ok(f.alarm>Date.now());
 assert.equal((await f.object.fetch(req('update',{endpoint:endpoint+'other',times:['10:00']}))).status,409);
 await f.object.fetch(req('update',{endpoint,times:['13:00']}));assert.deepEqual(f.entries.get('subscription').times,['13:00']);
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response(null,{status:410});
 try{const sub=f.entries.get('subscription');sub.due=Date.now()-1000;f.entries.set('subscription',sub);await f.object.alarm();assert.equal(f.entries.has('subscription'),false);assert.equal(f.alarm,null)}finally{globalThis.fetch=original}
 await f.object.fetch(req('enable',{endpoint,times:['09:00']}));await f.object.fetch(req('disable'));assert.equal(f.alarm,null);
});
test('alarm sends only when due, advances to next day and does not repeat successful delivery',async()=>{
 const f=fixture(),endpoint='https://fcm.googleapis.com/fcm/send/test';await f.object.fetch(req('enable',{endpoint,times:['05:45']}));
 const sub=f.entries.get('subscription');sub.due=Date.now()-1000;f.entries.set('subscription',sub);
 let sends=0;const original=globalThis.fetch;globalThis.fetch=async(url,options)=>{assert.equal(url,endpoint);assert.equal(options.redirect,'error');assert.equal(options.body.byteLength,0);assert.equal(options.headers.Urgency,'high');assert.match(options.headers.Authorization,/^vapid /);sends++;return new Response(null,{status:201})};
 try{await f.object.alarm();assert.equal(sends,1);assert.ok(f.alarm>Date.now());await f.object.alarm();assert.equal(sends,1)}finally{globalThis.fetch=original}
});
test('public push routes require matching origin, device capability and bounded JSON',async()=>{
 const request=(origin,token,body='{}')=>new Request('https://basira.example/api/push/enable',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'Content-Type':'application/json'},body});
 assert.equal((await pushRoute(request('https://evil.example','a'.repeat(64)),{})).status,403);
 assert.equal((await pushRoute(request('https://basira.example','short'),{})).status,401);
 assert.equal((await pushRoute(request('https://basira.example','a'.repeat(64),'x'.repeat(4100)),{})).status,413);
 assert.equal((await pushRoute(request('https://basira.example','a'.repeat(64)),{})).status,503);
});

test('failed tests retain APNs reason without imposing the success cooldown',async()=>{
 const f=fixture(),endpoint='https://web.push.apple.com/device/test';await f.object.fetch(req('enable',{endpoint,times:['09:00']}));
 const original=globalThis.fetch;let sends=0;globalThis.fetch=async()=>{sends++;return Response.json({reason:'BadWebPushRequest'},{status:400})};
 try{let result=await f.object.fetch(req('test'));assert.equal(result.status,502);assert.equal((await result.json()).delivery.reason,'BadWebPushRequest');assert.equal(f.entries.has('lastTest'),false);f.entries.set('lastAttempt',Date.now()-6000);result=await f.object.fetch(req('test'));assert.equal(result.status,502);assert.equal(sends,2);assert.equal((await(await f.object.fetch(req('status'))).json()).active,true)}finally{globalThis.fetch=original}
});

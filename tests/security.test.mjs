import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authorize} from '../worker/auth.mjs';
import worker from '../worker/index.mjs';
const now=Date.now();
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='test-key';
const env={ACCESS_TEAM_DOMAIN:'basira-test.cloudflareaccess.com',ACCESS_AUD:'test-aud',ADMIN_EMAIL:'owner@example.test',DB:{}};
const fetchKeys=async()=>Response.json({keys:[jwk]});
const base={iss:'https://'+env.ACCESS_TEAM_DOMAIN,aud:[env.ACCESS_AUD],exp:now/1000+300,email:env.ADMIN_EMAIL};
async function req(claims=base){const body=[Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url'),Buffer.from(JSON.stringify(claims)).toString('base64url')].join('.');const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(body));return new Request('https://example.test/statistics',{headers:{'Cf-Access-Jwt-Assertion':body+'.'+Buffer.from(sig).toString('base64url')}});}
test('only valid signed owner tokens pass',async()=>{
 assert.equal(await authorize(await req(),env,fetchKeys,now),200);
 for(const change of [{email:'other@example.test'},{aud:['other']},{iss:'https://attacker.test'},{exp:now/1000-1},{nbf:now/1000+600}])assert.equal(await authorize(await req({...base,...change}),env,fetchKeys,now),403);
 const r=await req();r.headers.set('Cf-Access-Jwt-Assertion',r.headers.get('Cf-Access-Jwt-Assertion').slice(0,-5)+'abcde');assert.equal(await authorize(r,env,fetchKeys,now),403);
});
test('missing setup and forged Sites headers cannot expose statistics',async()=>{
 const r=new Request('https://example.test/statistics',{headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.test'}});
 assert.equal(await authorize(r,{},fetchKeys,now),503);
 assert.equal(await authorize(r,env,fetchKeys,now),401);
 assert.equal((await worker.fetch(r,{})).status,503);
 assert.equal((await worker.fetch(new Request('https://example.test/api/analytics/stats'),env)).status,401);
});
test('collector rejects cross-origin and unexpected payloads',async()=>{
 const request=(origin,data)=>new Request('https://example.test/api/analytics/collect',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(data)});
 assert.equal((await worker.fetch(request('https://attacker.test',{kind:'view',section:'home'}),env)).status,403);
 assert.equal((await worker.fetch(request('https://example.test',{kind:'view',section:'private'}),env)).status,400);
 assert.equal((await worker.fetch(request('https://example.test',{kind:'view',section:'home'}),{})).status,503);
});

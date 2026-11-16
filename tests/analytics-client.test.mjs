import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
const source=readFileSync(new URL('../public/analytics.js',import.meta.url),'utf8');
function browser(choice='yes'){
 let now=Date.parse('2026-11-16T19:59:00Z');
 const values=new Map([['basira-analytics-choice',choice]]),requests=[],listeners=[];
 const document={hidden:true,addEventListener:(event,fn)=>listeners.push(fn)};
 class Clock extends Date {static now(){return now}}
 const context={location:{pathname:'/'},navigator:{},document,Date:Clock,crypto:{randomUUID},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},fetch:async(url,init)=>{requests.push(JSON.parse(init.body));return {ok:true}}};
 runInNewContext(source,context);
 return {requests,values,show:()=>{document.hidden=false;listeners.forEach(fn=>fn())},advance:ms=>now+=ms};
}
test('hidden page is not viewed, visibility does not multiply page views, midnight starts a new session but same visitor',()=>{
 const b=browser();assert.equal(b.requests.length,0);b.show();const first=b.requests.at(-1);b.show();assert.equal(b.requests.filter(r=>r.kind==='view').length,1);assert.equal(b.requests.at(-1).session,first.session);
 b.advance(120000);b.show();assert.notEqual(b.requests.at(-1).session,first.session);assert.equal(b.requests.at(-1).visitor,first.visitor);
 const session=b.requests.at(-1).session;b.advance(1800001);b.show();assert.notEqual(b.requests.at(-1).session,session);
});
test('declining visitor counting sends only aggregate page views',()=>{const b=browser('no');b.show();assert.equal(b.requests.length,1);assert.equal(b.requests[0].kind,'view');assert.equal(b.values.has('basira-visitor'),false)});

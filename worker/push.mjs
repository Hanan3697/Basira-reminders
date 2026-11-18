import {dhikrTimes,dhikrMessage,DHIKR_COUNTS} from './dhikr.mjs';
import {encryptPush,validPushKeys} from './web-push.mjs';
// One private Durable Object per device: its key, subscription and next alarm.
const encoder=new TextEncoder();
export const base64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
export function validEndpoint(value){
 try{const u=new URL(value);return value.length<2048&&u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.port&&(
  u.hostname==='web.push.apple.com'||u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname.endsWith('.push.services.mozilla.com'))}catch{return false}
}
export function validTimes(times){return Array.isArray(times)&&times.length>0&&times.length<=12&&times.every(t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t))}
export function nextReading(times,now=Date.now()){
 const local=new Date(now+4*3600000),date=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate());
 return Math.min(...times.map(t=>{const [h,m]=t.split(':').map(Number);let due=date+h*3600000+m*60000-4*3600000;if(due<=now)due+=86400000;return due}));
}
export async function pushAuthorization(endpoint,keys,now=Date.now()){
 const enc=value=>base64url(encoder.encode(JSON.stringify(value)));
 const data=enc({typ:'JWT',alg:'ES256'})+'.'+enc({aud:new URL(endpoint).origin,exp:Math.floor(now/1000)+3600,sub:'https://basira.dzgvycfv54.workers.dev/'});
 const key=await crypto.subtle.importKey('jwk',keys.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,encoder.encode(data));
 return 'vapid t='+data+'.'+base64url(signature)+', k='+keys.publicKey;
}
export class ReadingPush {
 constructor(ctx,env){this.ctx=ctx;this.storage=ctx.storage;this.env=env}
 async keys(){
  let keys=await this.storage.get('keys');if(keys)return keys;
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  keys={publicKey:base64url(await crypto.subtle.exportKey('raw',pair.publicKey)),privateKey:await crypto.subtle.exportKey('jwk',pair.privateKey)};
  await this.storage.put('keys',keys);return keys;
 }
 fetch(request){return this.ctx.blockConcurrencyWhile(()=>this.handle(request))}
 async handle(request){
  const route=new URL(request.url).pathname.split('/').pop();
  const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
  if(route==='key')return json({key:(await this.keys()).publicKey});
  if(route==='status'){const sub=await this.storage.get('subscription');return json({transportVersion:3,active:!!sub,next:sub?.due,lastDelivery:await this.storage.get('lastDelivery')})}
  if(route==='disable'){await this.storage.delete('subscription');await this.storage.deleteAlarm();return json({ok:true})}
  const data=await request.json().catch(()=>null);
  if(route==='test'){
   const sub=await this.storage.get('subscription');if(!sub)return json({error:'not_subscribed'},409);
   const last=await this.storage.get('lastTest')||0;if(Date.now()-last<60000)return json({error:'wait_one_minute'},429);
   const attempt=await this.storage.get('lastAttempt')||0;if(Date.now()-attempt<5000)return json({error:'wait_five_seconds'},429);
   await this.storage.put('lastAttempt',Date.now());
   const status=await this.send(sub.endpoint,data?.kind==='dhikr'?dhikrMessage(Date.now()):null,sub.keys);
   if(status===404||status===410){await this.storage.delete('subscription');await this.storage.deleteAlarm()}
   const ok=status>=200&&status<300;if(ok)await this.storage.put('lastTest',Date.now());
   const delivery=await this.storage.get('lastDelivery');
   return json({ok,error:ok?undefined:'push_rejected',delivery},ok?200:502);
  }
  const existing=await this.storage.get('subscription');
  // Legacy clients still update reading times; a scoped update preserves the other category.
  if(route==='settings'){
   if(!data||!['reading','dhikr'].includes(data.category))return json({error:'invalid_settings'},400);
   if(data.category==='dhikr'&&!['off',...Object.keys(DHIKR_COUNTS)].includes(data.level))return json({error:'invalid_frequency'},400);
   if(data.category==='reading'&&typeof data.enabled!=='boolean')return json({error:'invalid_settings'},400);
  }
  const stopping=route==='settings'&&(data.category==='reading'?!data.enabled:data.level==='off');
  if(!existing&&stopping)return json({ok:true,active:false});
  if(!data||!validEndpoint(data.endpoint)||(!stopping&&route!=='settings'&&!validTimes(data.times)))return json({error:'invalid_subscription'},400);
  if(route==='update'&&(!existing||existing.endpoint!==data.endpoint))return json({error:'not_subscribed'},409);
  if(data.keys&&!await validPushKeys(data.keys))return json({error:'invalid_keys'},400);
  const sub={...existing,endpoint:data.endpoint,keys:data.keys||existing?.keys,attempts:0};
  sub.times=sub.times||[];sub.dhikr=sub.dhikr||'off';
  if(route==='settings'&&data.category==='dhikr'){
   if(!stopping&&!sub.keys)return json({error:'keys_required'},400);
   sub.dhikr=data.level;
  }else if(route==='settings'&&stopping)sub.times=[];
  else {if(!validTimes(data.times))return json({error:'invalid_times'},400);sub.times=[...new Set(data.times)].sort()}
  await this.keys();
  if(!sub.times.length&&sub.dhikr==='off'){await this.storage.delete('subscription');await this.storage.deleteAlarm();return json({ok:true,active:false})}
  const next=this.next(sub);sub.due=next.due;sub.kind=next.kind;
  await this.storage.put('subscription',sub);
  await this.storage.setAlarm(sub.due);return json({ok:true,active:true,next:sub.due,timeZone:'Asia/Muscat'});
 }
 next(sub,now=Date.now()){
  const reading=sub.times?.length?nextReading(sub.times,now):Infinity;
  const times=dhikrTimes(sub.dhikr),dhikr=times.length?nextReading(times,now):Infinity;
  return reading===dhikr?{due:reading,kind:'both'}:reading<dhikr?{due:reading,kind:'reading'}:{due:dhikr,kind:'dhikr'};
 }

 async send(endpoint,message=null,keys){
  let stage='signing';
  try{
   const origin=new URL(endpoint).origin,now=Date.now();
   let cached=await this.storage.get('authorization');
   if(!cached||cached.origin!==origin||cached.until<now){cached={origin,until:now+3500000,value:await pushAuthorization(endpoint,await this.keys())};await this.storage.put('authorization',cached)}
   const body=message?await encryptPush(keys,JSON.stringify(message)):new Uint8Array(0);
   stage='network';
   const result=await fetch(endpoint,{method:'POST',redirect:'manual',headers:{Authorization:cached.value,TTL:'600',Urgency:'high','Content-Type':'application/octet-stream',...(message?{'Content-Encoding':'aes128gcm'}:{})},body,signal:AbortSignal.timeout(15000)});
   let reason='';if(!result.ok){const data=await result.json().catch(()=>null);if(typeof data?.reason==='string'&&/^[A-Za-z0-9_]{1,64}$/.test(data.reason))reason=data.reason}else await result.body?.cancel();
   await this.storage.put('lastDelivery',{status:result.status,reason,time:Date.now()});return result.status;
  }catch(error){await this.storage.put('lastDelivery',{status:503,reason:stage==='signing'?'SigningFailed':error.name==='TimeoutError'?'SendTimeout':'NetworkFailure',detail:String(error.message||error.name).replace(/https?:\/\/[^\s]+/g,'[URL]').replace(/[A-Za-z0-9_-]{32,}/g,'[redacted]').slice(0,160),time:Date.now()});return 503}
 }

 alarm(){return this.ctx.blockConcurrencyWhile(async()=>{
  const sub=await this.storage.get('subscription');if(!sub)return;
  const now=Date.now();if(now<sub.due){await this.storage.setAlarm(sub.due);return}
  let status=0;
  if(now-sub.due<600000){
   status=await this.send(sub.endpoint,sub.kind==='dhikr'?dhikrMessage(sub.due,sub.dhikr):null,sub.keys);
   if(sub.kind==='both'&&status>=200&&status<300)status=await this.send(sub.endpoint,dhikrMessage(sub.due,sub.dhikr),sub.keys);
  }
  if(status===404||status===410){await this.storage.delete('subscription');await this.storage.deleteAlarm();return}
  if((status===429||status>=500)&&sub.attempts<2&&Date.now()-sub.due<480000){
   sub.attempts++;await this.storage.put('subscription',sub);await this.storage.setAlarm(Date.now()+60000);return;
  }
  const next=this.next(sub,Date.now());sub.due=next.due;sub.kind=next.kind;sub.attempts=0;
  await this.storage.put('subscription',sub);await this.storage.setAlarm(sub.due);
 })}
}
export async function pushRoute(request,env){
 const url=new URL(request.url),route=url.pathname.slice('/api/push/'.length);
 const response=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
 if(!['key','enable','update','disable','test','status','settings'].includes(route))return response('not_found',404);
 if(request.method!=='POST')return response('method_not_allowed',405);
 if(request.headers.get('origin')!==url.origin)return response('forbidden',403);
 const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 if(!token)return response('unauthorized',401);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return response('invalid_content_type',415);
 if(Number(request.headers.get('content-length'))>4096)return response('too_large',413);
 const body=await request.text();if(encoder.encode(body).length>4096)return response('too_large',413);
 if(!env.READING_PUSH)return response('push_not_configured',503);
 const hash=base64url(await crypto.subtle.digest('SHA-256',encoder.encode(token)));
 try{return await env.READING_PUSH.get(env.READING_PUSH.idFromName(hash)).fetch(new Request(url,{method:'POST',headers:{'Content-Type':'application/json'},body}))}
 catch{return response('push_unavailable',503)}
}

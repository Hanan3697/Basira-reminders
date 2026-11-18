const CACHE='basira-offline-__VERSION__';
const FILES=__FILES__;
const allowed=new Set(FILES);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(FILES.map(path=>new Request(path,{cache:'reload'})));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('basira-offline-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 const path=url.pathname==='/'?'/index.html':url.pathname;
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!allowed.has(path))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  // Refresh opened pages online; keep the installed bundle for offline fallback.
  if(event.request.mode==='navigate'){
   try { const response=await fetch(new Request(event.request,{cache:'no-store'})); if(response.ok){await cache.put(path,response.clone());return response;} } catch {}
  }
  const saved=await cache.match(path);
  if(saved)return saved;
  // Recover evicted assets when connected; never cache API or admin responses.
  const response=await fetch(event.request);
  if(response.ok)await cache.put(path,response.clone());
  return response;
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type!=='OFFLINE_STATUS'||!event.ports[0])return;
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const keys=new Set((await cache.keys()).map(request=>new URL(request.url).pathname));
  event.ports[0].postMessage({ready:FILES.every(path=>keys.has(path))});
 })());
});
const reader = new URL('/reader.html',self.location.origin).href;
function notify(event) {
  let message;try{message=event.data?.json()}catch{}
  if(message?.kind==='dhikr')return self.registration.showNotification('ذكر الله · بصيرة',{
    body:typeof message.body==='string'?message.body.slice(0,500):'سبحان الله وبحمده',
    icon:'/icon-192.png',tag:'basira-dhikr',data:{url:'/'}
  });
  return self.registration.showNotification('وقت قراءة سورة البقرة',{
    body:'حان وقت متابعة القراءة من موضعك المحفوظ.',
    icon:'/icon-192.png',tag:'ward-reading'
  });
}
self.addEventListener('push',event=>event.waitUntil(notify(event)));
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const path=event.notification.data?.url==='/'?'/':'/reader.html';
    const target=new URL(path,self.location.origin).href;
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=clients.find(client=>new URL(client.url).pathname===path);
    if(existing)return existing.focus();
    return self.clients.openWindow(target);
  })());
});

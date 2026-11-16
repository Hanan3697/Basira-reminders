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
function notify() {
  return self.registration.showNotification('وقت قراءة سورة البقرة',{
    body:'حان وقت متابعة القراءة من موضعك المحفوظ.',
    icon:'/icon-192.png',tag:'ward-reading'
  });
}
self.addEventListener('push',event=>event.waitUntil(notify()));
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=clients.find(client=>new URL(client.url).pathname==='/reader.html');
    if(existing)return existing.focus();
    return self.clients.openWindow(reader);
  })());
});

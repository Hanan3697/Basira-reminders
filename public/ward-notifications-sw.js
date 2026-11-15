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

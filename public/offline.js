(()=>{
 const home=location.pathname==='/'||location.pathname==='/index.html';
 const status=home?document.createElement('p'):null;
 if(status){status.setAttribute('role','status');status.style.cssText='text-align:center;color:white;font-size:14px;padding:12px;text-shadow:0 1px 4px #000';document.querySelector('main')?.append(status)}
 const say=text=>{if(status)status.textContent=text};
 if(!('serviceWorker' in navigator)){say('الحفظ بدون اتصال غير متاح في هذا المتصفح.');return}
 say('جارٍ تجهيز بصيرة للاستخدام بدون إنترنت…');
 async function check(){
  const worker=navigator.serviceWorker.controller;if(!worker)return;
  const channel=new MessageChannel();
  channel.port1.onmessage=event=>{say(event.data.ready?'بصيرة جاهز للاستخدام بدون إنترنت ✓':'افتح بصيرة بالإنترنت لإكمال حفظ المحتوى.');channel.port1.close()};
  worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);
 }
 navigator.serviceWorker.addEventListener('controllerchange',check);
 navigator.serviceWorker.register('/ward-notifications-sw.js',{updateViaCache:'none'}).then(reg=>{
  const watch=worker=>worker?.addEventListener('statechange',()=>{if(worker.state==='redundant')say('لم يكتمل حفظ المحتوى. أعد فتح بصيرة مع اتصال بالإنترنت.');if(worker.state==='activated')check()});
  watch(reg.installing);reg.addEventListener('updatefound',()=>watch(reg.installing));
  navigator.serviceWorker.ready.then(check);
 }).catch(()=>say('تعذّر تجهيز الاستخدام بدون إنترنت. حاول مجددًا عند توفر الاتصال.'));
 window.addEventListener('online',check);
})();

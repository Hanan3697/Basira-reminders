(()=>{
 const main=document.querySelector('main');
 const area=document.createElement('div');area.style.cssText='text-align:center;color:white;font-size:14px;padding:12px;text-shadow:0 1px 4px #000';
 const status=document.createElement('p');status.setAttribute('role','status');area.append(status);
 const update=document.createElement('button');update.type='button';update.className='secondary';update.textContent='تحديث بصيرة';area.append(update);main?.append(area);
 const say=text=>status.textContent=text;
 if(!('serviceWorker' in navigator)){say('الحفظ بدون اتصال غير متاح في هذا المتصفح.');update.hidden=true;return}
 let registration, reloading=false;
 const previous=navigator.serviceWorker.controller;
 function reload(){if(!reloading){reloading=true;location.reload()}}
 async function check(){
  const worker=navigator.serviceWorker.controller;if(!worker)return;
  const channel=new MessageChannel();
  channel.port1.onmessage=event=>{say(event.data.ready?'بصيرة جاهز للاستخدام بدون إنترنت ✓':'افتح بصيرة بالإنترنت لإكمال حفظ المحتوى.');channel.port1.close()};
  worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);
 }
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(previous)reload();else check()});
 say('جارٍ تجهيز بصيرة للاستخدام بدون إنترنت…');
 navigator.serviceWorker.register('/ward-notifications-sw.js',{updateViaCache:'none'}).then(reg=>{
  registration=reg;
  const watch=worker=>worker?.addEventListener('statechange',()=>{if(worker.state==='redundant'){say('لم يكتمل التحديث؛ تحقق من الاتصال وحاول مجددًا.');update.disabled=false}if(worker.state==='activated')check()});
  watch(reg.installing);reg.addEventListener('updatefound',()=>{say('جارٍ تنزيل تحديث بصيرة…');watch(reg.installing)});
  navigator.serviceWorker.ready.then(check);
 }).catch(()=>say('تعذّر تجهيز الاستخدام بدون إنترنت. حاول مجددًا عند توفر الاتصال.'));
 update.onclick=async()=>{
  if(!navigator.onLine){say('اتصل بالإنترنت أولًا لتحديث بصيرة.');return}
  update.disabled=true;say('جارٍ البحث عن تحديث وحفظه…');
  try{
   const reg=registration||await navigator.serviceWorker.ready;await reg.update();
   const worker=reg.installing||reg.waiting;
   if(worker && worker.state!=='activated'){
    worker.addEventListener('statechange',()=>{if(worker.state==='activated')reload();if(worker.state==='redundant'){say('تعذّر تنزيل التحديث. حاول مجددًا.');update.disabled=false}});
   }else reload();
  }catch{say('تعذّر الاتصال بالتحديث. حاول مجددًا.');update.disabled=false}
 };
 window.addEventListener('online',()=>{registration?.update().catch(()=>{});check()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine)registration?.update().catch(()=>{})});
})();

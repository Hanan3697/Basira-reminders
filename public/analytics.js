(()=>{
 const consentKey='basira-analytics-choice';
 const section=location.pathname.startsWith('/laws')?'laws':({'/':'home','/index.html':'home','/reader.html':'reader','/message.html':'message','/duas.html':'duas'})[location.pathname];
 if(!section)return;
 // Aggregate one page opening without a browser, session or event identifier.
 let viewed=false;
 function recordView(){
  if(viewed||document.hidden)return;
  viewed=true;
  fetch('/api/analytics/collect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'view',section}),keepalive:true,credentials:'omit',referrerPolicy:'no-referrer'}).catch(()=>{});
 }
 recordView();document.addEventListener('visibilitychange',recordView);
 const blocked=navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
 async function record(){
  if(blocked||document.hidden)return;
  try{
   if(localStorage.getItem(consentKey)!=='yes')return;
   let visitor=localStorage.getItem('basira-visitor');if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('basira-visitor',visitor)}
   const now=Date.now(),day=new Date(now+4*3600000).toISOString().slice(0,10);let session=JSON.parse(localStorage.getItem('basira-session')||'null');
   if(!session||now-session.last>1800000||now<session.last||session.day!==day)session={id:crypto.randomUUID(),last:now,day};
   session.last=now;localStorage.setItem('basira-session',JSON.stringify(session));
   await fetch('/api/analytics/collect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor,session:session.id,section}),keepalive:true});
  }catch{/* Analytics must never interrupt reading. */}
 }
 try{
  if(blocked)return;
  if(localStorage.getItem(consentKey)==='yes'){record();document.addEventListener('visibilitychange',record);return}
  if(localStorage.getItem(consentKey)==='no')return;
  const box=document.createElement('aside');box.className='analytics-choice';box.setAttribute('aria-label','إحصاءات الاستخدام الاختيارية');
  box.innerHTML='<p>نعدّ مرات فتح الصفحات إجماليًا دون معرّف للزائر. هل تسمح بمعرّف عشوائي لمتصفحك لتقدير عدد المستخدمين المختلفين؟ <a href="/privacy.html">التفاصيل</a></p><div><button type="button" data-choice="yes">السماح بعدّ المستخدمين</button><button type="button" data-choice="no">لا شكرًا</button></div>';
  box.addEventListener('click',e=>{const button=e.target.closest('[data-choice]');if(!button)return;try{localStorage.setItem(consentKey,button.dataset.choice)}catch{}box.remove();if(button.dataset.choice==='yes'){record();document.addEventListener('visibilitychange',record)}});
  document.body.append(box);
 }catch{}
})();

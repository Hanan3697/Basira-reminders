(() => {
  const enable=$('enableReminder'), test=$('tryReminder'), stop=$('stopReminder'), status=$('pushStatus');
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const installed=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  const background=Boolean(window.wardPushOrigin && 'PushManager' in window);
  const supported='serviceWorker' in navigator && 'Notification' in window;
  const available=supported&&(!ios||installed);
  const saved=()=>localStorage.getItem('ward-reminder-mode');
  const times=()=>JSON.parse(localStorage.getItem('ward-v1')||'{}').times||state.times;
  let registration;
  async function worker(){
    if(!registration){
      await navigator.serviceWorker.register('/ward-notifications-sw.js');
      registration=await navigator.serviceWorker.ready;
    }
    return registration;
  }
  function renderStatus(message) {
    const active=available && Notification.permission==='granted' && saved();
    enable.disabled=!available;
    test.disabled=!active;
    stop.disabled=!saved();
    status.textContent=message || (ios&&!installed?'على الآيفون، أضف بصيرة للشاشة الرئيسية وافتحه من أيقونته لتفعيل الإشعارات.':
      !supported?'هذا المتصفح لا يتيح إشعارات الويب هنا. جرّب متصفحًا يدعمها.':
      Notification.permission==='denied'?'الإشعارات محظورة لهذا التطبيق. اسمح بها من إعدادات الجهاز أو المتصفح.':
      active==='push'?'إشعارات بصيرة مفعّلة على هذا الجهاز حسب أوقاتك المحفوظة.':
      active?'تذكيرات هذه الصفحة مفعّلة ما دامت مفتوحة ونشطة.':
      background?'اختر أوقاتك واحفظها ثم اسمح بإشعارات بصيرة.':'التذكير متاح أثناء فتح صفحة القراءة. إرسال المواعيد والتطبيق مغلق بانتظار ربط خدمة الإرسال.');
    enable.textContent=background?'تفعيل إشعارات بصيرة':'تفعيل التذكير أثناء فتح الصفحة';
  }
  async function api(route,payload){
    let token=localStorage.getItem('ward-push-device');
    if(!token){token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem('ward-push-device',token);}
    const res=await fetch(window.wardPushOrigin+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(payload||{})});
    if(!res.ok)throw Error('push service');
    return res.json();
  }
  async function sync(){
    const reg=await worker(),sub=await reg.pushManager.getSubscription();
    if(!sub)throw Error('subscription');
    await api('/update',{endpoint:sub.endpoint,times:times()});
  }
  const show=async(title)=> (await worker()).showNotification(title,{body:'اضغط لفتح صفحة سورة البقرة.',icon:'/icon-192.png',tag:'ward-reading'});
  enable.onclick=async()=>{
    try{
      if(Notification.permission!=='granted' && await Notification.requestPermission()!=='granted'){renderStatus('لتفعيل التذكير، اسمح بإشعارات بصيرة من إعدادات جهازك.');return;}
      const reg=await worker();
      if(background){
        const {key}=await api('/key');
        const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
        const sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
        await api('/enable',{endpoint:sub.endpoint,times:times()});
        localStorage.setItem('ward-reminder-mode','push');
      }else{
        await show('تم تفعيل تذكير الصفحة');
        localStorage.setItem('ward-reminder-mode','foreground');
      }
      renderStatus();
    }catch{renderStatus('تعذّر تفعيل التذكير. تحقّق من إذن الإشعارات والاتصال ثم حاول مجددًا.');}
  };
  test.onclick=()=>show('تجربة إشعار بصيرة').catch(()=>renderStatus('تعذّر عرض إشعار التجربة.'));
  stop.onclick=async()=>{
    try{
      if(saved()==='push'){
        await api('/disable');const sub=await (await worker()).pushManager.getSubscription();
        if(sub)await sub.unsubscribe();
      }
      localStorage.removeItem('ward-reminder-mode');renderStatus('تم إيقاف التذكيرات على هذا الجهاز.');
    }catch{renderStatus('تعذّر إيقاف التذكيرات. أعد المحاولة عند الاتصال.');}
  };
  window.addEventListener('ward-times-saved',()=>{if(saved()==='push')sync().catch(()=>renderStatus('حُفظت الأوقات على الجهاز. أعد حفظها عند الاتصال لتحديث مواعيد الإشعارات.'));});
  const muscat=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Muscat',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  async function check(){
    if(document.hidden||!available||saved()!=='foreground'||Notification.permission!=='granted')return;
    const now=new Date(),time=muscat.format(now),key=today()+' '+time;
    if(!times().includes(time)||localStorage.getItem('ward-last-alert')===key)return;
    localStorage.setItem('ward-last-alert',key);
    try{await show('وقت وِرد سورة البقرة');}catch{renderStatus('تعذّر عرض تذكير الورد. تحقّق من إذن الإشعارات.');}
  }
  setInterval(check,10000);
  document.addEventListener('visibilitychange',check);
  renderStatus();
})();

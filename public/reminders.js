(() => {
  const enable=$('enableReminder'), test=$('tryReminder'), stop=$('stopReminder'), status=$('pushStatus');
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const installed=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  const background=Boolean(window.wardPushOrigin && 'PushManager' in window);
  const supported='serviceWorker' in navigator && 'Notification' in window;
  const available=supported&&(!ios||installed);
  const saved=()=>localStorage.getItem('ward-reminder-mode');
  const times=()=>JSON.parse(localStorage.getItem('ward-v1')||'{}').times||state.times;
  const dhikr=$('dhikrFrequency'), dhikrSave=$('saveDhikr'), dhikrStop=$('stopDhikr'), dhikrTest=$('testDhikr'), dhikrStatus=$('dhikrStatus');
  const dhikrSaved=()=>localStorage.getItem('ward-dhikr-frequency')||'off';
  dhikr.value=dhikrSaved()==='off'?'medium':dhikrSaved();
  let registration;
  async function worker(){
    if(!registration){
      await navigator.serviceWorker.register('/ward-notifications-sw.js');
      registration=await navigator.serviceWorker.ready;
    }
    return registration;
  }
  function renderStatus(message) {
    dhikrSave.disabled=!available||!background;dhikrStop.disabled=dhikrSaved()==='off';dhikrTest.disabled=!available||dhikrSaved()==='off';
    if(!available)dhikrStatus.textContent=ios&&!installed?'افتحي بصيرة من أيقونته على الشاشة الرئيسية لتفعيل الإشعارات.':'الإشعارات غير متاحة في هذا المتصفح.';
    else if(!dhikrStatus.textContent)dhikrStatus.textContent=dhikrSaved()==='off'?'إشعارات الأذكار متوقفة. اختاري الكمية واضغطي تفعيل.':'إشعارات الأذكار مفعّلة على هذا الجهاز.';
    const active=available && Notification.permission==='granted' && saved();
    enable.disabled=!available;
    test.disabled=!active;
    stop.disabled=!saved();
    status.textContent=message || (ios&&!installed?'على الآيفون، أضف بصيرة للشاشة الرئيسية وافتحه من أيقونته لتفعيل الإشعارات.':
      !supported?'هذا المتصفح لا يتيح إشعارات الويب هنا. جرّب متصفحًا يدعمها.':
      Notification.permission==='denied'?'الإشعارات محظورة لهذا التطبيق. اسمح بها من إعدادات الجهاز أو المتصفح.':
      active==='push'?'إشعارات بصيرة مفعّلة حسب أوقاتك بتوقيت عُمان، وتصل والتطبيق مغلق عند توفر الإنترنت.':
      active?'تذكيرات هذه الصفحة مفعّلة ما دامت مفتوحة ونشطة.':
      background?'اختر أوقاتك واحفظها ثم اسمح بإشعارات بصيرة.':'التذكير متاح أثناء فتح صفحة القراءة. إرسال المواعيد والتطبيق مغلق بانتظار ربط خدمة الإرسال.');
    enable.textContent=background?'تفعيل إشعارات بصيرة':'تفعيل التذكير أثناء فتح الصفحة';
  }
  async function api(route,payload){
    let token=localStorage.getItem('ward-push-device');
    if(!token){token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem('ward-push-device',token);}
    const res=await fetch(window.wardPushOrigin+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(payload||{})});
    const result=await res.json().catch(()=>({}));
    if(!res.ok){const error=Error(result.error||'push_service');error.delivery=result.delivery;throw error}
    return result;
  }
  async function sync(){
    const reg=await worker(),sub=await reg.pushManager.getSubscription();
    if(!sub)throw Error('subscription');
    await api('/update',{endpoint:sub.endpoint,keys:sub.toJSON().keys,times:times()});
  }
  async function subscribe(){
    const reg=await worker(),{key}=await api('/key');
    const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
    let sub=await reg.pushManager.getSubscription();
    if(sub?.options.applicationServerKey){const old=new Uint8Array(sub.options.applicationServerKey);if(old.length!==bytes.length||old.some((b,i)=>b!==bytes[i])){await sub.unsubscribe();sub=null}}
    return sub||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
  }
  async function stopCategory(category){
    const sub=await (await worker()).pushManager.getSubscription();
    if(!sub)return;
    const result=await api('/settings',{category,enabled:false,level:'off',endpoint:sub.endpoint});
    if(!result.active)await sub.unsubscribe();
  }
  dhikrSave.onclick=async()=>{
    dhikrSave.disabled=true;
    try{
      if(Notification.permission!=='granted'&&await Notification.requestPermission()!=='granted'){dhikrStatus.textContent='اسمحي بإشعارات بصيرة من إعدادات جهازك أولًا.';return}
      const sub=await subscribe(),level=dhikr.value;
      await api('/settings',{category:'dhikr',level,endpoint:sub.endpoint,keys:sub.toJSON().keys});
      localStorage.setItem('ward-dhikr-frequency',level);
      dhikrStatus.textContent='تم الحفظ: '+({few:3,medium:6,many:10}[level])+' إشعارات أذكار يوميًا تلقائيًا، بين ٨ صباحًا و٩ مساءً بتوقيت عُمان. تصل عند توفر الإنترنت حتى والتطبيق مغلق.';
    }catch{dhikrStatus.textContent='تعذّر حفظ إشعارات الأذكار. تحقّقي من الاتصال وإذن الإشعارات ثم أعيدي المحاولة.'}
    finally{renderStatus()}
  };
  dhikrStop.onclick=async()=>{try{await stopCategory('dhikr');localStorage.removeItem('ward-dhikr-frequency');dhikrStatus.textContent='تم إيقاف إشعارات الأذكار فقط.';renderStatus()}catch{dhikrStatus.textContent='تعذّر الإيقاف. حاولي عند توفر الإنترنت.'}};
  dhikrTest.onclick=async()=>{dhikrTest.disabled=true;try{await api('/test',{kind:'dhikr'});dhikrStatus.textContent='أُرسل إشعار ذكر للتجربة.'}catch(e){dhikrStatus.textContent=e.message==='wait_one_minute'?'انتظري دقيقة بين إشعارات التجربة.':'تعذّر إرسال التجربة. تحقّقي من الاتصال ثم حاولي مجددًا.'}finally{renderStatus()}};
  const show=async(title)=> (await worker()).showNotification(title,{body:'اضغط لفتح صفحة سورة البقرة.',icon:'/icon-192.png',tag:'ward-reading'});
  enable.onclick=async()=>{
    try{
      if(Notification.permission!=='granted' && await Notification.requestPermission()!=='granted'){renderStatus('لتفعيل التذكير، اسمح بإشعارات بصيرة من إعدادات جهازك.');return;}
      const reg=await worker();
      if(background){
        const sub=await subscribe();
        await api('/enable',{endpoint:sub.endpoint,keys:sub.toJSON().keys,times:times()});
        localStorage.setItem('ward-reminder-mode','push');
      }else{
        await show('تم تفعيل تذكير الصفحة');
        localStorage.setItem('ward-reminder-mode','foreground');
      }
      renderStatus();
    }catch{renderStatus('تعذّر تفعيل التذكير. تحقّق من إذن الإشعارات والاتصال ثم حاول مجددًا.');}
  };
  test.onclick=async()=>{test.disabled=true;try{if(saved()==='push'){await api('/test');renderStatus('أُرسل إشعار التجربة من الخادم. يمكنك تجربة موعد قريب والتطبيق مغلق.')}else await show('تجربة إشعار بصيرة')}catch(error){renderStatus(error.message==='wait_one_minute'?'أُرسلت تجربة بنجاح خلال الدقيقة الماضية؛ انتظر قليلًا.':error.message==='wait_five_seconds'?'انتظر خمس ثوانٍ ثم جرّب مجددًا.':error.message==='not_subscribed'?'اشتراك الإشعارات غير موجود على الخادم. اضغط تفعيل إشعارات بصيرة.':error.delivery?'رفضت خدمة الإرسال الإشعار. رمز التشخيص: '+error.delivery.status+' '+(error.delivery.reason||'Unknown'):'تعذّر الاتصال بخدمة الإرسال. حاول مجددًا عند توفر الإنترنت.')}finally{test.disabled=false}};
  stop.onclick=async()=>{
    try{
      if(saved()==='push'){
        await stopCategory('reading');
      }
      localStorage.removeItem('ward-reminder-mode');renderStatus('تم إيقاف تذكيرات القراءة فقط.');
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

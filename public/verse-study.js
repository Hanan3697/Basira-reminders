/* Verbatim source tafsir; source details are in sources.html. */
(() => {
  const host = document.getElementById('verses');
  if (!host) return;
  const book = '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/></svg>';
  const el = (tag, text, cls) => { const n = document.createElement(tag); if(text) n.textContent=text; if(cls)n.className=cls; return n; };
  const button = (text, action) => { const n=el('button',text); n.type='button'; n.onclick=action; return n; };
  let tafsir=null, loadFailed=false, ayahs=[], selected=1, tab='tafsir', timer, origin, suppress=false, sourceFocus;
  const dialog=el('dialog',null,'verse-study');
  dialog.setAttribute('aria-label','قراءة الآية مع التفسير');
  const header=el('header'), title=el('h2');
  header.append(title,button('إغلاق ×',()=>dialog.close()));
  const quote=el('p',null,'study-ayah');
  const tabs=el('div',null,'study-tabs'); tabs.setAttribute('role','tablist');
  const body=el('div',null,'study-body'); body.setAttribute('aria-live','polite');
  const nav=el('footer'), prev=button('الآية السابقة',()=>show(selected-1)), next=button('الآية التالية',()=>show(selected+1));
  const read=button('',()=>{tab='reading';draw()}); read.innerHTML=book+'<small>قراءة مع التفسير</small>';
  read.setAttribute('aria-label','قراءة مع التفسير');
  nav.append(prev,read,next);
  const sources=el('details',null,'study-sources'); sources.append(el('summary','المصادر والمراجع'));
  const sourcesText=el('p'); sources.append(sourcesText);
  for(const [key,label] of [['tafsir','تفسير الآية'],['reading','قراءة مع التفسير']]){
    const b=button(label,()=>{tab=key;draw()});b.dataset.tab=key;b.setAttribute('role','tab');tabs.append(b);
  }
  dialog.append(header,quote,tabs,body,nav,sources); document.body.append(dialog);
  const actions=el('dialog',null,'verse-study verse-actions'); actions.setAttribute('aria-label','خيارات الآية');
  const actionQuote=el('p',null,'study-ayah');
  const openBook=button('',()=>{actions.close();tab='reading';show(selected)});openBook.innerHTML=book+'<small>قراءة مع التفسير</small>';
  actions.append(actionQuote,openBook,button('إغلاق ×',()=>actions.close()));document.body.append(actions);
  // Display source records verbatim; no generated interpretations.
  function content(id){
    const box=el('div');
    if(tafsir) window.BasiraTafsir.append(box,tafsir.ayahs['2:'+id]);
    else box.append(el('p',loadFailed?'تعذّر تحميل التفسير. يرجى إعادة الفتح بعد اكتمال تنزيل التطبيق.':'جارٍ تحميل التفسير…'));
    return box;
  }
  function draw(){
    title.textContent='سورة البقرة · الآية '+selected.toLocaleString('ar-OM');
    quote.textContent=ayahs[selected-1]?.text||'';
    prev.disabled=selected===1;next.disabled=selected===ayahs.length;
    for(const b of tabs.children)b.setAttribute('aria-selected',String(b.dataset.tab===tab));
    body.replaceChildren();
    if(tab==='reading'){
      const page=ayahs[selected-1]?.page;
      for(const a of ayahs.filter(a=>a.page===page)){
        const section=el('section',null,'study-reading-row');section.dataset.studyAyah=a.numberInSurah;
        section.append(el('p',a.text+' ﴿'+a.numberInSurah.toLocaleString('ar-OM')+'﴾','study-ayah'),content(a.numberInSurah,'tafsir'));body.append(section);
      }
      body.querySelector(`[data-study-ayah="${selected}"]`)?.scrollIntoView({block:'nearest'});
    }else body.append(content(selected,tab));
    sourcesText.replaceChildren();
    const link=el('a','المصادر والمراجع');link.href='/sources.html';sourcesText.append(link);

  }
  function show(id){if(id<1||id>ayahs.length)return;selected=id;draw();if(!dialog.open)dialog.showModal();}
  function openActions(node){if(!ayahs.length)return;selected=Number(node.dataset.ayah);sourceFocus=node;actionQuote.textContent=ayahs[selected-1].text;actions.showModal();suppress=true;}
  function cancel(){clearTimeout(timer);timer=null;}
  host.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;const node=e.target.closest('[data-ayah]');if(!node)return;
    suppress=false;origin={x:e.clientX,y:e.clientY};cancel();timer=setTimeout(()=>openActions(node),550);
  });
  host.addEventListener('pointermove',e=>{if(origin && Math.hypot(e.clientX-origin.x,e.clientY-origin.y)>10)cancel()});
  for(const name of ['pointerup','pointercancel','pointerleave'])host.addEventListener(name,cancel);
  window.addEventListener('scroll',cancel,{passive:true});
  host.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();suppress=false}},true);
  host.addEventListener('contextmenu',e=>{const node=e.target.closest('[data-ayah]');if(node){e.preventDefault();cancel();if(!actions.open)openActions(node)}});
  host.addEventListener('keydown',e=>{if(e.target.matches('[data-ayah]') && ['Enter',' '].includes(e.key)){e.preventDefault();openActions(e.target)}});
  for(const d of [dialog,actions]){
    d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});
    d.addEventListener('close',()=>{suppress=false;if(!dialog.open&&!actions.open)sourceFocus?.focus({preventScroll:true})});
  }
  window.BasiraTafsir.load().then(data=>{tafsir=data;if(dialog.open)draw()}).catch(()=>{loadFailed=true;if(dialog.open)draw()});
  fetch('/quran.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(q=>{ayahs=q.data.ayahs}).catch(()=>{});
})();

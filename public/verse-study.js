/* Source tafsir is displayed verbatim. Basmalah is separate from numbered Baqarah ayahs. */
(() => {
  const host=document.getElementById('verses');if(!host)return;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n};
  const btn=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b};
  const book='<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/></svg>';
  let data=null,ayahs=[],selected=1,reading=false,failed=false,sourceFocus,timer,origin,suppress=false;
  const dialog=el('dialog',null,'verse-study');dialog.setAttribute('aria-label','التفسير الميسّر');
  const header=el('header'),heading=el('h2'),close=btn('إغلاق ×',()=>dialog.close());header.append(heading,close);
  const body=el('div',null,'study-body');body.setAttribute('aria-live','polite');
  const footer=el('footer'),previous=btn('السابق',()=>navigate(-1)),next=btn('التالي',()=>navigate(1));
  const toggle=btn('',()=>{reading=!reading;draw(true)});toggle.innerHTML=book+'<small>قراءة مع التفسير</small>';toggle.setAttribute('aria-label','قراءة مع التفسير');
  footer.append(previous,toggle,next);
  const sources=el('a','المصادر والمراجع','study-source-link');sources.href='/sources.html';
  dialog.append(header,body,footer,sources);document.body.append(dialog);
  const ready=Promise.all([fetch('/quran.json').then(r=>{if(!r.ok)throw Error();return r.json()}),window.BasiraTafsir.load()]).then(([q,t])=>{ayahs=q.data.ayahs;data=t;if(dialog.open)draw(true)}).catch(()=>{failed=true;if(dialog.open)draw()});
  function textFor(id){
    const text=ayahs[0]?.text||'',boundary=text.lastIndexOf(' ');
    if(id===0)return text.slice(0,boundary).trim();
    if(id===1)return text.slice(boundary+1);
    return ayahs[id-1]?.text||'';
  }
  function currentPage(){return ayahs[Math.max(0,selected-1)]?.page||2}
  function appendEntry(id){
    const section=el('section',null,'study-reading-row');section.dataset.studyAyah=id;
    const label=id===0?'البسملة':'الآية '+id.toLocaleString('ar-OM');
    section.append(el('p',label,'study-entry-label'),el('p',textFor(id)+(id?' ﴿'+id.toLocaleString('ar-OM')+'﴾':''),'study-ayah'));
    const commentary=el('div',null,'study-commentary');
    if(data)window.BasiraTafsir.append(commentary,data.ayahs[id===0?'1:1':'2:'+id]);
    else commentary.append(el('p',failed?'تعذّر تحميل التفسير. تأكد من اكتمال تنزيل نسخة الأوفلاين ثم أعد المحاولة.':'جارٍ تحميل التفسير…'));
    section.append(commentary);body.append(section);
  }
  function draw(scroll=false){
    dialog.classList.toggle('study-fullscreen',reading);
    heading.textContent=reading?'سورة البقرة · قراءة مع التفسير · صفحة '+currentPage().toLocaleString('ar-OM'):(selected===0?'البسملة · التفسير الميسّر':'سورة البقرة · الآية '+selected.toLocaleString('ar-OM'));
    toggle.querySelector('small').textContent=reading?'تفسير الآية':'قراءة مع التفسير';
    toggle.setAttribute('aria-label',reading?'تفسير الآية':'قراءة مع التفسير');
    previous.textContent=reading?'الصفحة السابقة':'الآية السابقة';next.textContent=reading?'الصفحة التالية':'الآية التالية';
    previous.disabled=reading?currentPage()===2:selected===0;next.disabled=reading?currentPage()===49:selected===286;
    body.replaceChildren();
    if(reading&&ayahs.length){
      const page=currentPage();if(page===2)appendEntry(0);
      for(const a of ayahs.filter(a=>a.page===page))appendEntry(a.numberInSurah);
    }else appendEntry(selected);
    if(scroll)requestAnimationFrame(()=>{
      const row=body.querySelector(`[data-study-ayah="${selected}"]`);
      body.scrollTop=reading&&row?Math.max(0,row.offsetTop-body.offsetTop-12):0;
    });
  }
  function navigate(delta){
    if(reading){const page=currentPage()+delta;if(page<2||page>49)return;selected=page===2?0:ayahs.find(a=>a.page===page).numberInSurah;}
    else selected=Math.max(0,Math.min(286,selected+delta));
    draw(true);
  }
  function open(node){sourceFocus=node;selected=Number(node.dataset.ayah);reading=false;draw();if(!dialog.open)dialog.showModal();body.scrollTop=0;}
  function cancel(){clearTimeout(timer);timer=null;}
  host.addEventListener('pointerdown',e=>{if(e.button!==0)return;const node=e.target.closest('[data-ayah]');if(!node)return;suppress=false;origin={x:e.clientX,y:e.clientY};cancel();timer=setTimeout(()=>{suppress=true;open(node)},550)});
  host.addEventListener('pointermove',e=>{if(origin&&Math.hypot(e.clientX-origin.x,e.clientY-origin.y)>10)cancel()});
  for(const event of ['pointerup','pointercancel','pointerleave'])host.addEventListener(event,cancel);
  window.addEventListener('scroll',cancel,{passive:true});
  host.addEventListener('click',e=>{
    if(suppress){e.preventDefault();e.stopImmediatePropagation();suppress=false;return;}
    // A short tap on the ayah number keeps the existing save-position action.
    if(e.target.closest('.verse-number'))return;
    const node=e.target.closest('[data-ayah]');if(node){e.preventDefault();open(node)}
  },true);
  host.addEventListener('contextmenu',e=>{const node=e.target.closest('[data-ayah]');if(node){e.preventDefault();cancel();suppress=true;open(node)}});
  host.addEventListener('keydown',e=>{if(e.target.matches('[data-ayah]')&&['Enter',' '].includes(e.key)){e.preventDefault();open(e.target)}});
  dialog.addEventListener('close',()=>{cancel();suppress=false;reading=false;sourceFocus?.focus({preventScroll:true})});
})();

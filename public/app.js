const $=id=>document.getElementById(id),arab=n=>Number(n).toLocaleString('ar-OM'),today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Muscat',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let state={date:today(),pos:0,sessions:8,start:'07:00',end:'21:00',font:30},verses=[],target=0,previous=null;
try{const s=JSON.parse(localStorage.getItem('ward-v1')||'null');if(s)state={...state,...s};state.pos=Math.min(286,Math.max(0,Number(state.pos)||0));}catch(e){$('notice').textContent='تعذّر قراءة الحفظ السابق. يمكنك القراءة وتحديد موضعك يدويًا.'}
if(!Array.isArray(state.times)||!state.times.length){state.times=['05:45','09:00','13:00'];}state.sessions=state.times.length;
function persist(){try{localStorage.setItem('ward-v1',JSON.stringify(state))}catch(e){$('notice').textContent='الحفظ غير متاح في هذا المتصفح؛ اترك الصفحة مفتوحة أو دوّن رقم الآية.'}}
function rollover(){if(state.date!==today()){if(state.pos===286||state.pos===0){state.pos=0;state.date=today();persist()}else $('notice').textContent='هذا موضعك من قراءة سابقة. يمكن المتابعة منه، أو اختيار «بدء قراءة جديدة» من الإعدادات.'}}
function getTarget(){if(state.pos>=286)return 286;const firstPage=verses[state.pos].page,lastPage=Math.min(49,firstPage+Math.ceil(48/state.sessions)-1);return verses.filter(v=>v.page<=lastPage).length}
let reviewPage = null;
function wardTarget() {
  return Number.isInteger(state.wardEnd) && state.wardEnd > state.pos && state.wardEnd <= 286
    ? state.wardEnd : getTarget();
}
function refreshEndChoices() {
  const select = $('wardEnd');
  if (select.dataset.from !== String(state.pos)) {
    select.length = 1;
    for (let n = state.pos + 1; n <= 286; n++) {
      select.add(new Option('الآية ' + arab(n), String(n)));
    }
    select.dataset.from = String(state.pos);
  }
  select.value = state.wardEnd === target && state.pos < target ? String(target) : '';
  $('wardEndControl').hidden = reviewPage !== null || state.pos === 286;
}
$('wardEnd').onchange = () => {
  state.wardEnd = Number($('wardEnd').value) || null;
  persist();
  render();
};
function saveStop(n) {
  previous = state.pos;
  state.date = today();
  state.pos = n;
  if (state.wardEnd <= n) state.wardEnd = null;
  reviewPage = null;
  persist();
  render();
  (n === 286 ? $('done') : $('reader')).scrollIntoView({block:'start'});
}
function jumpToPage(page) {
  const current = document.getElementById('page-' + page);
  if (current) { current.scrollIntoView({block:'start'}); return; }
  reviewPage = page;
  render();
  document.getElementById('page-' + page)?.scrollIntoView({block:'start'});
}
function pageNavigation(page) {
  const nav = document.createElement('nav');
  nav.className = 'row page-navigation';
  nav.setAttribute('aria-label', 'تصفّح المصحف');
  for (const [label, destination] of [['الصفحة السابقة', page - 1], ['الصفحة التالية', page + 1]]) {
    const button = document.createElement('button');
    button.textContent = label;
    button.disabled = destination < 2 || destination > 49;
    button.onclick = () => jumpToPage(destination);
    nav.append(button);
  }
  return nav;
}
$('resumeWard').onclick = () => {
  reviewPage = null;
  render();
  (state.pos === 286 ? $('done') : $('reader')).scrollIntoView({block:'start'});
};
$('reviewFinished').onclick = () => jumpToPage(49);
function render(){if(!verses.length)return;rollover();target=wardTarget();refreshEndChoices();$('progress').value=state.pos;$('pct').textContent=arab(Math.round(state.pos/286*100))+'٪';$('count').textContent='قرأت '+arab(state.pos)+' آية';$('position').value=state.pos;$('reader').style.display=state.pos===286 && reviewPage===null?'none':'block';$('done').style.display=state.pos===286?'block':'none';$('complete').disabled=state.pos===286 || reviewPage!==null;$('resumeWard').hidden=reviewPage===null;$('undo').disabled=previous===null;$('range').textContent='الآيات '+arab(state.pos+1)+' — '+arab(target);$('basmala').hidden=true;$('verses').replaceChildren();if(state.pos<286 || reviewPage!==null){const pages=reviewPage===null ? [...new Set(verses.slice(state.pos,target).map(v=>v.page))] : [reviewPage];pages.forEach((page,i)=>{const figure=document.createElement('figure');figure.style.margin='18px 0';figure.id='page-'+page;const caption=document.createElement('figcaption');caption.className='small';const pageVerses = verses.filter(v => v.page === page);
caption.textContent = 'صفحة ' + arab(page) + ' · الجزء ' + arab(pageVerses[0].juz) + ' من مصحف المدينة';
const lines = document.createElement('p');
lines.className = 'mushaf-text';
lines.style.fontSize = state.font + 'px';
for (const verse of pageVerses) {
  if (reviewPage === null && (verse.numberInSurah <= state.pos || verse.numberInSurah > target)) continue;
  const number = document.createElement('button');
  number.type = 'button';
  number.setAttribute('aria-label','وقفت هنا عند الآية ' + arab(verse.numberInSurah));
  number.onclick = () => {
    if (confirm('وقفت هنا عند الآية ' + arab(verse.numberInSurah) + '؟ تأكيد حفظها كآخر آية تمت قراءتها.')) saveStop(verse.numberInSurah);
  };
  number.className = 'verse-number';
  number.textContent = String(verse.numberInSurah).replace(/\d/g, digit => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
  let text = verse.text;
  if (verse.numberInSurah === 1) {
    // Keep every source character; only separate the opening basmala visually.
    const boundary = text.lastIndexOf(' ');
    if (boundary > 0) {
      const opening = document.createElement('span');
      opening.className = 'quran-basmala ayah-interactive';
      opening.dataset.ayah = '0';
      opening.tabIndex = 0;
      opening.setAttribute('aria-label', 'تفسير البسملة');
      opening.textContent = text.slice(0, boundary + 1);
      lines.append(opening);
      text = text.slice(boundary + 1);
    }
  }
  const ayah = document.createElement('span');
  ayah.className = 'ayah-interactive';
  ayah.dataset.ayah = verse.numberInSurah;
  ayah.tabIndex = 0;
  ayah.setAttribute('role', 'group');
  ayah.setAttribute('aria-label', 'خيارات الآية ' + arab(verse.numberInSurah));
  ayah.append(text, '\u00a0', number);
  lines.append(ayah, ' ');
}
figure.append(caption,pageNavigation(page),lines,pageNavigation(page));$('verses').append(figure)});$('range').textContent='من الآية '+arab(state.pos+1)+' إلى الآية '+arab(target)+' — الصفحات '+arab(pages[0])+' إلى '+arab(pages[pages.length-1]);}if(reviewPage!==null)$('range').textContent='مراجعة الصفحة '+arab(reviewPage)+' · موضع قراءتك محفوظ';}
$('complete').onclick=()=>{saveStop(target)};$('undo').onclick=()=>{if(previous!==null){state.pos=previous;reviewPage=null;previous=null;persist();render()}};
$('savePosition').onclick=()=>{let v=Number($('position').value);if(!Number.isInteger(v)||v<0||v>286){$('notice').textContent='يرجى اختيار رقم آية بين ٠ و٢٨٦.';return}previous=state.pos;state.pos=v;reviewPage=null;persist();render();$('notice').textContent='تم حفظ موضع القراءة.'};
$('newDay').onclick=()=>{if(confirm('هل تريد بدء قراءة جديدة من أول السورة؟')){previous=state.pos;reviewPage=null;state.pos=0;state.wardEnd=null;state.date=today();$('notice').textContent='';persist();render()}};
for(const [id,delta] of [['smaller',-2],['larger',2]])$(id).onclick=()=>{state.font=Math.max(22,Math.min(46,state.font+delta));persist();render()};
fetch('./quran.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(j=>{verses=j.data.ayahs;if(verses.length!==286||verses.some((v,i)=>v.numberInSurah!==i+1||!v.text))throw Error();render()}).catch(()=>{$('notice').textContent='تعذّر تحميل النص. يرجى إعادة فتح الصفحة عند توفر الاتصال.';$('complete').disabled=true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});

let deferredInstall=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;});
$('installApp').onclick=async()=>{if(deferredInstall){await deferredInstall.prompt();deferredInstall=null;}else{$('installHelp').hidden=!$('installHelp').hidden;}};
if(window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone){$('installCard').hidden=true;}
window.addEventListener('appinstalled',()=>{$('installCard').hidden=true;});

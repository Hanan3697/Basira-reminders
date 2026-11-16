(() => {
  const cards = Array.from(document.querySelectorAll('.message-item'));
  const result = document.getElementById('message-result');
  let remaining = [];
  let previous;
  const references=fetch('/data/message-refs.json').then(r=>{if(!r.ok)throw Error();return r.json()});
  const tafsir=window.BasiraTafsir.load();
  // Handle loading failures without interrupting the existing reflection.
  references.catch(()=>{});tafsir.catch(()=>{});
  let drawId=0;

  function refill() {
    remaining = cards.slice();
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    const last = remaining.length - 1;
    if (remaining[last] === previous && last > 0) {
      [remaining[0], remaining[last]] = [remaining[last], remaining[0]];
    }
  }

  function drawMessage() {
    if (!remaining.length) refill();
    previous = remaining.pop();
    result.replaceChildren(previous.content.cloneNode(true));
    const currentDraw=++drawId, cardIndex=cards.indexOf(previous);
    const panel=document.createElement('section');panel.className='reflection message-tafsir';
    const title=document.createElement('strong');title.textContent='التفسير الميسّر';
    const text=document.createElement('div');text.textContent='جارٍ تحميل التفسير…';panel.append(title,text);
    result.querySelector('.verse-panel').after(panel);
    Promise.all([references,tafsir]).then(([refs,data])=>{
      if(currentDraw!==drawId)return;
      const record=data.ayahs[refs[cardIndex]];if(!record)throw Error('missing tafsir');
      text.replaceChildren();window.BasiraTafsir.append(text,record);
    }).catch(()=>{if(currentDraw===drawId)text.textContent='تعذّر تحميل التفسير. يرجى إعادة فتح التطبيق بعد اكتمال تنزيل نسخة الأوفلاين.'});
  }

  document.getElementById('draw-message').addEventListener('click', drawMessage);
  drawMessage();
})();

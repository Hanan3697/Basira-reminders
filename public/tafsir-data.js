(() => {
  let pending;
  window.BasiraTafsir = {
    load() {
      if(!pending) pending=fetch('/data/muyassar.json').then(r=>{if(!r.ok)throw Error('tafsir unavailable');return r.json()}).then(data=>{if(data.source?.key!=='arabic_moyassar'||Object.keys(data.ayahs||{}).length!==400)throw Error('invalid tafsir');return data}).catch(error=>{pending=null;throw error});
      return pending;
    },
    append(container,record) {
      const p=document.createElement('p');p.textContent=record?.text||'تعذّر تحميل التفسير. أعيدي فتح التطبيق بعد اكتمال تنزيله.';container.append(p);
      if(record?.footnotes){const notes=document.createElement('p');notes.className='small';notes.textContent=record.footnotes;container.append(notes);}
    }
  };
})();

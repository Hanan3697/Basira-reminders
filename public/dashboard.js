(()=>{
 const $=id=>document.getElementById(id),n=x=>Number(x).toLocaleString('ar-OM');
 const node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e};
 async function load(){
 $('refresh-stats').disabled=true;$('stats-status').textContent='جارٍ تحديث الأرقام…';
 try{
  const response=await fetch('/api/analytics/stats',{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'تعذّر تحميل الإحصاءات');
  $('totals').replaceChildren();
  for(const [key,label] of [['all','الإجمالي التراكمي منذ بدء التسجيل'],['today','اليوم'],['week','آخر ٧ أيام'],['month','آخر ٣٠ يومًا']]){
   const tile=node('article','');tile.className='stats-tile';tile.append(node('h2',label),node('strong',n(data[key].pageViews??data[key].visits)),node('span','مشاهدة صفحة'),node('p',n(data[key].visitors)+' متصفح مختلف — من الموافقين فقط'),node('p',n(data[key].sessions??0)+' جلسة زيارة — من الموافقين فقط'));$('totals').append(tile);
  }
  $('since').textContent=data.since?'أول زيارة مسجلة: '+data.since:'لم تُسجّل زيارات بعد. ستظهر الأرقام مع مرات فتح الصفحات الجديدة.';
  $('popular').replaceChildren();for(const row of data.sections){const e=node('div','');e.className='popular-row';e.append(node('span',row.label),node('strong',n(row.visits)));$('popular').append(e)}
  if(!data.sections.length)$('popular').append(node('p','لا توجد بيانات بعد.'));
  $('daily').replaceChildren();for(const row of data.daily){const tr=node('tr','');tr.append(node('td',row.day),node('td',n(row.visits)));$('daily').append(tr)}
  $('stats-content').hidden=false;$('stats-status').textContent='آخر تحديث: '+new Date(data.updated).toLocaleString('ar-OM',{timeZone:'Asia/Muscat'});
 }catch(error){$('stats-content').hidden=true;$('stats-status').textContent=error.message+' — لم يتم عرض أرقام غير مؤكّدة.'}
 finally{$('refresh-stats').disabled=false}
 }
 $('refresh-stats').onclick=load;load();
})();

const status=document.getElementById('privacy-status');
function update(){try{status.textContent=localStorage.getItem('basira-analytics-choice')==='yes'?'اختيارك الحالي: السماح بعدّ المستخدمين.':'اختيارك الحالي: عدّ المستخدمين غير مفعّل؛ يستمر عدّ الزيارات الإجمالي.'}catch{status.textContent='التخزين غير متاح في هذا المتصفح.'}}
document.getElementById('allow').onclick=()=>{try{localStorage.setItem('basira-analytics-choice','yes');update()}catch{status.textContent='تعذّر حفظ الاختيار.'}};
document.getElementById('decline').onclick=()=>{try{localStorage.setItem('basira-analytics-choice','no');localStorage.removeItem('basira-visitor');localStorage.removeItem('basira-session');update()}catch{status.textContent='تعذّر حفظ الاختيار.'}};update();

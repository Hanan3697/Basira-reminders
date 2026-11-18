// Automatic daytime slots in Asia/Muscat. Morning/evening openings never rotate.
export const DHIKR_COUNTS={few:7,medium:11,many:17};
export const MORNING='اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور';
export const EVENING='اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير';
// User-selected supplications; no claims about rewards or prescribed repetition counts.
export const DHIKR=[
 'سبحان الله وبحمده، سبحان الله العظيم',
 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير',
 'أستغفر الله العظيم وأتوب إليه',
 'الحمد لله عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته',
 'لا إله إلا أنت سبحانك إني كنت من الظالمين',
 'ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار',
 'ربِّ لك الحمد كما ينبغي لجلال وجهك وعظيم سلطانك',
 'أعوذ بكلمات الله التامات من شر ما خلق',
 'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم',
 'ربِّ اشرح لي صدري ويسر لي أمري واحلل عقدة من لساني يفقهوا قولي',
 'رضيت بالله ربًّا، وبالإسلام دينًا، وبمحمد ﷺ رسولًا',
 'سبحان الله وبحمده',
 'لا حول ولا قوة إلا بالله',
 'سبحان الله والحمد لله ولا إله إلا الله والله أكبر',
 'سبحان الله العظيم',
 'لا إله إلا الله'
];
export function dhikrTimes(level){
 const count=DHIKR_COUNTS[level];if(!count)return [];
 const minutes=[480,1080];
 for(let i=0;i<count-2;i++){
  let minute=480+Math.floor((i+0.5)*780/(count-2));
  while(minutes.includes(minute))minute++;
  minutes.push(minute);
 }
 return minutes.sort((a,b)=>a-b).map(minute=>String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0'));
}
export function dhikrMessage(due,level='medium'){
 const local=due+4*3600000,date=new Date(local);
 const time=String(date.getUTCHours()).padStart(2,'0')+':'+String(date.getUTCMinutes()).padStart(2,'0');
 const general=dhikrTimes(level).filter(t=>t!=='08:00'&&t!=='18:00');
 const index=Math.max(0,general.indexOf(time));
 const body=time==='08:00'?MORNING:time==='18:00'?EVENING:DHIKR[(Math.floor(local/86400000)+index)%DHIKR.length];
 return {kind:'dhikr',title:'ذكر الله · بصيرة',body,url:'/'};
}

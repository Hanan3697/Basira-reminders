// Automatic daytime slots, Asia/Muscat. No timer depends on an open browser.
export const DHIKR_COUNTS={few:3,medium:6,many:10};
export const DHIKR=['سبحان الله وبحمده','أستغفر الله وأتوب إليه','لا حول ولا قوة إلا بالله','سبحان الله والحمد لله ولا إله إلا الله والله أكبر','سبحان الله العظيم','لا إله إلا الله'];
export function dhikrTimes(level){
 const count=DHIKR_COUNTS[level]||0;
 return Array.from({length:count},(_,i)=>{const minute=480+Math.floor((i+0.5)*780/count);return String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0')});
}
export function dhikrMessage(due,level='medium'){const date=new Date(due+4*3600000),time=String(date.getUTCHours()).padStart(2,'0')+':'+String(date.getUTCMinutes()).padStart(2,'0');const index=Math.max(0,dhikrTimes(level).indexOf(time));return {kind:'dhikr',title:'ذكر الله · بصيرة',body:DHIKR[(Math.floor((due+4*3600000)/86400000)+index)%DHIKR.length],url:'/'}}

export const sections = {home:'الرئيسية',reader:'معجزات البقرة',message:'رسالتك اليوم',duas:'أدعية الأنبياء',laws:'قوانين / سنن كونية'};
export function muscatDay(now=Date.now()){return new Date(now+4*3600000).toISOString().slice(0,10)}
export function validVisit(data){return data && /^[a-f0-9-]{36}$/.test(data.visitor||'') && /^[a-f0-9-]{36}$/.test(data.session||'') && Object.hasOwn(sections,data.section)}
export function validView(data){return data && data.kind==='view' && Object.keys(data).length===2 && Object.hasOwn(sections,data.section)}
export async function recordView(db,data,now=Date.now()){await db.prepare('INSERT INTO analytics_views (day,section,views) VALUES (?,?,1) ON CONFLICT(day,section) DO UPDATE SET views=views+1').bind(muscatDay(now),data.section).run()}
export async function recordVisit(db,data,now=Date.now()){
 await db.batch([
 db.prepare('INSERT OR IGNORE INTO analytics_sessions (id,visitor,day,created) VALUES (?,?,?,?)').bind(data.session,data.visitor,muscatDay(now),now),
 db.prepare('INSERT OR IGNORE INTO analytics_sections (session,section) SELECT id,? FROM analytics_sessions WHERE id=? AND visitor=?').bind(data.section,data.session,data.visitor)
 ]);
}
export async function stats(db,now=Date.now()){
 const dates=[muscatDay(now),muscatDay(now-6*86400000),muscatDay(now-29*86400000),'0000-00-00'];
 const totals=await db.batch(dates.map(d=>db.prepare('SELECT COUNT(*) AS visits,COUNT(DISTINCT visitor) AS visitors FROM analytics_sessions WHERE day>=?').bind(d)));
 const views=await db.batch(dates.map(d=>db.prepare('SELECT COALESCE(SUM(views),0) AS visits FROM analytics_views WHERE day>=?').bind(d)));
 const daily=await db.prepare('SELECT day,SUM(views) AS visits FROM analytics_views GROUP BY day ORDER BY day DESC').all();
 const popular=await db.prepare('SELECT section,SUM(views) AS visits FROM analytics_views GROUP BY section ORDER BY visits DESC').all();
 const first=await db.prepare('SELECT MIN(day) AS day FROM analytics_views').first();
 for(let i=0;i<4;i++){
  const row=totals[i].results[0];
  row.sessions=row.visits;
  row.pageViews=views[i].results[0].visits;
  row.visits=row.pageViews; // Legacy dashboard field: page views, not sessions.
 }
 return {today:totals[0].results[0],week:totals[1].results[0],month:totals[2].results[0],all:totals[3].results[0],daily:daily.results,sections:popular.results.map(r=>({...r,label:sections[r.section]})),since:first?.day||null,updated:new Date(now).toISOString()};
}

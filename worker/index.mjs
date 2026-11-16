import {authorize} from './auth.mjs';
import {validVisit,validView,recordVisit,recordView,stats} from '../lib/analytics.mjs';
import {page,dashboard} from '../lib/dashboard.mjs';
const privateHeaders={'Cache-Control':'private, no-store','Vary':'Cookie, Cf-Access-Jwt-Assertion','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/statistics'||url.pathname==='/api/analytics/stats'){
  if(request.method!=='GET')return new Response(null,{status:405,headers:privateHeaders});
  const status=await authorize(request,env);
  if(status!==200){
   const message=status===503?'لوحة الإدارة قيد الإعداد.':'هذه الصفحة خاصة بإدارة بصيرة. يرجى تسجيل الدخول بحساب الإدارة.';
   return url.pathname==='/statistics'?new Response(page('<p>'+message+'</p>'),{status,headers:{...privateHeaders,'Content-Type':'text/html; charset=utf-8'}}):Response.json({error:message},{status,headers:privateHeaders});
  }
  if(url.pathname==='/statistics')return new Response(dashboard,{headers:{...privateHeaders,'Content-Type':'text/html; charset=utf-8'}});
  try{return Response.json(await stats(env.DB),{headers:privateHeaders});}catch{return Response.json({error:'تعذّر تحميل الإحصاءات.'},{status:503,headers:privateHeaders});}
 }
 if(url.pathname==='/api/analytics/collect'){
  const headers={'Cache-Control':'no-store'};
  if(request.method!=='POST')return new Response(null,{status:405,headers});
  if(request.headers.get('origin')!==url.origin)return new Response(null,{status:403,headers});
  if(!request.headers.get('content-type')?.startsWith('application/json'))return new Response(null,{status:415,headers});
  if(Number(request.headers.get('content-length'))>512)return new Response(null,{status:413,headers});
  const body=await request.text();if(body.length>512)return new Response(null,{status:413,headers});
  let data;try{data=JSON.parse(body)}catch{return new Response(null,{status:400,headers});}
  if(!validVisit(data)&&!validView(data))return new Response(null,{status:400,headers});
  if(!env.DB)return new Response(null,{status:503,headers});
  try{if(validView(data))await recordView(env.DB,data);else await recordVisit(env.DB,data);return new Response(null,{status:204,headers});}catch{return new Response(null,{status:503,headers});}
 }
 if(url.pathname.startsWith('/api/'))return new Response(null,{status:404});
 if(url.pathname==='/'){
  url.pathname='/index.html';
  return env.ASSETS.fetch(new Request(url,request));
 }
 return env.ASSETS.fetch(request);
}};

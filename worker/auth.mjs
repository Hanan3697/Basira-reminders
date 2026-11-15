const keyCache=new Map();
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export async function authorize(request,env,fetchKeys=fetch,now=Date.now()){
 // Only a signed Cloudflare Access assertion is trusted. Sites identity headers are ignored.
 if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD||!env.ADMIN_EMAIL)return 503;
 if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN))return 503;
 const token=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!token)return 401;
 try{
  const parts=token.split('.');if(parts.length!==3)return 403;
  const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));
  const claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
  const issuer='https://'+env.ACCESS_TEAM_DOMAIN;
  if(header.alg!=='RS256'||typeof header.kid!=='string')return 403;
  if(claims.iss!==issuer||!Number.isFinite(claims.exp)||claims.exp<=now/1000||
   (claims.nbf!==undefined&&(!Number.isFinite(claims.nbf)||claims.nbf>now/1000))||
   !(Array.isArray(claims.aud)?claims.aud:[claims.aud]).includes(env.ACCESS_AUD))return 403;
  let entry=keyCache.get(issuer);
  if(!entry||entry.until<now){
   const res=await fetchKeys(issuer+'/cdn-cgi/access/certs');if(!res.ok)return 503;
   const data=await res.json();if(!Array.isArray(data.keys))return 503;
   entry={keys:data.keys,until:now+3600000};keyCache.set(issuer,entry);
  }
  const jwk=entry.keys.find(k=>k.kid===header.kid&&k.kty==='RSA');if(!jwk)return 403;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
  if(!valid||typeof claims.email!=='string'||claims.email.toLowerCase()!==env.ADMIN_EMAIL.trim().toLowerCase())return 403;
  return env.DB?200:503;
 }catch{return 403;}
}

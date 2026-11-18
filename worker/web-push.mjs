// RFC 8291 / RFC 8188, one aes128gcm record, using Web Crypto only.
const enc=new TextEncoder();
export const decode=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const join=(...parts)=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length}return out};
async function hkdf(input,salt,info,length){const key=await crypto.subtle.importKey('raw',input,'HKDF',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length*8))}
export async function encryptPush(keys,message,fixture){
 const receiver=decode(keys.p256dh),auth=decode(keys.auth);
 const pair=fixture?.pair||await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const sender=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey));
 const peer=await crypto.subtle.importKey('raw',receiver,{name:'ECDH',namedCurve:'P-256'},false,[]);
 const secret=await crypto.subtle.deriveBits({name:'ECDH',public:peer},pair.privateKey,256);
 const ikm=await hkdf(secret,auth,join(enc.encode('WebPush: info\0'),receiver,sender),32);
 const salt=fixture?.salt||crypto.getRandomValues(new Uint8Array(16));
 const cek=await hkdf(ikm,salt,enc.encode('Content-Encoding: aes128gcm\0'),16);
 const nonce=await hkdf(ikm,salt,enc.encode('Content-Encoding: nonce\0'),12);
 const plain=enc.encode(message);if(plain.length>3993)throw Error('Payload too large');
 const key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);
 const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},key,join(plain,new Uint8Array([2]))));
 return join(salt,new Uint8Array([0,0,16,0,65]),sender,encrypted);
}
export async function validPushKeys(keys){
 try{if(typeof keys?.p256dh!=='string'||typeof keys?.auth!=='string'||keys.p256dh.length>90||keys.auth.length>24||decode(keys.auth).length!==16||decode(keys.p256dh).length!==65)return false;await crypto.subtle.importKey('raw',decode(keys.p256dh),{name:'ECDH',namedCurve:'P-256'},false,[]);return true}catch{return false}
}

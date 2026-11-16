import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.events={};this.attrs={};this.textContent='';this.open=false;this.classes=new Set();this.classList={toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=children}
 setAttribute(k,v){this.attrs[k]=v}
 set innerHTML(html){this.children=[];const m=html.match(/<small>(.*?)<\/small>/);if(m){const e=new Element('small');e.textContent=m[1];this.append(e)}}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn)}
 querySelector(selector){return this.children.find(c=>selector==='small'?c.tagName==='small':selector.startsWith('[data-study-ayah=')?String(c.dataset.studyAyah)===selector.match(/"(.*?)"/)[1]:false)||this.children.map(c=>c.querySelector(selector)).find(Boolean)}
 showModal(){this.open=true} close(){this.open=false;for(const fn of this.events.close||[])fn()}
 focus(){} get offsetTop(){return 0}
}
const allText=e=>[e.textContent,...e.children.map(allText)].join(' ');
test('tap opens the selected tafsir directly; book opens full-screen paged reading with separate basmalah',async()=>{
 const host=new Element('article'),body=new Element('body'),q=JSON.parse(read('public/quran.json')),data=JSON.parse(read('public/data/muyassar.json'));
 const document={getElementById:()=>host,body,createElement:t=>new Element(t)};
 const window={addEventListener(){},BasiraTafsir:{load:async()=>data,append:(node,r)=>{const p=new Element('p');p.textContent=r.text;node.append(p)}}};
 runInNewContext(read('public/verse-study.js'),{document,window,fetch:async()=>({ok:true,json:async()=>q}),setTimeout,clearTimeout,requestAnimationFrame:fn=>fn()});
 await new Promise(r=>setImmediate(r));
 const dialog=body.children[0],node=new Element('span');node.dataset.ayah='3';node.closest=s=>s==='.verse-number'?null:node;
 host.events.click[0]({target:node,preventDefault(){}});
 assert.ok(dialog.open);assert.ok(allText(dialog).includes(data.ayahs['2:3'].text));assert.equal(dialog.classes.has('study-fullscreen'),false);
 dialog.children[2].children[1].onclick();assert.ok(dialog.classes.has('study-fullscreen'));
 const rows=dialog.children[1].children;
 const basmala=rows.find(r=>r.dataset.studyAyah===0),alif=rows.find(r=>r.dataset.studyAyah===1);
 assert.ok(basmala);assert.ok(alif);assert.ok(allText(basmala).includes(data.ayahs['1:1'].text));
 assert.equal(alif.children[1].textContent.includes('بِسْمِ'),false);
 dialog.children[2].children[2].onclick();assert.ok(allText(dialog.children[0]).includes('٣'));
 const number=new Element('button');number.closest=s=>s==='.verse-number'?number:null;
 dialog.close();host.events.click[0]({target:number,preventDefault(){throw Error('save-position tap intercepted')}});assert.equal(dialog.open,false);
});

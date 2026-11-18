import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const audit=JSON.parse(readFileSync('tests/fixtures/quran-audit.json','utf8'));
function passages(file,section){
 const source=readFileSync(file,'utf8');
 if(section==='baqarah')return JSON.parse(source).data.ayahs.map(a=>a.text);
 const pattern=section==='laws'?/<p\b[^>]*class="law-verse"[^>]*>([\s\S]*?)<\/p>/g:/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/g;
 return [...source.matchAll(pattern)].map(m=>m[1].replace(/<(small|span)\b[^>]*>[\s\S]*?<\/\1>/g,'').replace(/<[^>]*>/g,''));
}
for(const section of ['baqarah','messages','duas','laws'])test(section+': preserve every audited source letter and vowel mark',()=>{
 const rows=audit.records.filter(r=>r.section===section),cache=new Map();
 assert.equal(rows.length,{baqarah:286,messages:122,duas:79,laws:71}[section]);
 for(const row of rows){if(!cache.has(row.file))cache.set(row.file,passages(row.file,section));const text=cache.get(row.file)[row.index];assert.equal(createHash('sha256').update(text).digest('hex'),row.sha256,`${row.file} ${row.refs||row.keys}`)}
});

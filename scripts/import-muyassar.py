import sqlite3,json,re,hashlib
from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).resolve().parent.parent
source=Path('/tmp/muyassar.sqlite')
c=sqlite3.connect(source);rows=c.execute('select id,sura,aya,translation,footnotes from translations order by id').fetchall()
assert len(rows)==6236 and len({(r[1],r[2]) for r in rows})==6236
for s in range(1,115):
 group=[r for r in rows if r[1]==s];assert [r[2] for r in group]==list(range(1,len(group)+1));assert all(r[3].strip() for r in group)
api=json.load(open('/tmp/muyassar2.json'))['result'];bykey={(r[1],r[2]):r for r in rows}
assert all(bykey[(int(a['sura']),int(a['aya']))][3:]==(a['translation'],a['footnotes']) for a in api)
class Templates(HTMLParser):
 def __init__(self):super().__init__();self.inside=False;self.p=False;self.labels=[];self.first=False
 def handle_starttag(self,t,a):
  if t=='template':self.inside=True;self.first=True
  if t=='p' and self.inside and self.first:self.p=True;self.first=False
 def handle_endtag(self,t):
  if t=='template':self.inside=False
  if t=='p':self.p=False
 def handle_data(self,d):
  if self.p:self.labels.append(d)
p=Templates();p.feed((root/'public/message.html').read_text());names={'البقرة':2,'الفاتحة':1};refs=[]
for label in p.labels:
 m=re.fullmatch(r'سورة (.+) · الآية ([٠-٩]+)',label);assert m,label
 name,num=m.groups()
 if name not in names:names[name]=max(names.values())+1
 key=f'{names[name]}:{int(num)}';assert (names[name],int(num)) in bykey;refs.append(key)
assert len(names)==114 and len(refs)==122,(len(names),len(refs))
needed=set(refs)|{f'2:{i}' for i in range(1,287)}
records={f'{s}:{a}':{'text':text,'footnotes':footnotes} for _,s,a,text,footnotes in rows if f'{s}:{a}' in needed}
assert set(records)==needed
assert not any('<' in r['text'] for r in records.values())
data={'source':{'title':'التفسير الميسّر','author':'نخبة من أساتذة التفسير','publisher':'مجمع الملك فهد لطباعة المصحف الشريف','provider':'QuranEnc.com','key':'arabic_moyassar','version':'1.0.0','releaseDate':'2017-02-15','retrieved':'2026-11-16','url':'https://quranenc.com/ar/browse/arabic_moyassar/','downloadUrl':'https://quranenc.com/downloads/sqlite/arabic_moyassar.sqlite','sha256':hashlib.sha256(source.read_bytes()).hexdigest()},'ayahs':records}
(root/'public/data/muyassar.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
(root/'public/data/message-refs.json').write_text(json.dumps(refs,separators=(',',':')))
print('Verified 6236 complete, unique source records; 286 match source API exactly; all 122 daily message references mapped.')

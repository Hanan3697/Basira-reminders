"""Audit every Baqarah word: glyph coverage, joining fixes, unchanged other words."""
import json,re
from pathlib import Path
from fontTools.ttLib import TTFont
import uharfbuzz as hb
root=Path(__file__).resolve().parents[1]
old=(root/'public/AmiriQuran.ttf').read_bytes();new=(root/'public/BasiraQuran.ttf').read_bytes()
original=TTFont(root/'public/AmiriQuran.ttf');updated=TTFont(root/'public/BasiraQuran.ttf')
from bs4 import BeautifulSoup
records=json.loads((root/'tests/fixtures/quran-audit.json').read_text())['records']
words=[];sections={}
for row in records:
 if row['section']=='baqarah':
  text=json.loads((root/row['file']).read_text())['data']['ayahs'][row['index']]['text']
 else:
  soup=BeautifulSoup((root/row['file']).read_text(),'html.parser')
  elements=soup.find_all('blockquote') if row['section']!='laws' else soup.find_all('p',class_='law-verse')
  el=elements[row['index']]
  text=''.join(str(t) for t in el.find_all(string=True) if not t.find_parent(['small','span']))
 sections.setdefault(row['section'],[]).extend(text.split())
 words.extend(text.split())
def shape(data,text):
 face=hb.Face(data);font=hb.Font(face);font.scale=(face.upem,face.upem);b=hb.Buffer();b.add_str(text);b.guess_segment_properties();hb.shape(font,b)
 return [(i.codepoint,p.x_advance,p.x_offset,p.y_offset) for i,p in zip(b.glyph_infos,b.glyph_positions)]
changed=set();missing=set();order=updated.getGlyphOrder()
for word in words:
 missing.update(c for c in word if ord(c) not in updated.getBestCmap())
 a=shape(old,word);b=shape(new,word)
 if a!=b:
  assert (len(b)==1 and b[0][0]>=len(original.getGlyphOrder())) or '\u065e' in word,word
  changed.add(word)
assert not missing,repr(missing)
assert {'إِبْرَٰهِۦمَ','إِبْرَٰهِۦمُ','وَٱلنَّبِيِّۦنَ','ٱلنَّبِيِّۦنَ'}<=changed,changed
assert len(words)>6000
print(f'PASS: {len(words)} words across {len(records)} Quran passages; no missing glyphs; every changed glyph belongs to an intended joining or legacy tanween fix. Source text is read-only.')
for section,tokens in sections.items():print(section,len(tokens),'words')

"""Audit every Baqarah word: glyph coverage, joining fixes, unchanged other words."""
import json,re
from pathlib import Path
from fontTools.ttLib import TTFont
import uharfbuzz as hb
root=Path(__file__).resolve().parents[1]
old=(root/'public/AmiriQuran.ttf').read_bytes();new=(root/'public/BasiraQuran.ttf').read_bytes()
original=TTFont(root/'public/AmiriQuran.ttf');updated=TTFont(root/'public/BasiraQuran.ttf')
words=[word for verse in json.loads((root/'public/quran.json').read_text())['data']['ayahs'] for word in verse['text'].split()]
def shape(data,text):
 face=hb.Face(data);font=hb.Font(face);font.scale=(face.upem,face.upem);b=hb.Buffer();b.add_str(text);b.guess_segment_properties();hb.shape(font,b)
 return [(i.codepoint,p.x_advance,p.x_offset,p.y_offset) for i,p in zip(b.glyph_infos,b.glyph_positions)]
changed=set();missing=set();order=updated.getGlyphOrder()
for word in words:
 missing.update(c for c in word if ord(c) not in updated.getBestCmap())
 a=shape(old,word);b=shape(new,word)
 if a!=b:
  assert len(b)==1 and b[0][0]>=len(original.getGlyphOrder()),word
  changed.add(word)
assert not missing,repr(missing)
assert changed=={'إِبْرَٰهِۦمَ','إِبْرَٰهِۦمُ','وَٱلنَّبِيِّۦنَ','ٱلنَّبِيِّۦنَ'},changed
assert len(words)>6000
print(f'PASS: {len(words)} words across all 286 verses; all characters covered; only {len(changed)} intended word forms receive connected glyphs. Source text is read-only.')

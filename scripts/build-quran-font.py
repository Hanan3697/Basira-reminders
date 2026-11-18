# Builds an OFL-licensed Amiri derivative with visual ligatures only.
# Quran JSON and rendered DOM text remain unchanged.
# Amiri documents internal small yeh as tatweel + U+06E7.
# This font accepts the existing U+06E6 encoding without rewriting the source.
import json,re,unicodedata,itertools
from html.parser import HTMLParser
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.otlLib.builder import buildLigatureSubstSubtable
from fontTools.ttLib.tables import otTables
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'public/AmiriQuran.ttf'; data=source.read_bytes(); f=TTFont(source,recalcTimestamp=False)
# Legacy QuranEnc excerpts encode open dammatan as U+065E. Its intended
# reading was checked against every cited verse. Alias the glyph, not the text.
for table in f['cmap'].tables:
 if table.isUnicode():table.cmap[0x065e]=table.cmap[0x08f1]
cmap=f.getBestCmap(); names=f.getGlyphOrder();gs=f.getGlyphSet()
face=hb.Face(data);font=hb.Font(face);font.scale=(face.upem,face.upem)
# Only the glyph representation of an internal small yeh is adapted, per Amiri docs.
pat=re.compile(r'([\u0626\u0628\u062a-\u062e\u0633-\u063a\u0641-\u0647\u0649\u064a])([\u064b-\u065f\u0670\u06d6-\u06e4\u06e7-\u06ed]*)\u06e6(?=[\u064b-\u065f\u0670\u06d6-\u06e4\u06e7-\u06ed]*[\u0626-\u064a])')
strings=[]
def collect(obj):
 if isinstance(obj,str):strings.append(obj)
 elif isinstance(obj,list):
  for v in obj:collect(v)
 elif isinstance(obj,dict):
  for v in obj.values():collect(v)
for path in [root/'public/quran.json',root/'public/data/muyassar.json']:
 collect(json.loads(path.read_text()))
class QuranHTML(HTMLParser):
 def handle_data(self,text):strings.append(text)
for path in (root/'public').rglob('*.html'):
 parser=QuranHTML();parser.feed(path.read_text())
words=sorted({w for s in strings for w in s.split() if pat.search(w)},key=lambda w:(-len(w),w))
print('Words',len(words),words[:10])
ligatures={}
for i,word in enumerate(words):
 fixed=pat.sub(r'\1\2ـۧ',word)
 buf=hb.Buffer();buf.add_str(fixed);buf.guess_segment_properties();hb.shape(font,buf)
 pen=TTGlyphPen(gs);x=y=0
 for info,pos in zip(buf.glyph_infos,buf.glyph_positions):
  gs[names[info.codepoint]].draw(TransformPen(pen,(1,0,0,1,x+pos.x_offset,y+pos.y_offset)))
  x+=pos.x_advance;y+=pos.y_advance
 name='basiraJoining'+str(i);f['glyf'][name]=pen.glyph();f['hmtx'].metrics[name]=(x,0)
 normalized=unicodedata.normalize('NFC',word)
 groups=re.findall(r'[^\u064b-\u065f\u0670\u06d6-\u06ed][\u064b-\u065f\u0670\u06d6-\u06ed]*|[\u06e5\u06e6]',normalized)
 variants=['']
 for group in groups:
  marks=group[1:]
  variants=[prefix+group[0]+''.join(tail) for prefix in variants for tail in sorted(set(itertools.permutations(marks)))]
 for variant in [word,normalized,*variants]:
  ligatures[tuple(cmap[ord(c)] for c in variant)]=name
lookup=otTables.Lookup();lookup.LookupType=4;lookup.LookupFlag=0;lookup.SubTable=[buildLigatureSubstSubtable(ligatures)];lookup.SubTableCount=1
lst=f['GSUB'].table.LookupList;idx=len(lst.Lookup);lst.Lookup.append(lookup);lst.LookupCount=len(lst.Lookup)
for feature in f['GSUB'].table.FeatureList.FeatureRecord:
 if feature.FeatureTag=='ccmp':feature.Feature.LookupListIndex.insert(0,idx);feature.Feature.LookupCount+=1
for n in f['name'].names:
 if n.nameID in [1,3,4,6,16]:n.string=('BasiraQuran' if n.nameID==6 else 'Basira Quran').encode(n.getEncoding())
f['maxp'].numGlyphs=len(f.getGlyphOrder())
f.save(root/'public/BasiraQuran.ttf')
print('Saved',len(ligatures))

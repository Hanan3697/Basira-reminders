import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const q=JSON.parse(readFileSync('public/quran.json','utf8'));
assert.equal(q.data.ayahs.length,286);
assert.ok(readFileSync('public/app.js','utf8').includes('quran-basmala'));
console.log('Basira reader assets verified; Cloudflare account setup still required.');

import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const files=readdirSync('public',{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>`${e.parentPath}/${e.name}`.replaceAll('\\','/')).filter(p=>!p.endsWith('/ward-notifications-sw.js')&&!/\/dashboard\.(js|css)$/.test(p)).sort();
const template=readFileSync('scripts/offline-worker.template.js','utf8');
const hash=createHash('sha256').update(template);
for(const path of files)hash.update(path).update(readFileSync(path));
const version=hash.digest('hex').slice(0,16);
writeFileSync('public/ward-notifications-sw.js',template.replace('__VERSION__',version).replace('__FILES__',JSON.stringify(files.map(p=>'/'+p.slice('public/'.length)))));
console.log(`Offline bundle: ${files.length} files, version ${version}`);

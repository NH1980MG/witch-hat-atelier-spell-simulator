import {readFile,mkdir,copyFile,cp} from 'node:fs/promises';
import path from 'node:path';
import {SourceTextModule} from 'node:vm';
const source=process.argv[2],dest=path.resolve('duel'),seen=new Set();
if(!source)throw Error('Pass the local duel directory');
async function moduleFile(relative){
  relative=relative.split('?')[0];if(seen.has(relative))return;seen.add(relative);
  const src=path.resolve(source,relative);if(!src.startsWith(path.resolve(source)+path.sep))throw Error('Unexpected external module');
  const code=await readFile(src,'utf8'),mod=new SourceTextModule(code);
  await mkdir(path.dirname(path.join(dest,relative)),{recursive:true});await copyFile(src,path.join(dest,relative));
  for(const specifier of mod.dependencySpecifiers){if(!specifier.startsWith('.'))throw Error('Unexpected package: '+specifier);await moduleFile(path.join(path.dirname(relative),specifier));}
}
await mkdir(dest,{recursive:true});
for(const file of ['ink-duel.mjs','ink-duel-recognition-worker.mjs'])await moduleFile(file);
for(const file of ['ink-duel.html','ink-duel.css','ink-duel-local.css'])await copyFile(path.join(source,file),path.join(dest,file));
for(const dir of ['assets/brand','assets/symbol-glyphs'])await cp(path.join(source,dir),path.join(dest,dir),{recursive:true});
console.log('Packaged '+seen.size+' game modules, without simulator or hub pages.');

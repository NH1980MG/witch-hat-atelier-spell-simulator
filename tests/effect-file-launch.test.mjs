import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../local-demo/effect-editor/index.html',import.meta.url),'utf8');
test('file launch explains the local server without redirecting or clearing data',()=>{
 const script=html.match(/<script id="fileLaunchGuard">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script,'standalone guard must work even when ES modules are blocked');
 const nodes={stageLabel:{textContent:'Chargement du moteur…'},editorStatus:{textContent:''},fileLaunchHelp:{hidden:true}};
 vm.runInNewContext(script,{location:{protocol:'file:'},document:{getElementById:id=>nodes[id]}});
 assert.equal(nodes.fileLaunchHelp.hidden,false);
 assert.match(nodes.stageLabel.textContent,/serveur local/i);
 nodes.fileLaunchHelp.hidden=true;
 vm.runInNewContext(script,{location:{protocol:'http:'},document:{getElementById:id=>nodes[id]}});
 assert.equal(nodes.fileLaunchHelp.hidden,true);
});

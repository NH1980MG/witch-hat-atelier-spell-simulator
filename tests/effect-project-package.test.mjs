import test from 'node:test';
import assert from 'node:assert/strict';
import { exportProjectPackage, importProjectPackage } from '../local-demo/effect-editor/effect-project-package.mjs';
import { assetHash } from '../local-demo/effect-editor/effect-assets.mjs';
import { createGlbFixture } from './make-effect-glb-fixture.mjs';
test('empty portable project round trip and invalid format rejected',async()=>{
 const state={version:1,symbols:[],compositions:[]},store={get:async()=>null,put:async()=>{}};
 const blob=await exportProjectPackage(state,store);
 assert.deepEqual(await importProjectPackage(blob,store),state);
 await assert.rejects(()=>importProjectPackage(new Blob(['{}']),store));
 await assert.rejects(()=>exportProjectPackage({...state,assetId:'a'.repeat(64)},store));
});
test('portable GLB bytes survive and invalid hash never writes',async()=>{
 const blob=new Blob([createGlbFixture()]),id=await assetHash(await blob.arrayBuffer());
 const records=new Map([[id,{id,name:'fixture.glb',blob}]]),store={get:async id=>records.get(id),put:async r=>records.set(r.id,r)};
 const state={version:1,symbols:[],compositions:[{effectOverrides:{assetId:id}}]};
 const bundle=await exportProjectPackage(state,store);records.clear();
 assert.deepEqual(await importProjectPackage(bundle,store),state);
 assert.deepEqual(new Uint8Array(await records.get(id).blob.arrayBuffer()),new Uint8Array(await blob.arrayBuffer()));
 const raw=JSON.parse(await bundle.text());raw.assets[0].id='0'.repeat(64);records.clear();
 await assert.rejects(()=>importProjectPackage(new Blob([JSON.stringify(raw)]),store));assert.equal(records.size,0);
});

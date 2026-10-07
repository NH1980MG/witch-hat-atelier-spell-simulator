import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGlb } from '../local-demo/effect-editor/effect-glb-validation.mjs';
function glb(json) {
 const text=JSON.stringify(json), bytes=new TextEncoder().encode(text+' '.repeat((4-text.length%4)%4));
 const b=new ArrayBuffer(20+bytes.length),v=new DataView(b);
 v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,b.byteLength,true);
 v.setUint32(12,bytes.length,true);v.setUint32(16,0x4e4f534a,true);new Uint8Array(b,20).set(bytes);return b;
}
test('GLB validates container and forbids external resources',()=>{
 assert.equal(validateGlb(glb({asset:{version:'2.0'}})).asset.version,'2.0');
 assert.throws(()=>validateGlb(new ArrayBuffer(3)));
 assert.throws(()=>validateGlb(glb({asset:{version:'2.0'},images:[{uri:'https://example.com/x.png'}]})));
 assert.throws(()=>validateGlb(glb({asset:{version:'2.0'},buffers:[{uri:'x.bin'}]})));
 const b=glb({asset:{version:'2.0'}});new DataView(b).setUint32(8,1,true);assert.throws(()=>validateGlb(b));
});

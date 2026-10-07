// Local test asset only: a colored tetrahedron with two animation clips.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
export function createGlbFixture() {
const positions=new Float32Array([0,1,0,-1,-1,1,1,-1,1, 0,1,0,1,-1,1,0,-1,-1, 0,1,0,0,-1,-1,-1,-1,1, -1,-1,1,0,-1,-1,1,-1,1]);
const times=new Float32Array([0,1,2]),moves=new Float32Array([0,0,0,0,1,0,0,0,0]),turns=new Float32Array([0,0,0,1,0,1,0,0,0,0,0,-1]);
const arrays=[positions,times,moves,turns];let offset=0;
const views=arrays.map(a=>{const view={buffer:0,byteOffset:offset,byteLength:a.byteLength};offset+=a.byteLength;return view;});
const json={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'Test',mesh:0}],buffers:[{byteLength:offset}],bufferViews:views,
 accessors:[{bufferView:0,componentType:5126,count:12,type:'VEC3',min:[-1,-1,-1],max:[1,1,1]},{bufferView:1,componentType:5126,count:3,type:'SCALAR',min:[0],max:[2]},{bufferView:2,componentType:5126,count:3,type:'VEC3'},{bufferView:3,componentType:5126,count:3,type:'VEC4'}],
 materials:[{pbrMetallicRoughness:{baseColorFactor:[.2,.7,.4,1],metallicFactor:0,roughnessFactor:1}}],meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],
 animations:[{name:'Rebond',samplers:[{input:1,output:2,interpolation:'LINEAR'}],channels:[{sampler:0,target:{node:0,path:'translation'}}]},{name:'Tour',samplers:[{input:1,output:3,interpolation:'LINEAR'}],channels:[{sampler:0,target:{node:0,path:'rotation'}}]}]};
const text=JSON.stringify(json),j=Buffer.from(text+' '.repeat((4-text.length%4)%4)),bin=Buffer.concat(arrays.map(a=>Buffer.from(a.buffer)));
const out=Buffer.alloc(28+j.length+bin.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(j.length,12);out.writeUInt32LE(0x4e4f534a,16);j.copy(out,20);out.writeUInt32LE(bin.length,20+j.length);out.writeUInt32LE(0x004e4942,24+j.length);bin.copy(out,28+j.length);
return out;
}
if(process.argv[1]===fileURLToPath(import.meta.url))await writeFile('/tmp/effect-test-animation.glb',createGlbFixture());

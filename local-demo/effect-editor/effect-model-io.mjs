import * as THREE from '../../vendor/three/three.module.js';
import { GLTFLoader } from '../../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from '../../vendor/three/examples/jsm/exporters/GLTFExporter.js';
import { validateGlb } from './effect-glb-validation.mjs';
export async function loadGlb(buffer) {
  validateGlb(buffer);
  const manager=new THREE.LoadingManager();
  manager.setURLModifier(url=>{
    if(!/^(blob:|data:)/i.test(url)) throw new Error('Ressource externe interdite.');
    return url;
  });
  return new GLTFLoader(manager).parseAsync(buffer,'');
}
export const exportGlb = (object,animations=[]) => new GLTFExporter().parseAsync(object,{binary:true,animations});
export function disposeModel(object) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  object?.traverse(o=>{
    if(o.geometry) geometries.add(o.geometry);
    for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)) {
      materials.add(m); for(const v of Object.values(m)) if(v?.isTexture) textures.add(v);
    }
  });
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.source?.data?.close?.();t.dispose();});
}

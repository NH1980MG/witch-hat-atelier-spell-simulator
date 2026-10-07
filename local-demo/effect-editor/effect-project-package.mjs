import { assetHash } from './effect-assets.mjs';
import { validateGlb } from './effect-glb-validation.mjs';
const MAX_PACKAGE=150*1024*1024;
function assetIds(state) {
 const ids=new Set();
 function visit(v) {if(!v||typeof v!=='object')return;if(typeof v.assetId==='string'&&v.assetId)ids.add(v.assetId);for(const x of Object.values(v))visit(x);}
 visit(state);return ids;
}
export async function exportProjectPackage(state,store) {
 const assets=[];let size=0;
 for(const id of assetIds(state)) {
  const record=await store.get(id);if(!record)throw new Error('Modèle manquant : rattachez son GLB avant la sauvegarde complète.');
  const buffer=await record.blob.arrayBuffer();validateGlb(buffer);size+=buffer.byteLength*4/3;
  if(size>MAX_PACKAGE)throw new Error('Sauvegarde supérieure à 150 Mo.');
  const bytes=new Uint8Array(buffer);let binary='';
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  assets.push({id,name:record.name,base64:btoa(binary)});
 }
 const blob=new Blob([JSON.stringify({format:'circle-commons-effects',version:1,state,assets})],{type:'application/json'});
 if(blob.size>MAX_PACKAGE)throw new Error('Sauvegarde supérieure à 150 Mo.');return blob;
}
export async function importProjectPackage(blob,store) {
 if(blob.size>MAX_PACKAGE)throw new Error('Sauvegarde supérieure à 150 Mo.');
 const raw=JSON.parse(await blob.text());
 if(raw.format!=='circle-commons-effects'||raw.version!==1||raw.state?.version!==1||!Array.isArray(raw.state.symbols)||!Array.isArray(raw.state.compositions)||!Array.isArray(raw.assets))throw new Error('Sauvegarde complète invalide.');
 const records=[],seen=new Set();
 for(const a of raw.assets) {
  if(typeof a?.base64!=='string')throw new Error('Asset invalide.');
  const binary=atob(a.base64),buffer=Uint8Array.from(binary,c=>c.charCodeAt(0)).buffer;validateGlb(buffer);
  const id=await assetHash(buffer);if(a.id!==id)throw new Error('Empreinte du modèle incorrecte.');
  seen.add(id);records.push({id,name:String(a.name||'modele.glb').slice(0,200),blob:new Blob([buffer])});
 }
 for(const id of assetIds(raw.state))if(!seen.has(id)&&!await store.get(id))throw new Error('La sauvegarde ne contient pas tous ses modèles.');
 for(const record of records)await store.put(record);
 return raw.state;
}

export const MAX_GLB_BYTES = 50 * 1024 * 1024;
export function validateGlb(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20 || buffer.byteLength > MAX_GLB_BYTES) throw new Error('GLB invalide ou supérieur à 50 Mo.');
  const v = new DataView(buffer);
  if (v.getUint32(0,true)!==0x46546c67 || v.getUint32(4,true)!==2 || v.getUint32(8,true)!==buffer.byteLength) throw new Error('En-tête GLB invalide.');
  let json=null, offset=12;
  while(offset<buffer.byteLength) {
    if(offset+8>buffer.byteLength) throw new Error('GLB tronqué.');
    const n=v.getUint32(offset,true), type=v.getUint32(offset+4,true);
    if(n%4 || offset+8+n>buffer.byteLength) throw new Error('Bloc GLB invalide.');
    if(offset===12 && type!==0x4e4f534a) throw new Error('Description GLB manquante.');
    if(type===0x4e4f534a) {
      if(json) throw new Error('Description GLB dupliquée.');
      json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset+8,n)));
    }
    offset+=8+n;
  }
  if(json?.asset?.version!=='2.0') throw new Error('Version glTF non prise en charge.');
  for(const item of [...(json.buffers||[]),...(json.images||[])]) {
    if(item.uri && !/^data:/i.test(item.uri)) throw new Error('Exportez un GLB autonome : les ressources externes sont interdites.');
  }
  for(const ext of json.extensionsRequired||[]) if(['KHR_draco_mesh_compression','KHR_texture_basisu','EXT_meshopt_compression'].includes(ext)) throw new Error(`Compression ${ext} non prise en charge : réexportez sans compression.`);
  return json;
}

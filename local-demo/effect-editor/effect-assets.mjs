export const assetHash = async buffer => [...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(v=>v.toString(16).padStart(2,'0')).join('');
export function createAssetStore(factory = globalThis.indexedDB) {
  let opening;
  function open() {
    return opening ||= new Promise((resolve,reject)=>{
      if(!factory) {reject(new Error('Stockage local indisponible.'));return;}
      const r=factory.open('circleCommons.effectAssets',1);
      r.onupgradeneeded=()=>r.result.createObjectStore('assets',{keyPath:'id'});
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
    });
  }
  async function request(method,value,write=false) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('assets',write?'readwrite':'readonly'),r=tx.objectStore('assets')[method](value);
      tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Stockage annulé.'));
    });
  }
  return {put:record=>request('put',record,true),get:id=>request('get',id),remove:id=>request('delete',id,true),list:()=>request('getAll')};
}
export const assetStore = createAssetStore();

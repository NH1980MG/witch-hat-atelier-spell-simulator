import { Quaternion, Euler } from '../../vendor/three/three.module.js';
const clamp = (n, min, max, fallback) => Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
const vector = (v, fallback, min, max) => [0,1,2].map(i => clamp(v?.[i], min, max, fallback));
export function normalizeAnimation(raw = {}, partIds = []) {
  const duration = clamp(raw?.duration, .1, 60, 6), seen = new Set();
  const tracks = (Array.isArray(raw?.tracks) ? raw.tracks : []).filter(t => {
    if (!t || (t.target !== 'object' && !partIds.includes(t.target)) || seen.has(t.target)) return false;
    seen.add(t.target); return true;
  }).slice(0,33).map(t => {
    const keys = new Map();
    for (const k of (Array.isArray(t.keys) ? t.keys : []).slice(0,128)) {
      if (!k || !Number.isFinite(k.time)) continue;
      const time = clamp(k.time,0,duration,0);
      keys.set(time,{time,position:vector(k.position,0,-4,4),rotation:vector(k.rotation,0,-180,180),scale:vector(k.scale,1,.05,4),visible:k.visible!==false,shape:['sphere','box','cone','cylinder','torus','crystal'].includes(k.shape)?k.shape:''});
    }
    return {target:t.target,interpolation:['smooth','step'].includes(t.interpolation)?t.interpolation:'linear',keys:[...keys.values()].sort((a,b)=>a.time-b.time)};
  });
  return {duration,loop:raw?.loop !== false,tracks};
}
export function sampleTrack(track, time) {
  const keys=track.keys;
  if (!keys.length) return null;
  if(time<=keys[0].time) return structuredClone(keys[0]);
  const b=keys.find(k=>k.time>=time);
  if(!b) return structuredClone(keys.at(-1));
  if(time===b.time) return structuredClone(b);
  const a=keys[keys.indexOf(b)-1];
  if(track.interpolation==='step') return structuredClone(a);
  let t=(time-a.time)/(b.time-a.time);
  if(track.interpolation==='smooth') t=t*t*(3-2*t);
  const result={time,visible:a.visible!==false,shape:a.shape||''};
  for(const field of ['position','rotation','scale']) result[field]=a[field].map((v,i)=>v+(b[field][i]-v)*t);
  const q = rotation => new Quaternion().setFromEuler(new Euler(...rotation.map(n=>n*Math.PI/180)));
  const rotation = new Euler().setFromQuaternion(q(a.rotation).slerp(q(b.rotation),t));
  result.rotation = [rotation.x,rotation.y,rotation.z].map(n=>n*180/Math.PI);
  return result;
}

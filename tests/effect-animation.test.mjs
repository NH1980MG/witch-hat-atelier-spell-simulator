import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnimation, sampleTrack } from '../local-demo/effect-editor/effect-animation-model.mjs';
import { normalizeParts } from '../local-demo/effect-editor/effect-authoring-model.mjs';
test('stable unique part identities survive removal', () => {
  const parts = normalizeParts([{id:'a',type:'box'}, {id:'b',type:'sphere'}]);
  assert.equal(normalizeParts(parts.slice(1))[0].id, 'b');
  assert.equal(new Set(normalizeParts([...parts,parts[0]]).map(p=>p.id)).size,3);
});
test('rotation interpolates the shortest quaternion path',()=>{
 const a=normalizeAnimation({duration:2,tracks:[{target:'object',keys:[{time:0,rotation:[0,0,170]},{time:2,rotation:[0,0,-170]}]}]},[]);
 assert.ok(Math.abs(Math.abs(sampleTrack(a.tracks[0],1).rotation[2])-180)<.0001);
});
test('keyframes normalize and interpolate without mutation', () => {
  const a = normalizeAnimation({duration:2,tracks:[{target:'object',keys:[{time:2,position:[2,0,0]},{time:0,position:[0,0,0]}]}]}, []);
  assert.equal(sampleTrack(a.tracks[0],1).position[0],1);
  assert.equal(sampleTrack(a.tracks[0],9).position[0],2);
  assert.equal(a.tracks[0].keys[0].time,0);
  assert.equal(normalizeAnimation({tracks:[{target:'missing',keys:[{}]}]},[]).tracks.length,0);
});

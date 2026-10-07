import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAnimation, sampleTrack} from '../local-demo/effect-editor/effect-animation-model.mjs';
import {projectMotionPoint, moveMotionPoint} from '../local-demo/effect-editor/effect-motion-views.mjs';

test('two views preserve the hidden coordinate', () => {
  const p={x:1,y:2,z:3};
  assert.deepEqual(projectMotionPoint(p,'top'),{x:200,y:40});
  assert.deepEqual(moveMotionPoint(p,{x:80,y:120},'top'),{x:-2,y:2,z:1});
  assert.deepEqual(moveMotionPoint(p,{x:160,y:80},'front'),{x:0,y:2,z:3});
});
test('timeline retains visibility and shape, switching exactly at a key', () => {
  const a=normalizeAnimation({tracks:[{target:'p',keys:[{time:0,visible:false,shape:'sphere'},{time:2,visible:true,shape:'box'}]}]},['p']);
  const t=a.tracks[0];
  assert.equal(sampleTrack(t,1).visible,false);
  assert.equal(sampleTrack(t,1).shape,'sphere');
  assert.equal(sampleTrack(t,2).visible,true);
  assert.equal(sampleTrack(t,2).shape,'box');
});
test('instant transitions hold transforms and legacy keys remain visible', () => {
  const t=normalizeAnimation({tracks:[{target:'object',interpolation:'step',keys:[{time:0,position:[0,0,0]},{time:2,position:[2,0,0]}]}]}).tracks[0];
  assert.equal(sampleTrack(t,1).position[0],0);
  assert.equal(sampleTrack(t,2).position[0],2);
  assert.equal(sampleTrack(t,1).visible,true);
});

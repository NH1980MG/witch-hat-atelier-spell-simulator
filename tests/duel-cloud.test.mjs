import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch} from '../duel/ink-duel-engine.mjs';
import {applySeatAction} from '../duel/ink-duel-online.mjs';
import {encodeSnapshot,decodeSnapshot} from '../duel/ink-duel-wire.mjs';
test('duel cloud round-trip preserves fine ink and rejects oversized messages',async()=>{
  const s=createMatch({ai:false}),templates=[[],[]];
  assert.ok(applySeatAction(s,templates,1,1,{type:'stroke',points:[{x:30,y:14},{x:30.01,y:14.05},{x:30.03,y:14}]}).ok);
  assert.equal(s.strokes[0].owner,1);assert.equal(s.players[0].x,18);
  const restored=await decodeSnapshot(await encodeSnapshot(s));assert.deepEqual(restored,s);
  assert.equal(applySeatAction(s,templates,0,1,{type:'erase',point:{x:30,y:14}}).ok,false);
  await assert.rejects(()=>decodeSnapshot('x'.repeat(470001)));
});
test('duel seats cannot use the other player template allowance',()=>{
  const s=createMatch({ai:false}),templates=[[],[]];
  assert.ok(applySeatAction(s,templates,0,1,{type:'stamp',name:'Feu',point:{x:20,y:14}}).ok);
  assert.ok(applySeatAction(s,templates,1,1,{type:'stamp',name:'Feu',point:{x:28,y:14}}).ok);
  assert.equal(applySeatAction(s,templates,1,2,{type:'stamp',name:'Feu',point:{x:28,y:16}}).ok,false);
  assert.equal(s.glyphs.length,2);
});

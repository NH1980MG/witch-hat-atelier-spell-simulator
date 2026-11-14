import test from 'node:test';
import assert from 'node:assert/strict';
import { DUEL_CATALOG, compileDuelRecipe } from '../ink-duel-catalog.mjs';
import { createMatch, command, stepMatch, damageSegment, advanceMatch } from '../ink-duel-engine.mjs';
import { PRESETS } from '../ink-duel-catalog.mjs';
import { createDuelPhysics } from '../ink-duel-world.mjs';

test('every catalogue entry has a policy and unknown powers cannot fire', () => {
  assert.equal(DUEL_CATALOG.length, 69);
  assert.ok(DUEL_CATALOG.every(x => x.status && x.reason));
  for (const name of ['Radial', 'Glaives', 'Aeriforme defini', 'Signe de vent']) {
    assert.throws(() => compileDuelRecipe({sigil:'Feu', signs:[name]}));
  }
  assert.throws(() => compileDuelRecipe({sigil:'Feu', signs:['Crush']}));
  assert.throws(() => compileDuelRecipe({sigil:'Feu', signs:['Fenetres']}));
});
test('signs and inversions produce different executable recipes', () => {
  const jet = compileDuelRecipe({sigil:'Eau', signs:['Collection','Colonne','Viseur']});
  const rain = compileDuelRecipe({sigil:'Eau', signs:['Pluie','Region']});
  assert.equal(jet.shape, 'column'); assert.equal(rain.shape,'rain');
  assert.ok(jet.ops.includes('collect'));
  assert.ok(compileDuelRecipe({sigil:'Vent',signs:[{name:'Traction',inverted:true}]}).ops.includes('push'));
});
test('territory and resource checks are atomic', () => {
  const s=createMatch(); const ink=s.players[0].ink;
  assert.equal(command(s,{type:'place',owner:0,x:20,y:7,recipe:{sigil:'Feu',signs:[]}}).ok,false);
  assert.equal(s.players[0].ink,ink); assert.equal(s.seals.length,0);
});
test('localized standard ink takes twenty seconds of standard fire', () => {
  const s=createMatch(); command(s,{type:'stroke',owner:0,points:[{x:4,y:5},{x:5,y:5}]});
  const line=s.strokes[0], a=line.segments[0], b=line.segments[1];
  for(let i=0;i<19;i++) damageSegment(s,a,5);
  assert.equal(a.hp,5); assert.equal(b.hp,100);
  damageSegment(s,a,5); assert.equal(a.hp,0);
});
test('ring breach stops emission and restored ring can activate again', () => {
  const s=createMatch(); command(s,{type:'place',owner:0,x:9,y:7,recipe:{sigil:'Feu',signs:['Colonne']}});
  const seal=s.seals[0]; const seg=s.strokes.find(x=>x.id===seal.strokeId).segments[0];
  command(s,{type:'start'}); command(s,{type:'activate',owner:0,id:seal.id});
  advanceMatch(s,1.1); assert.equal(seal.active,true);
  damageSegment(s,seg,100); stepMatch(s,1/60); assert.equal(seal.active,false);
  seg.hp=100; assert.equal(command(s,{type:'activate',owner:0,id:seal.id}).ok,true);
});
test('ink cap, duration and deterministic timeout', () => {
  const s=createMatch({ai:false}); command(s,{type:'start'});
  advanceMatch(s,361); assert.equal(s.phase,'ended'); assert.equal(s.winner,'draw');
  assert.equal(s.players[0].ink,150);
});
test('repetition cannot restore inkwells or generate ink', () => {
  const s=createMatch(); s.players[0].hp=123;
  command(s,{type:'place',owner:0,x:3,y:7,recipe:{sigil:'Repetition',signs:['Region']}});
  command(s,{type:'start'}); command(s,{type:'activate',owner:0,id:s.seals[0].id});
  advanceMatch(s,5); assert.equal(s.players[0].hp,123);
});

function effect(sigil,signs=[],x=7,y=7,mode='standard'){
  const recipe=compileDuelRecipe({sigil,signs},mode);
  return {id:99,owner:0,source:-1,x,y,px:x,py:y,vx:0,vy:0,radius:2,life:10,age:0,travel:0,recipe,power:recipe.power,angle:0,color:recipe.color};
}
test('water extinguishes fire before it can keep burning a stroke',()=>{
  const s=createMatch({ai:false});command(s,{type:'stroke',owner:1,points:[{x:14,y:7},{x:15,y:7}]});command(s,{type:'start'});
  s.effects.push(effect('Feu',[],14,7),effect('Eau',[],14,7));advanceMatch(s,1);
  assert.ok(s.strokes[0].segments[0].hp>99);assert.equal(s.effects.filter(x=>x.recipe.family==='fire').length,0);
});
test('stop uses the catalogue family and applies a bounded immunity window',()=>{
  const s=createMatch({ai:false,mode:'experimental'});command(s,{type:'place',owner:1,x:14,y:7,recipe:PRESETS[0]});command(s,{type:'start'});
  s.effects.push(effect('Arret temporel',[],14,7,'experimental'));stepMatch(s);
  const seal=s.seals[0];assert.ok(seal.stoppedUntil>s.time);assert.ok(seal.stoppedUntil<=s.time+1.5);const stop=seal.stoppedUntil;
  advanceMatch(s,2);assert.equal(seal.stoppedUntil,stop);assert.ok(seal.immuneUntil>s.time);
});
test('smoke conceals and light reveals targets without causing damage',()=>{
  const s=createMatch({ai:false});command(s,{type:'place',owner:1,x:14,y:7,recipe:PRESETS[0]});command(s,{type:'start'});
  s.effects.push(effect('Fumee',[],14,7));stepMatch(s);assert.ok(s.seals[0].hiddenUntil>s.time);
  s.effects.push(effect('Lumiere',[],14,7));stepMatch(s);assert.ok(s.seals[0].revealedUntil>s.time);assert.equal(s.players[1].hp,300);
});
test('construction consumes finite matter and Collection reduces upkeep',()=>{
  const make=signs=>{const s=createMatch({ai:false});command(s,{type:'place',owner:0,x:7,y:7,recipe:{sigil:'Eau',signs}});command(s,{type:'start'});command(s,{type:'activate',owner:0,id:s.seals[0].id});s.players[0].ink=50;return s;};
  const a=make(['Collection','Colonne']),b=make(['Colonne']);advanceMatch(a,4);advanceMatch(b,4);
  assert.ok(a.resources[0].amount<120);assert.ok(a.players[0].ink>b.players[0].ink);
});
test('linked solid manifestations share a source and velocities',()=>{
  const s=createMatch({ai:false});command(s,{type:'place',owner:0,x:7,y:7,recipe:{sigil:'Terre',signs:['Lien','Projection']}});command(s,{type:'start'});command(s,{type:'activate',owner:0,id:s.seals[0].id});advanceMatch(s,1.6);
  const group=s.objects.filter(o=>o.source===s.seals[0].id);assert.equal(group.length,3);assert.ok(group.every(o=>o.vx>0));
});
test('repair spends ink and incoming fire interrupts it',()=>{
  const s=createMatch({ai:false});command(s,{type:'stroke',owner:0,points:[{x:4,y:5},{x:5,y:5}]});const seg=s.strokes[0].segments[0];seg.hp=50;
  command(s,{type:'repair',owner:0,point:seg.a});const before=s.players[0].ink;advanceMatch(s,1);assert.ok(seg.hp>57);assert.ok(s.players[0].ink<before);
  damageSegment(s,seg,5);const hp=seg.hp;advanceMatch(s,.2);assert.equal(seg.hp,hp);
});
test('a complete seeded battle is deterministic and arrays stay bounded',()=>{
  const play=()=>{const s=createMatch({seed:42});command(s,{type:'place',owner:0,x:10,y:7,recipe:PRESETS[0]});command(s,{type:'start'});command(s,{type:'activate',owner:0,id:s.seals[0].id});advanceMatch(s,365);return s;};
  const a=play(),b=play();assert.equal(a.phase,'ended');assert.deepEqual(a.players,b.players);assert.ok(a.effects.length<=350);assert.ok(a.objects.length<70);assert.ok(a.players.some(p=>p.hp<300));
});
test('Rapier prevents two moving solids from passing through one another',async()=>{
  const physics=await createDuelPhysics();try{const objects=[{id:1,x:5,y:7,vx:2,vy:0,r:.5,mass:2,hp:100,height:0},{id:2,x:6.5,y:7,vx:-2,vy:0,r:.5,mass:2,hp:100,height:0}];
    for(let i=0;i<60;i++)physics.step(objects,1/60);assert.ok(objects[0].x<objects[1].x);assert.ok(objects[1].x-objects[0].x>.9);
  }finally{physics.dispose();}
});
test('opponent repairs a broken interior ring segment rather than its intact neighbour',()=>{
  const s=createMatch();advanceMatch(s,5);const seg=s.strokes[0].segments[1];damageSegment(s,seg,100);advanceMatch(s,3);assert.ok(seg.hp>0);
});
test('solid projectiles cannot damage a well outside the compiled range',()=>{
  const s=createMatch({ai:false});command(s,{type:'place',x:7,y:7,recipe:{sigil:'Terre',signs:['Projectile','Viseur']}});
  command(s,{type:'start'});command(s,{type:'activate',id:s.seals[0].id});advanceMatch(s,8);assert.equal(s.players[1].hp,300);
});
test('Traction and inversion pull and repel emitted matter in opposite directions',()=>{
  const velocity=inverted=>{const s=createMatch({ai:false});command(s,{type:'start'});const target=effect('Eau',[],8,7);target.owner=1;
    s.effects.push(effect('Eau',[{name:'Traction',inverted}],7,7),target);stepMatch(s);return target.vx;};
  assert.ok(velocity(false)<0);assert.ok(velocity(true)>0);
});
test('recomposition costs ink, retains ring damage and refuses active circles',()=>{
  const s=createMatch({ai:false});command(s,{type:'place',x:7,y:7,recipe:PRESETS[0]});const seal=s.seals[0],seg=s.strokes[0].segments[0];seg.hp=40;
  const before=s.players[0].ink;assert.equal(command(s,{type:'recompose',id:seal.id,recipe:PRESETS[1]}).ok,true);assert.ok(s.players[0].ink<before);assert.equal(seg.hp,40);
  seal.active=true;assert.equal(command(s,{type:'recompose',id:seal.id,recipe:PRESETS[0]}).ok,false);
});

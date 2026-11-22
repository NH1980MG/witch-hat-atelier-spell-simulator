import assert from 'node:assert/strict';
import {OnlineDuel} from '../duel/ink-duel-online.mjs';
const states=[null,null],errors=[];
const peers=[0,1].map(i=>new OnlineDuel(s=>states[i]=s,(text,failed)=>{if(failed)errors.push(text);}));
async function until(predicate){const start=Date.now();while(!predicate()){if(errors.length)throw Error(errors.join('; '));if(Date.now()-start>18000)throw Error('Cloud test timeout');await new Promise(r=>setTimeout(r,100));}}
try{
  const mode=process.argv[2]==='quick'?'quick':'create';
  const a=await peers[0].join(mode,'');await peers[1].join(mode==='quick'?'quick':'join',a.code);
  await until(()=>peers.every(p=>p.players===2)&&states.every(Boolean));
  assert.equal(peers[0].code,peers[1].code);
  assert.ok(peers[1].action(states[1],{type:'stroke',points:[{x:30,y:16},{x:31,y:16}]}).ok);
  await until(()=>states[0].strokes.length===1&&states[1].strokes.length===1&&peers[1].actions.size===0);
  assert.equal(states[0].strokes[0].owner,1);assert.equal(states[1].strokes[0].owner,0);
  await peers[0].ready();await peers[1].ready();await until(()=>states.every(s=>s.phase==='combat'));
  assert.ok(peers[1].action(states[1],{type:'move-well',dx:0,dy:1,dt:.05}).ok);
  await until(()=>states[0].players[1].y>14);
  console.log('PASS: '+mode+' pairing, stroke ownership, readiness, shared combat, movement');
}finally{await Promise.all(peers.map(p=>p.leave()));}

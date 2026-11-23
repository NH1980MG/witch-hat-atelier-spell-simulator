import {command} from './ink-duel-engine.mjs';
import {attachGlyph,stampGlyph,syncDrawnSeals} from './ink-duel-freehand.mjs';
import {steerEffect} from './ink-duel-steering.mjs';

export function flipPlayers(s){
  s.players.reverse();s.repairs.reverse();
  for(const list of [s.strokes,s.seals,s.objects,s.effects])for(const item of list)if(item.owner===0||item.owner===1)item.owner=1-item.owner;
  if(s.winner===0||s.winner===1)s.winner=1-s.winner;
}
export function applyOnlineAction(s,action){
  const {type}=action;
  if(type==='glyph'){
    const r=action.rect;
    if(!r||![r.x,r.y,r.w,r.h,action.orientation??0].every(Number.isFinite)||r.w<=0||r.h<=0||r.w>8||r.h>8||!Array.isArray(action.strokeIds)||action.strokeIds.length>512)return {ok:false,message:'Perimetre invalide'};
    if(action.strokeIds.some(id=>!s.strokes.some(st=>st.id===id&&st.owner===0)))return {ok:false,message:'Traits invalides'};
    return attachGlyph(s,action);
  }
  if(type==='stamp')return stampGlyph(s,action.name,action.point);
  if(type==='sync'){syncDrawnSeals(s);return {ok:true};}
  if(type==='steer')return {ok:steerEffect(s,action.source,action.dx,action.dy)};
  if(!['stroke','erase','move-ink','move-well','position-well','repair','aim','rotate','activate','remove'].includes(type))return {ok:false,message:'Action indisponible en ligne'};
  return command(s,{...action,owner:0});
}

import { distance, makeStroke } from './ink-duel-strokes.mjs';
import { compileDuelRecipe, DUEL_CATALOG } from './ink-duel-catalog.mjs';
import { SYMBOL_PATHS } from './symbol-catalog.mjs';
import { flattenSvgPath } from './stroke-matcher.mjs';
import {canWrite,scaleRecipe} from './ink-duel-scale.mjs';

export const CLOSE_GAP=.16;
export function templateStrokes(name,rect){return (SYMBOL_PATHS[name]||[]).flatMap(p=>flattenSvgPath(p)).map(points=>points.map(([x,y])=>({x:rect.x+x/48*rect.w,y:rect.y+y/48*rect.h}))).filter(points=>points.length>1);}
export function stampGlyph(s,name,point){
  const entry=DUEL_CATALOG.find(x=>x.name===name);
  if(s.paused||s.phase==='ended'||!entry||entry.status==='unavailable'||entry.status==='experimental'&&s.mode!=='experimental')return {ok:false,message:'Exemple indisponible'};
  if(s.usedTemplates.includes(name))return {ok:false,message:'Cet exemple a deja ete utilise dans cette partie'};
  const rect={x:point.x-.6,y:point.y-.6,w:1.2,h:1.2},paths=templateStrokes(name,rect);
  if(!paths.length||paths.some(ps=>ps.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>s.rules.width||p.y<0||p.y>s.rules.height)))return {ok:false,message:'Emplacement hors de la toile'};
  const cost=paths.reduce((sum,ps)=>sum+ps.reduce((n,p,i)=>n+(i?distance(p,ps[i-1])*2:0),0),0);
  if(!canWrite(s,0,paths.flat()))return {ok:false,message:'Rapprochez votre encrier : portee de dessin 8 unites'};
  const strokes=paths.map((points,i)=>makeStroke(s.nextId+i,0,points)).filter(st=>st.segments.length);
  if(s.players[0].ink<cost||s.strokes.length+strokes.length>s.rules.maxStrokes)return {ok:false,message:'Encre ou capacite insuffisante'};
  s.players[0].ink-=cost;s.nextId+=paths.length;s.strokes.push(...strokes);
  const result=attachGlyph(s,{name,rect,strokeIds:strokes.map(st=>st.id)});
  if(result.ok)s.usedTemplates.push(name);
  return result;
}
export function rectangle(a,b){return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)};}
export function insideRect(p,r){return p.x>=r.x&&p.y>=r.y&&p.x<=r.x+r.w&&p.y<=r.y+r.h;}
export function inPolygon(p,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }return inside;
}
export function strokePoints(stroke){return stroke.segments.length?[stroke.segments[0].a,...stroke.segments.map(x=>x.b)]:[];}
export function ringGeometry(points){
  if(points.length<12||distance(points[0],points.at(-1))>CLOSE_GAP)return null;
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const w=maxX-minX,h=maxY-minY;if(w<1||h<1||w/h>2.8||h/w>2.8)return null;
  let area=0,length=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a.x*b.y-b.x*a.y;length+=distance(a,b);}
  area=Math.abs(area)/2;if(area<.6||4*Math.PI*area/(length*length)<.45)return null;
  return {x:(minX+maxX)/2,y:(minY+maxY)/2,radius:Math.max(w,h)/2,area,points:points.map(p=>({...p}))};
}
// Join only endpoint-adjacent unlabelled strokes. Never close an arbitrary open arc.
export function findClosedRings(strokes){
  const available=strokes.filter(s=>s.owner===0&&!s.glyphId&&!s.regionId&&!s.sealId&&s.segments.length),used=new Set(),rings=[];
  for(const start of available){
    if(used.has(start.id))continue;
    let points=strokePoints(start),ids=[start.id],geometry=ringGeometry(points);
    for(let n=0;!geometry&&n<24;n++){
      const last=points.at(-1);let next=null,reverse=false,best=CLOSE_GAP;
      for(const candidate of available){if(used.has(candidate.id)||ids.includes(candidate.id))continue;const p=strokePoints(candidate);
        for(const [end,flip]of [[p[0],false],[p.at(-1),true]]){const d=distance(last,end);if(d<=best){best=d;next=candidate;reverse=flip;}}
      }
      if(!next)break;let extra=strokePoints(next);if(reverse)extra=extra.reverse();points=points.concat(extra);ids.push(next.id);geometry=ringGeometry(points);
    }
    if(geometry){ids.forEach(id=>used.add(id));rings.push({...geometry,strokeIds:ids});}
  }return rings;
}
export function syncDrawnSeals(s){
  const messages=[];
  for(const ring of findClosedRings(s.strokes)){
    const glyphs=(s.glyphs||[]).filter(g=>!g.sealId&&inPolygon(g,ring.points));
    const sigils=glyphs.filter(g=>DUEL_CATALOG.find(e=>e.name===g.name)?.kind==='sigil');
    if(sigils.length!==1)continue;
    const signs=glyphs.filter(g=>DUEL_CATALOG.find(e=>e.name===g.name)?.kind==='sign');
    let recipe;try{recipe=compileDuelRecipe({sigil:sigils[0].name,signs:signs.map(g=>({name:g.name,inverted:false}))},s.mode);}catch(e){messages.push(e.message);continue;}
    recipe=scaleRecipe(recipe,sigils[0].inkSize);
    const id=s.nextId++,nodeGlyphs=[sigils[0],...signs];
    const seal={id,owner:0,x:ring.x,y:ring.y,radius:ring.radius,polygon:ring.points,drawn:true,strokeId:ring.strokeIds[0],ringStrokeIds:ring.strokeIds,
      glyphStrokeIds:glyphs.flatMap(g=>g.strokeIds),recipe,angle:0,active:false,charging:0,pulse:0,stoppedUntil:0,immuneUntil:0,
      target:{...s.players[1]},nodes:nodeGlyphs.map(g=>({x:g.x,y:g.y,hp:100,maxHp:100,lastHit:-1000,kind:g===sigils[0]?'sigil':'sign',name:g.name}))};
    if(s.seals.filter(x=>x.owner===0).length>=s.rules.maxSeals){messages.push('Limite de cercles atteinte');break;}
    s.seals.push(seal);for(const st of s.strokes)if([...seal.ringStrokeIds,...seal.glyphStrokeIds].includes(st.id))st.sealId=id;
    glyphs.forEach(g=>g.sealId=id);messages.push(`Cercle ferme : ${recipe.sigil}`);
  }
  // Newly drawn signs can extend an inactive circle, without replacing its real ink.
  for(const seal of s.seals.filter(x=>x.drawn&&!x.active&&!x.charging)){
    const additions=s.glyphs.filter(g=>!g.sealId&&inPolygon(g,seal.polygon));if(!additions.length)continue;
    try{
      if(additions.some(g=>DUEL_CATALOG.find(e=>e.name===g.name)?.kind!=='sign'))throw Error('Un seul sigil par cercle');
      const recipe=compileDuelRecipe({sigil:seal.recipe.sigil,signs:[...seal.recipe.signs,...additions.map(g=>({name:g.name,inverted:false}))]},s.mode);
      seal.recipe=scaleRecipe(recipe,s.glyphs.find(g=>g.sealId===seal.id&&g.name===seal.recipe.sigil)?.inkSize);for(const g of additions){g.sealId=seal.id;seal.glyphStrokeIds.push(...g.strokeIds);seal.nodes.push({x:g.x,y:g.y,hp:100,maxHp:100,lastHit:-1000,kind:'sign',name:g.name});for(const st of s.strokes)if(g.strokeIds.includes(st.id))st.sealId=seal.id;}
    }catch(e){messages.push(e.message);}
  }
  return messages;
}
export function attachGlyph(s,{name,rect,strokeIds,orientation=0}){
  const entry=DUEL_CATALOG.find(x=>x.name===name);
  if(!entry||entry.status==='unavailable'||entry.status==='experimental'&&s.mode!=='experimental')return {ok:false,message:'Ce symbole est indisponible dans ces regles'};
  const strokes=strokeIds.map(id=>s.strokes.find(st=>st.id===id));
  if(!strokes.length||strokes.some(st=>!st||st.owner!==0||st.glyphId||st.sealId))return {ok:false,message:'Traits invalides ou deja analyses'};
  const glyph={id:s.nextId++,name,x:rect.x+rect.w/2,y:rect.y+rect.h/2,rect:{...rect},strokeIds:[...strokeIds],orientation};
  const bounds={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};
  for(const st of strokes)for(const seg of st.segments)for(const p of [seg.a,seg.b]){bounds.minX=Math.min(bounds.minX,p.x);bounds.maxX=Math.max(bounds.maxX,p.x);bounds.minY=Math.min(bounds.minY,p.y);bounds.maxY=Math.max(bounds.maxY,p.y);}
  glyph.inkSize=Math.max(bounds.maxX-bounds.minX,bounds.maxY-bounds.minY);
  s.glyphs.push(glyph);for(const st of strokes){st.glyphId=glyph.id;delete st.regionId;}
  return {ok:true,glyph,messages:syncDrawnSeals(s)};
}

import { compileDuelRecipe, PRESETS, DUEL_CATALOG } from './ink-duel-catalog.mjs';
import { distance, makeStroke, ringPoints, nearestSegment, segmentDistance } from './ink-duel-strokes.mjs';
import {moveAlongInk,inkBlocks} from './ink-duel-barriers.mjs';
import {canWrite,fadeEffect} from './ink-duel-scale.mjs';

export const RULES=Object.freeze({width:480,height:280,preparation:30,combat:300,overtime:60,health:300,ink:100,inkCap:150,regen:3,step:1/60,maxSeals:18,maxStrokes:400,maxParticles:350});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=n=>Number.isFinite(n);
const has=(r,op)=>r.ops.includes(op);
export function createMatch(options={}){
  return {rules:RULES,mode:options.mode==='experimental'?'experimental':'standard',ai:options.ai!==false,
    seed:(options.seed??8341)>>>0,phase:'preparation',time:0,phaseTime:0,winner:null,paused:false,nextId:1,
    players:[{x:18,y:14,hp:300,ink:100},{x:30,y:14,hp:300,ink:100}],
    strokes:[],glyphs:[],usedTemplates:[],seals:[],effects:[],events:[],repairs:[null,null],aiTime:0,accumulator:0,
    objects:[...[-1,1].flatMap(side=>[9,19].map(y=>({id:`rock-${side}-${y}`,x:24+side*3,y,vx:0,vy:0,r:.7,hp:180,maxHp:180,mass:4,material:'earth',height:0})))],
    resources:[{x:19,y:10,material:'water',amount:120,impurity:1},{x:29,y:18,material:'water',amount:120,impurity:1},
      {x:19,y:18,material:'earth',amount:120,impurity:0},{x:29,y:10,material:'earth',amount:120,impurity:0}],
  };
}
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function event(s,type,x,y,color,amount=1){s.events.push({type,x,y,color,amount});if(s.events.length>100)s.events.shift();}
function territory(owner,p,margin=0){return finite(p.x)&&finite(p.y)&&p.y>=margin&&p.y<=RULES.height-margin&&p.x>=margin&&p.x<=RULES.width-margin;}
function fail(message){return {ok:false,message};}
function activeCount(s,owner){return s.seals.filter(x=>x.owner===owner&&(x.active||x.charging>0)).length;}
function intact(s,seal){const ids=seal.drawn?[...seal.ringStrokeIds,...seal.glyphStrokeIds]:[seal.strokeId];return seal.nodes.every(n=>n.hp>0)&&ids.every(id=>s.strokes.find(x=>x.id===id)?.segments.every(x=>x.hp>0));}
export function command(s,c){
  if(c.type==='pause'){if(s.phase!=='ended')s.paused=!s.paused;return {ok:true};}
  if(s.paused||s.phase==='ended')return fail('Partie en pause ou terminee');
  if(c.type==='start'){if(s.phase==='preparation'){s.phase='combat';s.phaseTime=0;}return {ok:true};}
  const owner=c.owner??0,p=s.players[owner];if(!p)return fail('Joueur invalide');
  if(c.type==='move-ink'){
    const stroke=s.strokes.find(st=>st.id===c.id&&st.owner===0);
    if(owner!==0||!stroke||![c.dx,c.dy].every(finite))return fail('Vous pouvez seulement deplacer vos propres traits');
    const seal=s.seals.find(x=>x.id===stroke.sealId);
    const strokes=seal?s.strokes.filter(st=>st.sealId===seal.id):stroke.glyphId?s.strokes.filter(st=>st.glyphId===stroke.glyphId):[stroke];
    const glyphs=s.glyphs.filter(g=>strokes.some(st=>st.glyphId===g.id));
    const points=new Set(strokes.flatMap(st=>st.segments.flatMap(seg=>[seg.a,seg.b])));
    if(!canWrite(s,owner,[...points].map(p=>({x:p.x+c.dx,y:p.y+c.dy}))))return fail('Rapprochez votre encrier : portee de dessin 8 unites');
    if(seal){points.add(seal);seal.nodes.forEach(n=>points.add(n));seal.polygon?.forEach(p=>points.add(p));}glyphs.forEach(g=>points.add(g));
    if([...points].some(p=>!territory(0,{x:p.x+c.dx,y:p.y+c.dy})))return fail('Deplacement hors de la toile');
    for(const point of points){point.x+=c.dx;point.y+=c.dy;}for(const g of glyphs){g.rect.x+=c.dx;g.rect.y+=c.dy;}
    if(seal){seal.target.x+=c.dx;seal.target.y+=c.dy;}
    return {ok:true};
  }
  if(c.type==='position-well'){
    if(owner!==0||!c.point||!territory(0,c.point,.6))return fail('Emplacement invalide');
    if(s.objects.some(o=>o.hp>0&&o.height<.5&&distance(o,c.point)<o.r+.55)||distance(c.point,s.players[1])<1.2)return fail('Passage bloque');
    p.x=c.point.x;p.y=c.point.y;return {ok:true};
  }
  if(c.type==='erase'){
    if(owner!==0||!c.point||!finite(c.point.x)||!finite(c.point.y))return fail('Vous pouvez seulement effacer vos propres traits');
    const hit=nearestSegment(s,c.point,0,clamp(c.radius||.2,.03,.5));
    if(!hit)return fail('Aucun de vos traits a cet endroit');
    const {stroke}=hit,sealId=stroke.sealId,glyphId=stroke.glyphId;
    s.strokes=s.strokes.filter(st=>st.id!==stroke.id);
    if(sealId){s.seals=s.seals.filter(seal=>seal.id!==sealId);for(const st of s.strokes)if(st.sealId===sealId)st.sealId=null;for(const g of s.glyphs)if(g.sealId===sealId)delete g.sealId;}
    if(glyphId){s.glyphs=s.glyphs.filter(g=>g.id!==glyphId);for(const st of s.strokes)if(st.glyphId===glyphId)delete st.glyphId;}
    return {ok:true,id:stroke.id};
  }
  if(c.type==='move-well'){
    if(owner!==0||![c.dx,c.dy,c.dt].every(finite))return fail('Deplacement invalide');
    const d=Math.hypot(c.dx,c.dy)||1,step=clamp(c.dt,0,.05)*3;
    const next={x:clamp(p.x+c.dx/d*step,.6,RULES.width-.6),y:clamp(p.y+c.dy/d*step,.6,RULES.height-.6)};
    if(s.objects.some(o=>o.hp>0&&o.height<.5&&distance(o,next)<o.r+.55)||distance(next,s.players[1])<1.2)return fail('Passage bloque');
    p.x=next.x;p.y=next.y;return {ok:true};
  }
  if(c.type==='use-template'){
    const entry=DUEL_CATALOG.find(x=>x.name===c.name);if(!entry||entry.status==='unavailable')return fail('Symbole indisponible');
    if(s.usedTemplates.includes(c.name))return fail('Cet exemple a deja ete utilise dans cette partie');
    s.usedTemplates.push(c.name);return {ok:true};
  }
  if(c.type==='place'){
    if(owner===0)return fail('Dessinez un cercle ferme autour de vos symboles');
    if(!territory(owner,c,.85))return fail('Placez le cercle sur la toile');
    if(s.seals.filter(x=>x.owner===owner).length>=RULES.maxSeals)return fail('Limite de cercles atteinte');
    if(s.strokes.length>=RULES.maxStrokes)return fail('Limite de traits atteinte');
    if(s.seals.some(x=>distance(x,c)<1.7))return fail('Cercles trop proches');
    let recipe;try{recipe=compileDuelRecipe(c.recipe,s.mode);}catch(e){return fail(e.message);}
    const cost=recipe.cost+2*Math.PI*.8*2;
    if(p.ink<cost)return fail('Encre insuffisante');
    const id=s.nextId++,strokeId=s.nextId++;
    p.ink-=cost;
    const angle=finite(c.angle)?c.angle:owner===0?0:Math.PI;
    const seal={id,strokeId,owner,x:c.x,y:c.y,angle,recipe,active:false,charging:0,pulse:0,stoppedUntil:0,immuneUntil:0,
      target:{x:s.players[1-owner].x,y:s.players[1-owner].y},nodes:[{x:c.x,y:c.y,hp:100,maxHp:100,lastHit:-1000,kind:'sigil'},
        ...recipe.signs.map((sign,i)=>({x:c.x+Math.cos(i*Math.PI*2/recipe.signs.length)*.58,y:c.y+Math.sin(i*Math.PI*2/recipe.signs.length)*.58,hp:70,maxHp:70,lastHit:-1000,kind:'sign',name:sign.name}))]};
    s.seals.push(seal);s.strokes.push(makeStroke(strokeId,owner,ringPoints(c.x,c.y),1,id));
    event(s,'inscribe',c.x,c.y,recipe.color);
    return {ok:true,id};
  }
  if(c.type==='stroke'){
    if(!Array.isArray(c.points)||c.points.length<2||c.points.length>4096||c.points.some(x=>!territory(owner,x)))return fail('Trace hors de votre territoire');
    if(s.strokes.length>=RULES.maxStrokes)return fail('Limite de traits atteinte');
    if(!canWrite(s,owner,c.points))return fail('Rapprochez votre encrier : portee de dessin 8 unites');
    const thickness=clamp(Number(c.thickness)||1,.5,2);
    const length=c.points.reduce((n,v,i)=>n+(i?distance(v,c.points[i-1]):0),0),cost=length*2*thickness;
    if(length<.05||p.ink<cost)return fail('Encre insuffisante ou trace trop court');
    const stroke=makeStroke(s.nextId++,owner,c.points,thickness);if(!stroke.segments.length)return fail('Trace invalide');
    p.ink-=cost;s.strokes.push(stroke);return {ok:true,id:stroke.id};
  }
  if(c.type==='repair'){s.repairs[owner]=c.point&&territory(owner,c.point)?{owner,point:{...c.point}}:null;return {ok:true};}
  const seal=s.seals.find(x=>x.id===c.id&&x.owner===owner);if(!seal)return fail('Selectionnez votre cercle');
  if(c.type==='recompose'){
    if(seal.drawn)return fail('Ajoutez les signes par dessin dans le cercle');
    if(seal.active||seal.charging)return fail('Arretez le cercle avant de modifier ses signes');
    let recipe;try{recipe=compileDuelRecipe(c.recipe,s.mode);}catch(e){return fail(e.message);}
    if(p.ink<recipe.cost)return fail('Encre insuffisante');
    p.ink-=recipe.cost;seal.recipe=recipe;
    seal.nodes=[{x:seal.x,y:seal.y,hp:100,maxHp:100,lastHit:-1000,kind:'sigil'},...recipe.signs.map((sign,i)=>({x:seal.x+Math.cos(i*Math.PI*2/recipe.signs.length)*.58,y:seal.y+Math.sin(i*Math.PI*2/recipe.signs.length)*.58,hp:70,maxHp:70,lastHit:-1000,kind:'sign',name:sign.name}))];
    event(s,'inscribe',seal.x,seal.y,recipe.color);return {ok:true};
  }
  if(c.type==='remove'){seal.active=false;s.seals=s.seals.filter(x=>x!==seal);s.strokes=s.strokes.filter(x=>x.sealId!==seal.id);return {ok:true};}
  if(c.type==='aim'){
    if(!c.point||!finite(c.point.x)||!finite(c.point.y))return fail('Cible invalide');
    seal.target={x:clamp(c.point.x,0,RULES.width),y:clamp(c.point.y,0,RULES.height)};
    seal.angle=Math.atan2(c.point.y-seal.y,c.point.x-seal.x);return {ok:true};
  }
  if(c.type==='rotate'){
    if(!finite(c.angle))return fail('Angle invalide');
    if(seal.drawn){const delta=c.angle-seal.angle,cos=Math.cos(delta),sin=Math.sin(delta),rot=p=>{const x=p.x-seal.x,y=p.y-seal.y;p.x=seal.x+x*cos-y*sin;p.y=seal.y+x*sin+y*cos;};
      const points=[];for(const st of s.strokes.filter(x=>x.sealId===seal.id))for(const seg of st.segments)points.push(seg.a,seg.b);
      const unique=[...new Set([...points,...seal.nodes,...seal.polygon,...s.glyphs.filter(g=>g.sealId===seal.id)])];
      if(unique.some(p=>{const q={x:p.x,y:p.y};rot(q);return !territory(owner,q);}))return fail('Rotation hors de la toile');
      unique.forEach(rot);
    }
    seal.angle=c.angle;seal.target={x:seal.x+Math.cos(c.angle)*seal.recipe.range,y:seal.y+Math.sin(c.angle)*seal.recipe.range};return {ok:true};
  }
  if(c.type==='activate'){
    if(s.phase==='preparation')return fail('Preparation: les sorts attendent le debut du combat');
    if(seal.active||seal.charging){seal.active=false;seal.charging=0;return {ok:true};}
    if(!intact(s,seal))return fail('Cercle ou symbole brise: reparation necessaire');
    if(activeCount(s,owner)>=3)return fail('Trois cercles actifs maximum');
    if(p.ink<seal.recipe.upkeep)return fail('Encre insuffisante');
    seal.charging=1;return {ok:true};
  }
  return fail('Commande inconnue');
}
export function damageSegment(s,seg,damage){
  if(seg.hp<=0||!finite(damage)||damage<=0)return;
  seg.hp=Math.max(0,seg.hp-damage);seg.lastHit=s.time;
  if(seg.hp===0){const p=seg.a||seg;event(s,'fracture',p.x,p.y,'#c8ad6c',1.4);}
}
function pointInEffect(e,p){return distance(e,p)<e.radius;}
function spawn(s,seal){
  const r=seal.recipe,source=s.players[seal.owner];
  let angle=seal.angle;
  if(has(r,'aim'))angle=Math.atan2(seal.target.y-seal.y,seal.target.x-seal.x);
  if(has(r,'region'))angle=Math.atan2(seal.target.y-seal.y,seal.target.x-seal.x)+(r.regionInverted?Math.PI:0);
  if(has(r,'reflection'))angle=Math.atan2(RULES.height-seal.target.y-seal.y,seal.target.x-seal.x);
  const pool=s.resources.filter(p=>p.material===(r.family==='water'?'water':'earth')&&p.amount>0&&distance(p,seal)<5).sort((a,b)=>distance(a,seal)-distance(b,seal))[0];
  if(r.family==='earth'||has(r,'collect')){
    if(!pool){seal.blocked='Ressource compatible absente';return;}
    pool.amount=Math.max(0,pool.amount-.45);
  }
  seal.blocked='';
  if(has(r,'purify')&&pool)pool.impurity=Math.max(0,pool.impurity-.15);
  const family=r.family;
  const staticField=['repetition','time-stop','guidance','light','underfoot-wind','air','smoke','calling','unburning-fire'].includes(family)||has(r,'still')||has(r,'carrier')||has(r,'envelope')||has(r,'rain')||has(r,'cloud');
  const spread=has(r,'dispersion')?.9:has(r,'focus')||has(r,'crosshair')?.015:.12;
  angle+=(random(s)-.5)*spread;
  let x=seal.x,y=seal.y;
  if(has(r,'region')||has(r,'rain')){const d=Math.min(3.5,distance(seal,seal.target));x+=Math.cos(angle)*d;y+=Math.sin(angle)*d;}
  if(staticField&&(has(r,'reflection')||has(r,'project'))){const target={x:seal.target.x,y:has(r,'reflection')?RULES.height-seal.target.y:seal.target.y};const d=Math.min(r.range,distance(seal,target));x=seal.x+Math.cos(angle)*d;y=seal.y+Math.sin(angle)*d;}
  if(has(r,'carrier')){x=seal.x;y=seal.y;}
  if(has(r,'envelope')){const well=s.players[seal.owner];if(distance(well,seal)<4){x=well.x;y=well.y;}}
  if(has(r,'nearby')){const o=s.objects.filter(o=>o.hp>0).sort((a,b)=>distance(a,seal)-distance(b,seal))[0];if(o&&distance(o,seal)<r.range){x=o.x;y=o.y;}}
  if(r.solid){
    const existing=s.objects.filter(o=>o.source===seal.id&&o.hp>0);
    const maxObjects=has(r,'link')||has(r,'bolt')?3:1;
    let o=existing.length>=maxObjects?existing[0]:null;
    if(!o&&s.objects.length<70){
      const reach=has(r,'envelope')?0:has(r,'project')?1.4:1;
      o={id:s.nextId++,source:seal.id,owner:seal.owner,x:x+Math.cos(angle)*reach,y:y+Math.sin(angle)*reach,vx:0,vy:0,
        hp:120*r.strength,maxHp:120*r.strength,r:(has(r,'envelope')?1.15:has(r,'ribbon')?.9:has(r,'coil')?.7:.55)*r.scale,
        mass:3*r.scale,material:family==='water'||family==='crystal'?'crystal':'earth',height:0,shape:family==='sword'?'sword':r.shape,recipe:r,lifeUntil:s.time+8,initial:{x,y}};
      s.objects.push(o);event(s,'crystal',o.x,o.y,r.color,1.8);
    }
    if(o){
      for(const member of existing)member.lifeUntil=s.time+8;
      if(has(r,'bolt')||has(r,'project')||has(r,'burst')||has(r,'puppet')){o.vx=Math.cos(angle)*r.speed;o.vy=Math.sin(angle)*r.speed;}
      if(has(r,'still')||has(r,'bind'))o.vx=o.vy=0;
      if(has(r,'lift')||has(r,'float'))o.height=1;
      if(has(r,'entwine'))for(const other of s.objects)if(other!==o&&distance(other,o)<o.r+other.r+.5)other.boundUntil=s.time+.6;
      if(has(r,'link'))for(const member of existing){member.vx=o.vx;member.vy=o.vy;member.height=o.height;}
    }
  }
  if(s.effects.length>=RULES.maxParticles)return;
  const radius=staticField?Math.max(1.2,r.radius):r.radius;
  s.effects.push({id:s.nextId++,source:seal.id,owner:seal.owner,x,y,px:x,py:y,angle,vx:staticField?0:Math.cos(angle)*r.speed,vy:staticField?0:Math.sin(angle)*r.speed,
    radius,life:staticField?.42*r.strength:r.range/Math.max(.1,r.speed),age:0,travel:0,recipe:r,power:r.power*(family==='water'&&pool?1-.35*pool.impurity:1),color:r.color});
  if(has(r,'burst'))source.ink=Math.max(0,source.ink-.25);
}
function effects(s,dt){
  const pointInEffect=(e,p)=>distance(e,p)<e.radius&&!inkBlocks(e,p,s.strokes,e.source);
  const heat=new Map(),wet=new Map(),wash=new Map(),nodeHeat=new Map(),wellHeat=[0,0];
  for(const e of s.effects){
    e.age+=dt;e.life-=dt;e.px=e.x;e.py=e.y;
    const r=e.recipe,source=s.seals.find(x=>x.id===e.source);
    const contacts=moveAlongInk(e,dt,s.strokes);
    e.travel+=Math.hypot(e.vx,e.vy)*dt;
    fadeEffect(e);
    if(e.travel>r.range||e.x<0||e.x>RULES.width||e.y<0||e.y>RULES.height)e.life=0;
    if(e.life<=0)continue;
    if(has(r,'portal')&&e.age>.6&&!e.teleported&&source){const a=Math.atan2(source.target.y-source.y,source.target.x-source.x),d=Math.min(r.range,distance(source,source.target));e.x=clamp(source.x+Math.cos(a)*d,.5,RULES.width-.5);e.y=clamp(source.y+Math.sin(a)*d,.5,RULES.height-.5);e.teleported=true;event(s,'portal',e.x,e.y,r.color);}
    const fire=r.family==='fire',water=r.family==='water'||has(r,'cool');
    if(r.family==='wind'||r.family==='whorling-wind'||r.family==='guidance'||has(r,'pull')||has(r,'push')||has(r,'gather')){
      for(const other of s.effects){if(other===e||other.owner===e.owner||!pointInEffect(e,other)||other.recipe.solid)continue;
        const spin=r.family==='whorling-wind',pull=r.family==='guidance'||has(r,'pull')||has(r,'gather');
        const a=spin?Math.atan2(other.y-e.y,other.x-e.x)+Math.PI/2:pull?Math.atan2(e.y-other.y,e.x-other.x):has(r,'push')?Math.atan2(other.y-e.y,other.x-e.x):e.angle;
        other.vx+=Math.cos(a)*dt*5;other.vy+=Math.sin(a)*dt*5;
      }
      for(const o of s.objects){if(o.hp<=0||!pointInEffect(e,o))continue;
        const pull=r.family==='guidance'||has(r,'pull')||has(r,'gather'),a=pull?Math.atan2(e.y-o.y,e.x-o.x):has(r,'push')?Math.atan2(o.y-e.y,o.x-e.x):e.angle;
        o.vx+=Math.cos(a)*dt*9/o.mass;o.vy+=Math.sin(a)*dt*9/o.mass;
      }
    }
    if(r.family==='underfoot-wind'||has(r,'lift')||has(r,'float'))for(const o of s.objects)if(o.hp>0&&pointInEffect(e,o)){o.height=1;o.floatingUntil=s.time+.5;}
    if(has(r,'crush')||has(r,'restore'))for(const o of s.objects)if(o.material==='earth'&&pointInEffect(e,o)){
      if(has(r,'crush'))o.hp=Math.max(0,o.hp-10*dt);else o.hp=Math.min(o.maxHp,o.hp+3*dt);
    }
    if(r.family==='time-stop')for(const seal of s.seals)if(seal.owner!==e.owner&&pointInEffect(e,seal)&&seal.immuneUntil<=s.time){seal.stoppedUntil=s.time+1.5;seal.immuneUntil=s.time+9.5;}
    if(has(r,'cool'))for(const o of s.objects)if(o.hp>0&&pointInEffect(e,o)){o.vx*=Math.exp(-dt*2);o.vy*=Math.exp(-dt*2);o.chilledUntil=s.time+.5;}
    if(r.family==='smoke'||has(r,'conceal'))for(const seal of s.seals)if(pointInEffect(e,seal))seal.hiddenUntil=s.time+.5;
    if(r.family==='light'&&!has(r,'conceal'))for(const seal of s.seals)if(pointInEffect(e,seal))seal.revealedUntil=s.time+.5;
    if(r.family==='repetition'){
      for(const stroke of s.strokes)if(stroke.owner===e.owner&&stroke.sealId!==e.source)for(const seg of stroke.segments)if(pointInEffect(e,seg.a)&&seg.lastHit<s.time-1)seg.hp=Math.min(seg.maxHp,seg.hp+dt*.8);
      for(const o of s.objects)if(o.owner===e.owner&&o.source!==e.source&&o.hp>0&&pointInEffect(e,o))o.hp=Math.min(o.maxHp,o.hp+dt*.8);
    }
    if(water){
      for(const f of s.effects)if(f.recipe.family==='fire'&&pointInEffect(e,f))f.life=Math.min(f.life,.06);
    }
    if(fire||water){
      for(const stroke of s.strokes)for(const seg of stroke.segments){
        const mid={x:(seg.a.x+seg.b.x)/2,y:(seg.a.y+seg.b.y)/2};
        if(seg.hp>0&&(contacts.has(seg)||pointInEffect(e,mid))&&stroke.sealId!==e.source){
          if(fire)heat.set(seg,Math.max(heat.get(seg)||0,5*e.power));else {wet.set(seg,true);seg.wetUntil=s.time+1;if(r.family==='water')wash.set(seg,Math.max(wash.get(seg)||0,2*e.power));}
        }
      }
      for(const seal of s.seals)if(seal.id!==e.source)for(const n of seal.nodes)if(pointInEffect(e,n)&&fire)nodeHeat.set(n,Math.max(nodeHeat.get(n)||0,5*e.power));
      for(let i=0;i<2;i++)if(distance(e,s.players[i])<e.radius+.5&&fire&&!inkBlocks(e,s.players[i],s.strokes,e.source))wellHeat[i]=Math.max(wellHeat[i],10*e.power);
    }
    for(const o of s.objects){
      if(o.hp<=0||o.source===e.source||o.height>.5||distance(o,e)>o.r+e.radius||inkBlocks(e,o,s.strokes,e.source))continue;
      if(fire){o.hp=Math.max(0,o.hp-dt*2);if(Math.hypot(e.vx,e.vy)>0)e.life=0;}
      if(water){o.vx+=e.vx*dt/o.mass;o.vy+=e.vy*dt/o.mass;}
    }
  }
  for(const [seg,dps]of heat)if(!wet.has(seg)&&!(seg.wetUntil>s.time)){seg.burningUntil=s.time+.25;damageSegment(s,seg,dps*dt);}
  for(const [seg,dps]of wash)damageSegment(s,seg,dps*dt);
  for(const [n,dps]of nodeHeat)damageSegment(s,n,dps*dt);
  for(let i=0;i<2;i++){s.players[i].hp=Math.max(0,s.players[i].hp-wellHeat[i]*dt);if(wellHeat[i]&&random(s)<dt*8)event(s,'impact',s.players[i].x,s.players[i].y,'#ff713e',1);}
  s.effects=s.effects.filter(e=>e.life>0);
}
function moveObjects(s,dt,physics){
  if(physics)physics.step(s.objects,dt);
  for(const o of s.objects){
    if(o.hp<=0)continue;
    if(o.lifeUntil&&o.lifeUntil<s.time){o.hp=0;continue;}
    if(o.boundUntil>s.time){o.vx=0;o.vy=0;}
    if(o.floatingUntil&&o.floatingUntil<s.time)o.height=0;
    if(!physics){o.x=clamp(o.x+o.vx*dt,o.r,RULES.width-o.r);o.y=clamp(o.y+o.vy*dt,o.r,RULES.height-o.r);
      o.vx*=Math.exp(-dt*1.2);o.vy*=Math.exp(-dt*1.2);}
    if(o.recipe&&o.initial){
      o.travel=(o.travel||0)+Math.hypot(o.x-(o.lastX??o.initial.x),o.y-(o.lastY??o.initial.y));o.lastX=o.x;o.lastY=o.y;
      if(o.travel>o.recipe.range||distance(o,o.initial)>o.recipe.range){o.hp=0;continue;}
    }
    const speed=Math.hypot(o.vx,o.vy);
    if(speed>.5&&o.height<.5)for(const st of s.strokes)if(st.sealId!==o.source)for(const seg of st.segments){if(seg.hp>0&&segmentDistance(o,seg.a,seg.b)<o.r){damageSegment(s,seg,Math.min(20,speed*o.mass)*dt);}}
    if(o.owner!=null&&o.height<.5)for(const player of s.players){if(distance(o,player)<o.r+.5){const speed=Math.hypot(o.vx,o.vy);if(speed<.5)continue;player.hp=Math.max(0,player.hp-Math.min(18,speed*o.mass));o.vx*=-.3;o.vy*=-.3;o.hp-=20;event(s,'impact',o.x,o.y,'#cfb57b');}}
    if(!physics)for(const other of s.objects){if(other===o||other.hp<=0||other.height!==o.height)continue;const d=distance(o,other),min=o.r+other.r;if(d>0&&d<min){o.x+=(o.x-other.x)/d*(min-d)*.5;o.y+=(o.y-other.y)/d*(min-d)*.5;o.vx*=.8;o.vy*=.8;}}
  }
  // Keep destroyed natural obstacles as restorable matter; discard spent summoned debris.
  s.objects=s.objects.filter(o=>o.hp>0||o.source==null);
}
function repair(s,dt){
  for(const request of s.repairs){
  if(!request)continue;const {owner,point}=request,p=s.players[owner];
  if(p.ink<4*dt)continue;
  let hit=nearestSegment(s,point,owner,.65)?.segment;
  for(const seal of s.seals)if(seal.owner===owner)for(const node of seal.nodes)if(distance(point,node)<.22&&node.hp<node.maxHp)hit=node;
  if(hit&&hit.hp<hit.maxHp&&hit.lastHit<s.time-.5){hit.hp=Math.min(hit.maxHp,hit.hp+8*dt);p.ink-=4*dt;}
  }
}
function ai(s,dt){
  if(!s.ai)return;
  const owner=1,p=s.players[1],target=s.players[0],range=distance(p,target);
  const hazards=[...s.effects.filter(e=>e.recipe.family==='fire'&&e.life>0),...s.objects.filter(o=>o.hp>0&&o.height<.5&&Math.hypot(o.vx,o.vy)>.5).map(o=>({...o,radius:o.r}))];
  const threats=hazards.filter(e=>segmentDistance(p,e,{x:e.x+e.vx*.6,y:e.y+e.vy*.6})<e.radius+2);
  let dx=0,dy=0;
  if(threats.length){for(const e of threats){dx+=p.x-e.x-e.vx*.35;dy+=p.y-e.y-e.vy*.35;}if(Math.hypot(dx,dy)<.01)dy=1;}
  else if(range>8){dx=target.x-p.x;dy=target.y-p.y;}
  else if(range<4){dx=p.x-target.x;dy=p.y-target.y;}
  const length=Math.hypot(dx,dy);
  if(length&&s.phase!=='preparation'){
    const angle=Math.atan2(dy,dx);
    let best=null,bestScore=-Infinity;
    for(const turn of [0,.4,-.4,.8,-.8,1.2,-1.2,1.6,-1.6,2.2,-2.2,Math.PI]){const heading=angle+turn,next={x:clamp(p.x+Math.cos(heading)*3*dt,.6,RULES.width-.6),y:clamp(p.y+Math.sin(heading)*3*dt,.6,RULES.height-.6)};
      if(distance(next,p)<3*dt*.25||distance(next,target)<1.2||s.objects.some(o=>o.hp>0&&o.height<.5&&distance(o,next)<o.r+.55))continue;
      const future={x:clamp(p.x+Math.cos(heading)*1.2,.6,RULES.width-.6),y:clamp(p.y+Math.sin(heading)*1.2,.6,RULES.height-.6)};
      const danger=threats.reduce((sum,e)=>sum+Math.max(0,e.radius+1.3-segmentDistance(future,e,{x:e.x+e.vx*.6,y:e.y+e.vy*.6})),0);
      const obstacle=s.objects.some(o=>o.hp>0&&o.height<.5&&segmentDistance(o,p,future)<o.r+.55)?3:0;
      const score=Math.cos(turn)-danger*4-obstacle+.15*Math.cos(heading-(s.aiHeading??heading));
      if(score>bestScore){bestScore=score;best={...next,heading};}
    }
    if(best){p.x=best.x;p.y=best.y;s.aiHeading=best.heading;}
  }
  if(s.time<s.aiTime)return;s.aiTime=s.time+.6;
  let own=s.seals.filter(x=>x.owner===owner);
  // Retire out-of-range positions so pursuit does not leave every slot behind.
  for(const seal of own)if(distance(seal,p)>8||distance(seal,target)>seal.recipe.range+3)command(s,{type:'remove',owner,id:seal.id});
  own=s.seals.filter(x=>x.owner===owner);
  for(const seal of own){command(s,{type:'aim',owner,id:seal.id,point:target});
    const unsafe=segmentDistance(p,seal,target)<1&&distance(p,seal)<distance(target,seal);
    if((unsafe||p.ink<5)&&(seal.active||seal.charging))command(s,{type:'activate',owner,id:seal.id});
    else if(!unsafe&&s.phase!=='preparation'&&!seal.active&&!seal.charging&&intact(s,seal)&&p.ink>15)command(s,{type:'activate',owner,id:seal.id});
  }
  command(s,{type:'repair',owner:1,point:null});
  const damaged=own.find(x=>!intact(s,x));
  if(damaged&&p.ink>20&&!threats.length){const stroke=s.strokes.find(x=>x.id===damaged.strokeId);const broken=stroke?.segments.filter(x=>x.hp<x.maxHp).sort((a,b)=>a.hp-b.hp)[0],node=damaged.nodes.find(x=>x.hp<x.maxHp);if(broken||node)command(s,{type:'repair',owner:1,point:broken?{x:(broken.a.x+broken.b.x)/2,y:(broken.a.y+broken.b.y)/2}:node});}
  const threat=threats.sort((a,b)=>distance(a,p)-distance(b,p))[0];
  const protectedHere=threat&&s.strokes.some(st=>st.owner===owner&&!st.sealId&&st.segments.some(seg=>seg.hp>0&&segmentDistance(p,seg.a,seg.b)<4)&&inkBlocks(p,threat,[st],null));
  if(threat&&p.ink>12&&!protectedHere&&s.time>=(s.aiShieldAt||0)){
    const a=Math.atan2(threat.y-p.y,threat.x-p.x);
    for(const reach of [1.8,1,.4]){
      const x=p.x+Math.cos(a)*reach,y=p.y+Math.sin(a)*reach;
      const points=[{x:clamp(x-Math.sin(a),.05,RULES.width-.05),y:clamp(y+Math.cos(a),.05,RULES.height-.05)},{x:clamp(x+Math.sin(a),.05,RULES.width-.05),y:clamp(y-Math.cos(a),.05,RULES.height-.05)}];
      if(distance(points[0],points[1])<.2||!inkBlocks(p,threat,[{segments:[{a:points[0],b:points[1],hp:1}]}],null))continue;
      if(command(s,{type:'stroke',owner,points}).ok){s.aiShieldAt=s.time+2;break;}
    }
  }
  if(range<12&&own.length<3&&p.ink>35){
    const i=own.length,a=Math.atan2(target.y-p.y,target.x-p.x)+(i===1?.8:i===2?-.8:0);
    const recipe=i===1?{sigil:'Vent',signs:['Colonne','Viseur']}:PRESETS[0];
    placement:for(const reach of [3,4.5])for(const offset of [0,.3,-.3,.6,-.6,1.2,-1.2,1.8,-1.8,Math.PI]){
      const x=p.x+Math.cos(a+offset)*reach,y=p.y+Math.sin(a+offset)*reach;
      if(!territory(owner,{x,y},.85)||s.objects.some(o=>o.hp>0&&distance(o,{x,y})<o.r+.85))continue;
      if(segmentDistance(p,{x,y},target)<1&&distance(p,{x,y})<distance(target,{x,y}))continue;
      if(command(s,{type:'place',owner,x,y,angle:Math.atan2(target.y-y,target.x-x),recipe}).ok)break placement;
    }
  }
}
export function stepMatch(s,dt=RULES.step,physics=null){
  if(s.paused||s.phase==='ended')return;
  dt=clamp(dt,0,.05);s.time+=dt;s.phaseTime+=dt;
  for(const p of s.players)p.ink=Math.min(RULES.inkCap,p.ink+RULES.regen*dt);
  ai(s,dt);repair(s,dt);
  if(s.phase==='preparation'){if(s.phaseTime>=30){s.phase='combat';s.phaseTime=0;}return;}
  for(const seal of s.seals){
    if(!intact(s,seal)){seal.active=false;seal.charging=0;continue;}
    if(seal.charging>0){seal.charging-=dt;if(seal.charging<=0){seal.charging=0;seal.active=true;event(s,'activate',seal.x,seal.y,seal.recipe.color,2);}}
    if(!seal.active||seal.stoppedUntil>s.time)continue;
    const p=s.players[seal.owner],mass=s.objects.filter(o=>o.source===seal.id&&o.hp>0).reduce((n,o)=>n+o.mass,0);
    const collecting=has(seal.recipe,'collect')&&s.resources.some(r=>r.amount>0&&r.material===(seal.recipe.family==='water'?'water':'earth')&&distance(r,seal)<5);
    const cost=(seal.recipe.upkeep*(collecting?.6:1)+mass*.05)*dt;
    if(p.ink<cost){seal.active=false;event(s,'empty',seal.x,seal.y,'#bbb');continue;}
    p.ink-=cost;seal.pulse-=dt;
    if(seal.pulse<=0){seal.pulse=.16;spawn(s,seal);}
  }
  effects(s,dt);moveObjects(s,dt,physics);
  if(s.players.some(p=>p.hp<=0)){s.phase='ended';s.winner=s.players[0].hp<=0?(s.players[1].hp<=0?'draw':1):0;}
  else if(s.phase==='combat'&&s.phaseTime>=300){if(Math.abs(s.players[0].hp-s.players[1].hp)>.01){s.phase='ended';s.winner=s.players[0].hp>s.players[1].hp?0:1;}else{s.phase='overtime';s.phaseTime=0;}}
  else if(s.phase==='overtime'&&s.phaseTime>=60){s.phase='ended';s.winner=Math.abs(s.players[0].hp-s.players[1].hp)<.01?'draw':s.players[0].hp>s.players[1].hp?0:1;}
}
export function advanceMatch(s,seconds){for(let remaining=seconds;remaining>1e-8;remaining-=RULES.step)stepMatch(s,Math.min(RULES.step,remaining));return s;}
export function sealAt(s,p,owner=null){return s.seals.filter(x=>(owner==null||x.owner===owner)&&distance(x,p)<(x.radius||.85)).sort((a,b)=>(a.radius||.85)-(b.radius||.85))[0];}
export function isSealIntact(s,seal){return intact(s,seal);}

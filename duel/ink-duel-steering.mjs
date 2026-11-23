export function effectAt(state,point){
  return [...state.effects.filter(e=>e.life>0),...state.objects.filter(o=>o.hp>0&&o.source!=null)]
    .filter(e=>e.owner===0&&Math.hypot(e.x-point.x,e.y-point.y)<=Math.max(.35,e.radius||e.r||0))
    .sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0]||null;
}
export function steerEffect(state,source,dx,dy){
  if(state.paused||state.phase==='ended'||![dx,dy].every(Number.isFinite)||!Math.hypot(dx,dy))return false;
  const effects=[...state.effects.filter(e=>e.life>0),...state.objects.filter(o=>o.hp>0)].filter(e=>e.source===source&&e.owner===0);
  if(!effects.length)return false;
  const angle=Math.atan2(dy,dx);
  for(const e of effects){const speed=Math.hypot(e.vx,e.vy)||e.recipe?.speed||2;e.vx=Math.cos(angle)*speed;e.vy=Math.sin(angle)*speed;e.angle=angle;}
  const seal=state.seals.find(s=>s.id===source&&s.owner===0);
  if(seal){seal.angle=angle;seal.target={x:seal.x+Math.cos(angle)*seal.recipe.range,y:seal.y+Math.sin(angle)*seal.recipe.range};}
  return true;
}

export const DRAW_REACH=8;
export function canWrite(state,owner,points){
  const well=state.players[owner];
  return !!well&&points.every(p=>Math.hypot(p.x-well.x,p.y-well.y)<=DRAW_REACH);
}
export function scaleRecipe(recipe,size=1){
  const factor=Math.max(.5,Math.min(4,size));
  return {...recipe,power:recipe.power*factor,range:recipe.range*Math.sqrt(factor),radius:recipe.radius*Math.sqrt(factor),upkeep:recipe.upkeep*factor};
}
export function fadeEffect(effect){
  effect.basePower??=effect.power;
  effect.fade=Math.max(0,1-effect.travel/effect.recipe.range);
  effect.power=effect.basePower*effect.fade;
}

export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function sampleStroke(points,spacing=.18){
  if(!Array.isArray(points)||points.length<2||points.length>4096) return [];
  if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return [];
  const result=[{...points[0]}]; let carry=0;
  for(let i=1;i<points.length;i++){
    let a={...points[i-1]},b=points[i],len=distance(a,b);
    while(len+carry>=spacing){
      const t=(spacing-carry)/len;
      a={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};result.push(a);
      len=distance(a,b);carry=0;
      if(result.length>4096)return [];
    }
    carry+=len;
  }
  if(distance(result.at(-1),points.at(-1))>.001)result.push({...points.at(-1)});
  return result;
}
export function makeStroke(id,owner,points,thickness=1,sealId=null){
  const samples=sampleStroke(points); const segments=[];
  for(let i=1;i<samples.length;i++) segments.push({a:samples[i-1],b:samples[i],hp:100*thickness,maxHp:100*thickness,lastHit:-1000});
  return {id,owner,sealId,thickness,segments};
}
export function segmentDistance(point,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;
  const t=d?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/d)):0;
  return Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy);
}
export function ringPoints(x,y,r=.8){return Array.from({length:49},(_,i)=>({x:x+Math.cos(i*Math.PI/24)*r,y:y+Math.sin(i*Math.PI/24)*r}));}
export function nearestSegment(state,point,owner,radius=.45){
  let best=null,min=radius;
  for(const stroke of state.strokes){if(owner!=null&&stroke.owner!==owner)continue;
    for(const segment of stroke.segments){const d=segmentDistance(point,segment.a,segment.b);if(d<min){min=d;best={stroke,segment,d};}}
  }return best;
}

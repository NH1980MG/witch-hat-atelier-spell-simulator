const cross=(x,y,u,v)=>x*v-y*u;
function firstHit(a,b,strokes,source){
  const dx=b.x-a.x,dy=b.y-a.y;let hit=null;
  for(const stroke of strokes){
    if(source!=null&&stroke.sealId===source)continue;
    for(const seg of stroke.segments){
      if(seg.hp<=0)continue;
      const sx=seg.b.x-seg.a.x,sy=seg.b.y-seg.a.y,den=cross(dx,dy,sx,sy);
      if(Math.abs(den)<1e-12)continue;
      const ax=seg.a.x-a.x,ay=seg.a.y-a.y,t=cross(ax,ay,sx,sy)/den,u=cross(ax,ay,dx,dy)/den;
      if(t>=0&&t<=1&&u>=-1e-9&&u<=1+1e-9&&(!hit||t<hit.t))hit={t,sx,sy,seg};
    }
  }
  return hit;
}
export function inkBlocks(a,b,strokes,source){
  const hit=firstHit(a,b,strokes,source);
  return !!hit&&hit.t>1e-7&&hit.t<1-1e-7;
}
export function moveAlongInk(e,dt,strokes){
  const contacts=new Set();let remaining=dt;
  // Swept intersections prevent tunnelling even at high speed. Keep each
  // packet's energy; alternate head-on packets between the two tangent sides.
  for(let i=0;i<4&&remaining>1e-8;i++){
    const speed=Math.hypot(e.vx,e.vy);if(!speed)break;
    const end={x:e.x+e.vx*remaining,y:e.y+e.vy*remaining},hit=firstHit(e,end,strokes,e.source);
    if(!hit){e.x=end.x;e.y=end.y;break;}
    contacts.add(hit.seg);
    const t=Math.max(0,hit.t-1e-5/(speed*remaining));
    e.x+=e.vx*remaining*t;e.y+=e.vy*remaining*t;remaining*=1-hit.t;
    const len=Math.hypot(hit.sx,hit.sy),flip=hit.sx<0||(hit.sx===0&&hit.sy<0)?-1:1;
    const tx=hit.sx/len*flip,ty=hit.sy/len*flip,dot=e.vx*tx+e.vy*ty;
    const direction=Math.abs(dot)>1e-6?Math.sign(dot):(e.id%2?-1:1);
    e.vx=tx*speed*direction;e.vy=ty*speed*direction;e.angle=Math.atan2(e.vy,e.vx);
  }
  return contacts;
}

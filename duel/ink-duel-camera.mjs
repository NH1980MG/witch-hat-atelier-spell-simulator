const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function followWellPan(well,pan,camera,rules){
  const marginX=(camera.right-camera.left)*.12,marginY=(camera.top-camera.bottom)*.12;
  const x=well.x-24-pan.x,y=well.y-14-pan.y;
  return {
    x:clamp(pan.x+x-clamp(x,camera.left+marginX,camera.right-marginX),-24,rules.width-24),
    y:clamp(pan.y+y-clamp(y,-camera.top+marginY,-camera.bottom-marginY),-14,rules.height-14),
  };
}

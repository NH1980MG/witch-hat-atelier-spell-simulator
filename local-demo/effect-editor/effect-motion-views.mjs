export function projectMotionPoint(p, view = 'front') {
  return {x:(p.x+4)*40,y:(4-(view==='top'?p.z:p.y))*40};
}
export function moveMotionPoint(p, screen, view = 'front') {
  return {...p,x:Math.max(-4,Math.min(4,screen.x/40-4)),[view==='top'?'z':'y']:Math.max(view==='top'?-4:-2,Math.min(4,4-screen.y/40))};
}

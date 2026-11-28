import * as THREE from './vendor/three/three.module.js';
import { SYMBOL_PATHS } from './symbol-catalog.mjs';
import { distance } from './ink-duel-strokes.mjs';

const TEAM=['#137e88','#ad455d'];
const FX={fire:['#fff2b3','#ff983c','#ef3e36'],water:['#dbffff','#57d9ef','#247cdb'],wind:['#f0ffdf','#adf4cc','#30c1ae'],earth:['#f8dfa1','#b1a08a','#737961'],crystal:['#ffffff','#b4f7ef','#51b5cd'],smoke:['#77848c','#5c6874','#313c48'],light:['#fffde0','#ffea93','#d3e2cb']};
export class DuelRenderer {
  constructor(container){
    this.container=container;this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor('#243044');
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    container.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Duel d encre');this.renderer.domElement.setAttribute('role','img');
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-12,12,7,-7,.1,100);
    this.camera.position.set(24,30,14);this.camera.up.set(0,0,-1);this.camera.lookAt(24,0,14);
    this.zoom=1;this.pan={x:0,y:0};this.preview=null;this.selected=null;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.quality=1;this.shake=0;this.lastTexture=-1;
    this.scene.add(new THREE.HemisphereLight(0xe5fff6,0x2f3748,1.4));
    const light=new THREE.DirectionalLight(0xffecd0,1.5);light.position.set(7,18,3);light.castShadow=true;
    Object.assign(light.shadow.camera,{left:-16,right:16,top:12,bottom:-12});light.shadow.mapSize.set(1024,1024);this.scene.add(light);
    this.paper=document.createElement('canvas');this.paper.width=2048;this.paper.height=1194;this.ctx=this.paper.getContext('2d');
    this.texture=new THREE.CanvasTexture(this.paper);this.texture.colorSpace=THREE.SRGBColorSpace;
    this.ground=new THREE.Mesh(new THREE.PlaneGeometry(48,28),new THREE.MeshBasicMaterial({map:this.texture}));
    this.ground.rotation.x=-Math.PI/2;this.ground.receiveShadow=true;this.scene.add(this.ground);
    const rim=new THREE.Mesh(new THREE.BoxGeometry(480.3,.2,280.3),new THREE.MeshStandardMaterial({color:'#34453e',roughness:.7}));rim.position.set(240,-.13,140);this.scene.add(rim);this.ground.position.set(24,0,14);
    this.wells=[this.inkwell(0),this.inkwell(1)];this.objects=new Map();this.rings=new Map();this.particles=[];this.bursts=[];this.tick=0;
    const count=5000;this.positions=new Float32Array(count*3);this.colors=new Float32Array(count*3);this.sizes=new Float32Array(count);this.alphas=new Float32Array(count);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.positions,3));geo.setAttribute('color',new THREE.BufferAttribute(this.colors,3));geo.setAttribute('size',new THREE.BufferAttribute(this.sizes,1));
    geo.setAttribute('opacity',new THREE.BufferAttribute(this.alphas,1));
    this.particleMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.NormalBlending,vertexColors:true,
      uniforms:{pixelRatio:{value:Math.min(devicePixelRatio,2)}},
      vertexShader:'attribute float size; attribute float opacity; varying vec3 vColor; varying float vOpacity; uniform float pixelRatio; void main(){vColor=color;vOpacity=opacity; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=size*pixelRatio;}',
      fragmentShader:'varying vec3 vColor; varying float vOpacity; void main(){vec2 uv=gl_PointCoord-.5; float d=length(uv)*2.; if(d>1.)discard; float a=1.-smoothstep(.25,1.,d);gl_FragColor=vec4(vColor,a*vOpacity);}' });
    this.points=new THREE.Points(geo,this.particleMaterial);this.points.frustumCulled=false;this.scene.add(this.points);
    this.raycaster=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);this.resize();
  }
  inkwell(owner){
    const group=new THREE.Group(),baseMat=new THREE.MeshStandardMaterial({color:TEAM[owner],metalness:.5,roughness:.25});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.39,.55,.8,8),baseMat);body.position.y=.45;body.castShadow=true;group.add(body);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(.29,.08,8,24),new THREE.MeshStandardMaterial({color:'#e0ca8e',metalness:.7,roughness:.3}));lip.rotation.x=Math.PI/2;lip.position.y=.92;group.add(lip);
    const ink=new THREE.Mesh(new THREE.CircleGeometry(.28,24),new THREE.MeshBasicMaterial({color:'#081a23'}));ink.rotation.x=-Math.PI/2;ink.position.y=.93;group.add(ink);
    const feather=new THREE.Mesh(new THREE.ConeGeometry(.12,1.1,3),new THREE.MeshStandardMaterial({color:'#f8f6e8'}));feather.position.set(.15,1.35,.05);feather.rotation.z=-.35;feather.castShadow=true;group.add(feather);
    group.position.set(owner===0?18:30,0,14);this.scene.add(group);return group;
  }
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);const aspect=w/h;const vh=Math.max(15,25/aspect)/this.zoom;
    Object.assign(this.camera,{left:-vh*aspect/2,right:vh*aspect/2,top:vh/2,bottom:-vh/2});this.camera.position.set(24+this.pan.x,30,14+this.pan.y);this.camera.lookAt(24+this.pan.x,0,14+this.pan.y);this.camera.updateProjectionMatrix();
    // Rasterize only the visible world at screen pixel density, not the entire
    // arena at a fixed resolution that gets magnified when zooming.
    const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());
    if(this.paper.width!==size.x||this.paper.height!==size.y){
      this.paper.width=size.x;this.paper.height=size.y;this.texture.dispose();this.texture=new THREE.CanvasTexture(this.paper);this.texture.colorSpace=THREE.SRGBColorSpace;
      this.texture.generateMipmaps=false;this.texture.minFilter=THREE.LinearFilter;this.texture.magFilter=THREE.LinearFilter;this.ground.material.map=this.texture;this.ground.material.needsUpdate=true;
    }
    this.ground.scale.set(vh*aspect/48,vh/28,1);this.ground.position.set(24+this.pan.x,0,14+this.pan.y);this.lastTexture=-1;
  }
  screenPoint(clientX,clientY){const r=this.renderer.domElement.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),this.camera);const hit=new THREE.Vector3();return this.raycaster.ray.intersectPlane(this.plane,hit)?{x:hit.x,y:hit.z}:null;}
  zoomBy(factor){this.zoom=Math.max(.4,Math.min(5,this.zoom*factor));this.resize();}
  resetCamera(){this.zoom=1;this.pan={x:0,y:0};this.resize();}
  glyph(ctx,name,x,y,size,color,rotation=0){
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(size/48,size/48);ctx.translate(-24,-24);ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';
    for(const p of SYMBOL_PATHS[name]||[])ctx.stroke(new Path2D(p));ctx.restore();
  }
  drawPaper(s){
    const c=this.ctx,k=this.paper.width/(this.camera.right-this.camera.left),ky=this.paper.height/(this.camera.top-this.camera.bottom);
    c.setTransform(1,0,0,1,0,0);c.fillStyle='#243044';c.fillRect(0,0,this.paper.width,this.paper.height);
    c.setTransform(k,0,0,ky,-(24+this.pan.x+this.camera.left)*k,-(14+this.pan.y-this.camera.top)*ky);c.fillStyle='#f6ecd8';c.fillRect(0,0,s.rules.width,s.rules.height);
    const left=Math.max(0,Math.floor((24+this.pan.x+this.camera.left)*2)/2),right=Math.min(s.rules.width,24+this.pan.x+this.camera.right),top=Math.max(0,Math.floor((14+this.pan.y-this.camera.top)*2)/2),bottom=Math.min(s.rules.height,14+this.pan.y-this.camera.bottom);
    c.strokeStyle='#d1bd92';c.lineWidth=.012;c.beginPath();for(let x=left;x<=right;x+=.5){c.moveTo(x,top);c.lineTo(x,bottom);}for(let y=top;y<=bottom;y+=.5){c.moveTo(left,y);c.lineTo(right,y);}c.stroke();
    c.strokeStyle='#81918a';c.lineWidth=.025;c.strokeRect(.18,.18,s.rules.width-.36,s.rules.height-.36);
    c.save();c.strokeStyle='#387d7066';c.lineWidth=.03;c.setLineDash([.2,.2]);c.beginPath();c.arc(s.players[0].x,s.players[0].y,8,0,Math.PI*2);c.stroke();c.restore();
    for(const p of s.resources){c.fillStyle=p.material==='water'?'#43a9b452':'#a79c7655';c.beginPath();c.ellipse(p.x,p.y,1.1,.7,0,0,Math.PI*2);c.fill();c.fillStyle='#3c5457';c.font='.18px monospace';c.textAlign='center';c.fillText(`${Math.ceil(p.amount)}`,p.x,p.y+.06);}
    for(const p of s.players){c.strokeStyle=p===s.players[0]?TEAM[0]:TEAM[1];c.lineWidth=.025;c.beginPath();c.arc(p.x,p.y,1,0,Math.PI*2);c.stroke();c.beginPath();c.arc(p.x,p.y,1.12,-Math.PI/2,-Math.PI/2+Math.PI*2*p.hp/300);c.lineWidth=.08;c.stroke();}
    if(this.selectedEffect!=null){
      c.save();c.strokeStyle='#bc8a21';c.lineWidth=.045;
      const members=[...s.effects,...s.objects].filter(e=>e.source===this.selectedEffect&&e.owner===0&&(e.life>0||e.hp>0));
      for(const e of members.filter((_,i)=>i%4===0)){c.beginPath();c.arc(e.x,e.y,(e.radius||e.r||.4)+.15,0,Math.PI*2);c.stroke();}c.restore();
    }
    for(const e of s.effects){
      c.globalAlpha=.09;c.fillStyle=e.color;c.beginPath();c.arc(e.x,e.y,e.radius,0,Math.PI*2);c.fill();
      if(['water','wind','whorling-wind','light'].includes(e.recipe.family)){c.globalAlpha=.25;c.strokeStyle=e.color;c.lineWidth=.025;c.beginPath();c.arc(e.x,e.y,e.radius*(.4+(e.age%1)*.6),0,Math.PI*2);c.stroke();}
    }c.globalAlpha=1;
    for(const burst of this.bursts){c.strokeStyle=burst.color;c.globalAlpha=Math.max(0,1-burst.age/.7);c.lineWidth=.035;c.beginPath();c.arc(burst.x,burst.y,.5+burst.age*2,0,Math.PI*2);c.stroke();}c.globalAlpha=1;
    for(const stroke of s.strokes){const ownerSeal=s.seals.find(x=>x.id===stroke.sealId);if(stroke.owner===1&&ownerSeal?.hiddenUntil>s.time&&!(ownerSeal.revealedUntil>s.time))continue;c.lineCap='round';c.lineWidth=.035*stroke.thickness;
      let damaged=null;
      if(stroke.segments.every(seg=>seg.hp===seg.maxHp&&!(seg.burningUntil>s.time)&&!(seg.wetUntil>s.time))){
        c.strokeStyle=stroke.owner===0?'#193d42':'#603341';c.globalAlpha=1;c.lineJoin='round';c.beginPath();
        stroke.segments.forEach((seg,i)=>{if(!i)c.moveTo(seg.a.x,seg.a.y);c.lineTo(seg.b.x,seg.b.y);});c.stroke();continue;
      }
      for(const seg of stroke.segments){if(seg.hp<=0)continue;const burning=seg.burningUntil>s.time,wet=seg.wetUntil>s.time;
        c.lineWidth=.035*stroke.thickness*(burning?1.8:1);c.strokeStyle=burning?'#e95a24':wet?'#278bb5':seg.hp<seg.maxHp*.5?'#9a623d':stroke.owner===0?'#193d42':'#603341';c.globalAlpha=.4+.6*seg.hp/seg.maxHp;c.beginPath();c.moveTo(seg.a.x,seg.a.y);c.lineTo(seg.b.x,seg.b.y);c.stroke();
        if(seg.lastHit>s.time-.3&&(!damaged||seg.hp/seg.maxHp<damaged.hp/damaged.maxHp))damaged=seg;
      }c.globalAlpha=1;
      if(damaged){c.fillStyle='#203c40';c.font='.23px monospace';c.textAlign='center';c.fillText(`(${Math.ceil(damaged.hp)}/${damaged.maxHp} PV)`,damaged.a.x,damaged.a.y-.3);}
    }
    for(const seal of s.seals){
      if(seal.owner===1&&seal.hiddenUntil>s.time&&!(seal.revealedUntil>s.time))continue;
      const own=seal.owner===0,color=TEAM[seal.owner];if(!seal.drawn){this.glyph(c,seal.recipe.sigil,seal.x,seal.y,.55,seal.nodes[0].hp>0?color:'#b5b4aa',seal.angle);
      seal.recipe.signs.forEach((sign,i)=>{const n=seal.nodes[i+1];this.glyph(c,sign.name,n.x,n.y,.26,n.hp>0?color:'#c3b5ae',seal.angle+(sign.inverted?Math.PI:0));});}
      if(seal.id===this.selected){c.strokeStyle=color;c.lineWidth=.025;c.setLineDash([.12,.08]);c.beginPath();c.arc(seal.x,seal.y,(seal.radius||.8)+.17,0,Math.PI*2);c.stroke();
        const reach=seal.recipe.range;c.beginPath();c.moveTo(seal.x,seal.y);c.lineTo(seal.x+Math.cos(seal.angle)*reach,seal.y+Math.sin(seal.angle)*reach);c.stroke();c.setLineDash([]);
        c.fillStyle='#18313a';c.font='.22px monospace';c.textAlign='center';const stroke=s.strokes.find(x=>x.id===seal.strokeId);const weakest=[...stroke.segments,...seal.nodes].reduce((a,b)=>a.hp/a.maxHp<=b.hp/b.maxHp?a:b);c.fillText(`(${Math.ceil(weakest.hp)}/${weakest.maxHp} PV)`,seal.x,seal.y+1.22);
      }
      if(seal.charging>0){c.strokeStyle='#cf9f37';c.lineWidth=.08;c.beginPath();c.arc(seal.x,seal.y,1.02,0,Math.PI*2*(1-seal.charging));c.stroke();}
      if(seal.stoppedUntil>s.time){c.strokeStyle='#7353a7';c.strokeRect(seal.x-.9,seal.y-.9,1.8,1.8);}
      if(own&&seal.blocked){c.fillStyle='#a44b36';c.font='.35px serif';c.fillText('!',seal.x+.9,seal.y);}
    }
    if(this.preview?.point){const {point:p,recipe,angle,valid}=this.preview;c.save();c.globalAlpha=.65;c.strokeStyle=valid===false?'#c4454e':TEAM[0];c.lineWidth=.035;c.setLineDash([.1,.08]);c.beginPath();c.arc(p.x,p.y,.8,0,Math.PI*2);c.stroke();c.setLineDash([]);if(recipe)this.glyph(c,recipe.sigil,p.x,p.y,.55,c.strokeStyle,angle||0);c.restore();}
    if(this.preview?.stroke){c.strokeStyle=TEAM[0];c.lineWidth=.035;c.beginPath();this.preview.stroke.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
    if(this.region){const r=this.region;c.fillStyle='#d2a23715';c.fillRect(r.x,r.y,r.w,r.h);c.strokeStyle='#b07b1e';c.lineWidth=.04;c.setLineDash([.13,.1]);c.strokeRect(r.x,r.y,r.w,r.h);c.setLineDash([]);}
    if(this.selectedWell){const p=s.players[0];c.strokeStyle='#d2a237';c.lineWidth=.06;c.beginPath();c.arc(p.x,p.y,1.3,0,Math.PI*2);c.stroke();}
    if(this.hoverSegment){const {segment:a}=this.hoverSegment;const p=a.a||a;c.fillStyle='#142d34';c.font='.24px monospace';c.textAlign='center';c.fillText(`(${Math.ceil(a.hp)}/${a.maxHp} PV)`,p.x,p.y-.25);}
    c.setTransform(1,0,0,1,0,0);this.texture.needsUpdate=true;
  }
  addParticle(x,y,z,color,size,life,vx=0,vz=0,vy=0){if(this.particles.length>=4500)return;this.particles.push({x,y,z,color:new THREE.Color(color),size,life,max:life,vx,vz,vy});}
  update(s,dt){
    this.tick+=dt;const t=this.tick;
    if(t-this.lastTexture>.045){this.drawPaper(s);this.lastTexture=t;}
    for(const e of s.events.splice(0)){
      this.shake=this.reduced?0:Math.min(.08,this.shake+.015*e.amount);
      for(let i=0;i<35*this.quality;i++){const a=i*2.399,vel=.5+(i%5)*.3;this.addParticle(e.x,.1,e.y,e.color,8+i%6,.5+i%3*.15,Math.cos(a)*vel,Math.sin(a)*vel,1.2);}
      this.bursts.push({x:e.x,y:e.y,age:0,color:e.color});
    }
    const live=new Set();
    for(const o of s.objects){if(o.hp<=0)continue;live.add(o.id);let mesh=this.objects.get(o.id);
      if(!mesh){const geo=o.shape==='coil'||o.shape==='envelope'?new THREE.TorusGeometry(.8,.2,8,24):o.shape==='sword'?new THREE.BoxGeometry(.18,.12,2.4):o.shape==='ribbon'?new THREE.BoxGeometry(2,.3,.7):o.material==='crystal'?new THREE.OctahedronGeometry(1):new THREE.DodecahedronGeometry(1,0);
        mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:o.material==='crystal'?'#72c9d5':o.shape==='sword'?'#b3c8c8':'#8b9582',roughness:o.material==='crystal'?.18:.8,metalness:o.material==='crystal'||o.shape==='sword'?.3:0,transparent:o.material==='crystal',opacity:.87}));mesh.castShadow=true;mesh.receiveShadow=true;if(o.shape==='coil'||o.shape==='envelope')mesh.rotation.x=-Math.PI/2;this.objects.set(o.id,mesh);this.scene.add(mesh);}
      mesh.position.set(o.x,.4+o.height*.5,o.y);mesh.scale.setScalar(o.r);if(o.shape!=='coil'&&o.shape!=='envelope')mesh.rotation.y=Math.atan2(o.vx,o.vy);
    }
    for(const [id,mesh]of this.objects)if(!live.has(id)){this.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();this.objects.delete(id);}
    const active=new Set();
    for(const seal of s.seals)if(seal.active||seal.charging){active.add(seal.id);let ring=this.rings.get(seal.id);
      if(!ring){ring=new THREE.Mesh(new THREE.TorusGeometry(seal.radius||.81,.022,6,64),new THREE.MeshBasicMaterial({color:seal.recipe.color,transparent:true,opacity:.8}));ring.rotation.x=Math.PI/2;this.rings.set(seal.id,ring);this.scene.add(ring);}ring.position.set(seal.x,.025,seal.y);ring.material.opacity=.5+Math.sin(t*4)*.2;
    }
    for(const [id,mesh]of this.rings)if(!active.has(id)){this.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();this.rings.delete(id);}
    for(const e of s.effects){
      const family=e.recipe.family,palette=FX[family]||[e.color,'#e4fffb',e.color];
      const count=dt>0?Math.ceil(dt*95*this.quality*(e.fade??1)):0;
      for(let i=0;i<count;i++){
        const a=(e.id*13.1+i*4.7+t*7),offset=Math.sin(a)*e.radius*.8;
        const x=e.x+Math.cos(a)*offset,z=e.y+Math.sin(a)*offset;
        if(family==='fire')this.addParticle(x,.1,z,palette[(e.id+i)%3],20+Math.abs(Math.sin(a))*20,.3+Math.abs(Math.sin(a))*.4,-e.vx*.1,-e.vy*.1,1.4);
        else if(family==='water')this.addParticle(x,hasRain(e)?1.7:.12,z,palette[i%3],8+Math.abs(Math.sin(a))*10,.4,e.vx*.15,e.vy*.15,hasRain(e)?-3:.2);
        else if(family==='wind'||family==='whorling-wind'){const r=e.radius*(.3+Math.abs(Math.sin(a)));this.addParticle(e.x+Math.cos(a)*r,.15,e.y+Math.sin(a)*r,palette[i%3],6,.35,Math.cos(a+1.57)*3+e.vx*.4,Math.sin(a+1.57)*3+e.vy*.4,.3);}
        else this.addParticle(x,.15,z,palette[i%3],family==='smoke'?68:15,.55,Math.cos(a)*.25,Math.sin(a)*.25,.3);
      }
    }
    let index=0;const scale=this.container.clientHeight/(this.camera.top-this.camera.bottom)/45;
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles[i]=this.particles.at(-1);this.particles.pop();continue;}p.x+=p.vx*dt;p.z+=p.vz*dt;p.y=Math.max(.04,p.y+p.vy*dt);const a=p.life/p.max;
      this.positions.set([p.x,p.y,p.z],index*3);this.colors.set([p.color.r,p.color.g,p.color.b],index*3);this.alphas[index]=Math.min(1,a*2)*.8;this.sizes[index]=p.size*scale*(.5+a*.5);index++;}
    this.points.geometry.setDrawRange(0,index);for(const attr of Object.values(this.points.geometry.attributes))attr.needsUpdate=true;
    this.bursts=this.bursts.filter(b=>(b.age+=dt)<.7);
    for(let i=0;i<2;i++){const w=this.wells[i];w.position.set(s.players[i].x,0,s.players[i].y);w.rotation.z=s.players[i].hp<100?Math.sin(t*4)*.02:0;}
    if(this.shake>.001){this.camera.position.x=24+this.pan.x+Math.sin(t*71)*this.shake;this.camera.position.z=14+this.pan.y+Math.cos(t*59)*this.shake;this.shake*=Math.exp(-dt*12);}else {this.camera.position.x=24+this.pan.x;this.camera.position.z=14+this.pan.y;}
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.observer.disconnect();this.scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.texture.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
function hasRain(e){return e.recipe.shape==='rain';}

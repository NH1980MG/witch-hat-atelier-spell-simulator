import {DUEL_CATALOG} from './ink-duel-catalog.mjs';
import {createMatch,command as localCommand,stepMatch,sealAt,isSealIntact,RULES} from './ink-duel-engine.mjs?v=ai-tactics-3';
import {OnlineDuel} from './ink-duel-online.mjs';
import {nearestSegment,distance} from './ink-duel-strokes.mjs';
import {DuelRenderer} from './ink-duel-renderer.mjs?v=steering-1';
import {createDuelPhysics} from './ink-duel-world.mjs';
import {rectangle,insideRect,strokePoints,attachGlyph,syncDrawnSeals,stampGlyph} from './ink-duel-freehand.mjs?v=5';

const $=id=>document.getElementById(id),keys=new Set();
import {effectAt,steerEffect} from './ink-duel-steering.mjs';
import {followWellPan} from './ink-duel-camera.mjs';
let selectedEffect=null;
let online=null;
function command(state,action){return online?online.action(state,action):localCommand(state,action);}
let s=createMatch(),view,physics,tool='draw',selected=null,wellSelected=false,drag=null,pointer=null,region=null,regionSerial=0,worker=null,requestId=0,busy=false,analysisWasPaused=false,optionWasPaused=false,last=0,accumulator=0,uiTime=0,toastUntil=0,resultShown=false;
function icon(name){return `assets/symbol-glyphs/${name.toLowerCase().replaceAll(' ','-')}.png`;}
function notify(text){$('toast').textContent=text;$('toast').classList.add('visible');toastUntil=performance.now()+5000;}
function perform(c){const r=command(s,c);if(!r.ok)notify(r.message);refresh();return r;}
function invalidate(){view.lastTexture=-1;}
function setTool(value){tool=value;const input=document.querySelector(`[name="tool"][value="${value}"]`);if(input)input.checked=true;else document.querySelectorAll('[name="tool"]').forEach(e=>e.checked=false);view.preview=null;}
function select(id,well=false){selectedEffect=null;view.selectedEffect=null;selected=id;wellSelected=well;view.selected=id;view.selectedWell=well;keys.clear();const seal=s.seals.find(x=>x.id===id);if(seal){$('angle').value=Math.round(seal.angle*180/Math.PI);$('angleValue').textContent=`${$('angle').value}°`;}invalidate();refresh();}
function available(entry){return entry.status!=='unavailable'&&(entry.status!=='experimental'||s.mode==='experimental');}
function populateExamples(){const old=$('example').value;$('example').replaceChildren();for(const e of DUEL_CATALOG.filter(available)){const o=document.createElement('option');o.value=e.name;o.textContent=`${e.name}${s.usedTemplates.includes(e.name)?' (utilise)':''}`;o.disabled=s.usedTemplates.includes(e.name);$('example').append(o);}if([...$('example').options].some(o=>o.value===old&&!o.disabled))$('example').value=old;refreshExample();}
function refreshExample(){const name=$('example').value,used=s.usedTemplates.includes(name);$('exampleImage').src=icon(name);$('stamp').disabled=!name||used||busy;$('exampleStatus').textContent=used?'Exemple deja utilise':'1 utilisation restante';$('exampleRemaining').textContent=`${DUEL_CATALOG.filter(available).length-s.usedTemplates.length}`;}
function refresh(){
  for(const [i,p]of s.players.entries()){$(i?'enemyHp':'yourHp').textContent=`${Math.ceil(p.hp)} / 300`;$(i?'enemyMeter':'yourMeter').value=p.hp;}
  $('ink').textContent=Math.floor(s.players[0].ink);$('inkMeter').value=s.players[0].ink;
  const own=s.seals.filter(x=>x.owner===0),seal=own.find(x=>x.id===selected),active=own.filter(x=>x.active||x.charging).length;
  const remaining=Math.max(0,Math.ceil((s.phase==='overtime'?60:300)-s.phaseTime));$('timer').textContent=s.phase==='preparation'?'LIBRE':`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
  const phase={preparation:'Preparation libre',combat:'Combat',overtime:'Prolongation',ended:'Termine'}[s.phase];$('phase').textContent=phase;$('matchStatus').textContent=phase;$('activeCount').textContent=`${active} / 3 actifs`;$('begin').hidden=s.phase!=='preparation';$('pauseOverlay').hidden=!s.paused||busy||$('recognitionDialog').open||$('optionsDialog').open;
  $('selectionLabel').textContent=selectedEffect!=null?'Votre effet':wellSelected?'Votre encrier':seal?`${seal.recipe.sigil} - ${isSealIntact(s,seal)?'ferme':'brise'}`:'Aucune';$('angle').disabled=!seal;$('activate').disabled=!seal||s.phase==='preparation'||busy;$('activate').textContent=seal?.active||seal?.charging?'Arreter':'Activer';$('remove').disabled=!seal||busy;
  $('regionStatus').textContent=busy?'Analyse en cours...':!region?'Aucun perimetre':region.phase==='sizing'?'Premier coin fixe':`${region.strokeIds.length} trait(s) dans le perimetre`;$('analyze').disabled=busy||!region||region.phase!=='drawing'||!region.strokeIds.length;$('cancelRegion').disabled=!region||busy;$('zoomValue').textContent=`${Math.round(view.zoom*100)}%`;
  const signature=own.map(x=>`${x.id}:${x.active}:${x.charging>0}:${isSealIntact(s,x)}:${x.id===selected}`).join('|');
  if($('sealList').dataset.signature!==signature){$('sealList').dataset.signature=signature;$('sealList').replaceChildren();for(const item of own){const b=document.createElement('button');b.className=item.id===selected?'selected':'';b.textContent=`${item.recipe.sigil} · ${item.active?'actif':!isSealIntact(s,item)?'brise':'inactif'}`;b.addEventListener('click',()=>{select(item.id);setTool('select');});$('sealList').append(b);}}
  if(s.phase==='ended'&&!resultShown){resultShown=true;$('resultTitle').textContent=s.winner==='draw'?'Egalite':s.winner===0?'Victoire':'Defaite';$('resultScore').textContent=`${Math.ceil(s.players[0].hp)} / ${Math.ceil(s.players[1].hp)} PV`;$('resultDialog').showModal();}
}
function sync(){const before=new Set(s.seals.map(x=>x.id));const messages=online?(online.action(s,{type:'sync'}),[]):syncDrawnSeals(s);if(messages.length)notify(messages.at(-1));for(const seal of s.seals)if(seal.owner===0&&!before.has(seal.id)){select(seal.id);if(s.phase!=='preparation')perform({type:'activate',id:seal.id});}invalidate();}
function regionCorner(){
  if(busy||s.paused||s.phase==='ended')return;if(!pointer){notify('Positionnez le pointeur sur la toile');return;}
  if(!region){region={id:++regionSerial,phase:'sizing',a:{...pointer},rect:rectangle(pointer,pointer),strokeIds:[]};setTool('draw');}
  else if(region.phase==='sizing'){const r=rectangle(region.a,pointer);if(r.w<.2||r.h<.2){notify('Perimetre trop petit');return;}if(r.w>8||r.h>8){notify('Perimetre trop grand pour un seul symbole');return;}region.rect=r;region.phase='drawing';}
  else {notify('Validez le dessin ou annulez ce perimetre');return;}
  view.region=region.rect;invalidate();refresh();
}
function cancelRegion(){if(busy)return;if(region)for(const st of s.strokes)if(st.regionId===region.id)delete st.regionId;region=null;view.region=null;invalidate();refresh();}
function addStroke(points,regionId=null){const r=perform({type:'stroke',points,thickness:Number($('thickness').value)});if(r.ok){const st=s.strokes.find(x=>x.id===r.id);if(regionId){st.regionId=regionId;region.strokeIds.push(st.id);}else sync();}invalidate();return r;}
function stamp(point){
  const name=$('example').value,r=online?online.action(s,{type:'stamp',name,point}):stampGlyph(s,name,point);
  if(r.ok){populateExamples();setTool('draw');notify(`${name} : exemple utilise`);sync();if(r.glyph.sealId){select(r.glyph.sealId);if(s.phase!=='preparation')perform({type:'activate',id:r.glyph.sealId});}}else notify(r.message);
}
function pointerDown(e){
  if(s.paused||busy||s.phase==='ended'||e.button>2)return;const p=view.screenPoint(e.clientX,e.clientY);if(!p)return;pointer=p;e.preventDefault();view.renderer.domElement.focus();view.renderer.domElement.setPointerCapture(e.pointerId);
  if(e.button===2){const radius=7/view.container.clientWidth*(view.camera.right-view.camera.left),hit=nearestSegment(s,p,0,radius),seal=sealAt(s,p,0),well=distance(p,s.players[0])<.7;
    drag={type:'right',start:p,last:p,x:e.clientX,y:e.clientY,pan:{...view.pan},radius,id:hit?.stroke.id??seal?.strokeId,well,hit:!!hit,moved:false};
    if(well)select(null,true);else if(seal)select(seal.id);return;}
  if(e.button===1||tool==='pan'){drag={type:'pan',x:e.clientX,y:e.clientY,pan:{...view.pan}};return;}
  if(region?.phase==='sizing')return;
  if(region?.phase==='drawing'){if(!insideRect(p,region.rect)){notify('Dessinez dans le perimetre selectionne');return;}drag={type:'draw',points:[p],regionId:region.id};view.preview={stroke:drag.points};return;}
  if(distance(p,s.players[0])<.7){select(null,true);setTool('select');return;}
  if(tool==='stamp'){stamp(p);return;}
  if(tool==='repair'){drag={type:'repair'};command(s,{type:'repair',point:p});return;}
  if(tool==='aim'){if(selected)perform({type:'aim',id:selected,point:p});else notify('Selectionnez un cercle');return;}
  const effect=effectAt(s,p);if(effect){select(null);selectedEffect=effect.source;view.selectedEffect=effect.source;setTool('select');$('selectionLabel').textContent='Votre effet';invalidate();return;}
  const hit=sealAt(s,p,0);if(tool==='select'&&hit){select(hit.id);return;}
  if(hit&&nearestSegment(s,p,0,.12)?.stroke.sealId===hit.id){select(hit.id);setTool('select');return;}
  select(null);setTool('draw');drag={type:'draw',points:[p]};view.preview={stroke:drag.points};
}
function pointerMove(e){
  const p=view.screenPoint(e.clientX,e.clientY);if(!p)return;pointer=p;
  if(drag?.type==='right'){
    if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;
    drag.moved=true;
    if(region)return;
    if(drag.well)command(s,{type:'position-well',point:p});
    else if(drag.id){const r=command(s,{type:'move-ink',id:drag.id,dx:p.x-drag.last.x,dy:p.y-drag.last.y});if(r.ok)drag.last=p;}
    else {const r=view.renderer.domElement.getBoundingClientRect();view.pan.x=Math.max(-24,Math.min(456,drag.pan.x-(e.clientX-drag.x)/r.width*(view.camera.right-view.camera.left)));view.pan.y=Math.max(-14,Math.min(266,drag.pan.y-(e.clientY-drag.y)/r.height*(view.camera.top-view.camera.bottom)));view.resize();}
    invalidate();return;
  }
  if(drag?.type==='pan'){const r=view.renderer.domElement.getBoundingClientRect();view.pan.x=Math.max(-24,Math.min(456,drag.pan.x-(e.clientX-drag.x)/r.width*(view.camera.right-view.camera.left)));view.pan.y=Math.max(-14,Math.min(266,drag.pan.y-(e.clientY-drag.y)/r.height*(view.camera.top-view.camera.bottom)));view.resize();return;}
  if(region?.phase==='sizing'){region.rect=rectangle(region.a,p);view.region=region.rect;invalidate();}
  if(drag?.type==='draw'){
    const events=e.getCoalescedEvents?.()||[];
    for(const event of [...events,e]){const q=view.screenPoint(event.clientX,event.clientY);if(!q||drag.regionId&&!insideRect(q,region.rect))continue;
      if(distance(drag.points.at(-1),q)>1e-6&&drag.points.length<4096)drag.points.push(q);
    }invalidate();return;
  }
  if(drag?.type==='repair')command(s,{type:'repair',point:p});view.hoverSegment=nearestSegment(s,p,null,.15);
}
function pointerUp(e){
  if(drag?.type==='draw')pointerMove(e);
  if(drag?.type==='right'&&!drag.moved&&!drag.well&&drag.hit){const r=perform({type:'erase',point:drag.start,radius:drag.radius});if(r.ok){if(region)region.strokeIds=region.strokeIds.filter(id=>id!==r.id);if(!s.seals.some(x=>x.id===selected))select(null);view.hoverSegment=null;notify('Trait efface');}}
  if(drag?.type==='draw'&&drag.points.length>1)addStroke(drag.points,drag.regionId);if(drag?.type==='repair')command(s,{type:'repair',point:null});drag=null;view.preview=null;invalidate();refresh();if(view.renderer.domElement.hasPointerCapture(e.pointerId))view.renderer.domElement.releasePointerCapture(e.pointerId);
}
function finishAnalysis(){busy=false;s.paused=analysisWasPaused;refresh();}
function acceptRecognition(candidate){
  if(!region)return;const args={name:candidate.name,rect:region.rect,strokeIds:region.strokeIds,orientation:candidate.rotation};const r=online?online.action(s,{type:'glyph',...args}):attachGlyph(s,args);
  if(!r.ok){notify(r.message);finishAnalysis();return;}$('recognitionDialog').close();region=null;view.region=null;finishAnalysis();notify(`${candidate.name} reconnu`);sync();
  if(r.glyph.sealId){select(r.glyph.sealId);const seal=s.seals.find(x=>x.id===r.glyph.sealId);if(seal&&!seal.active&&!seal.charging&&s.phase!=='preparation')command(s,{type:'activate',id:seal.id});}
}
function analyze(){
  if(busy||!region||region.phase!=='drawing'||!region.strokeIds.length)return;
  const actions=region.strokeIds.map(id=>s.strokes.find(x=>x.id===id)).map(st=>({type:'free',width:.035*st.thickness*48,points:strokePoints(st).map(p=>({x:(p.x-region.rect.x)*48,y:(p.y-region.rect.y)*48}))}));
  analysisWasPaused=s.paused;s.paused=true;busy=true;keys.clear();refresh();
  worker?.terminate();worker=new Worker(new URL('./ink-duel-recognition-worker.mjs',import.meta.url),{type:'module'});const id=++requestId;
  const timeout=setTimeout(()=>{if(id===requestId&&busy){worker.terminate();finishAnalysis();notify('Analyse trop longue. Reduisez le dessin et reessayez.');}},15000);
  worker.onerror=()=>{clearTimeout(timeout);finishAnalysis();notify('La reconnaissance a echoue. Le dessin est conserve.');};
  worker.onmessage=({data})=>{clearTimeout(timeout);if(data.id!==requestId)return;const result=data.result;if(data.error||!result){finishAnalysis();notify('Analyse indisponible');return;}
    const choices=result.candidates.filter(c=>available(DUEL_CATALOG.find(e=>e.name===c.name)||{status:'unavailable'}));
    if(result.status==='accepted'&&choices[0]?.name===result.candidates[0]?.name){acceptRecognition(choices[0]);return;}
    busy=false;$('recognitionStatus').textContent=result.status==='unknown'?'Dessin non reconnu avec certitude.':'Resultat incertain : confirmez le symbole.';$('candidates').replaceChildren();
    for(const c of choices){const b=document.createElement('button'),img=document.createElement('img');img.src=icon(c.name);img.alt='';b.append(img,document.createTextNode(`${c.name} · ${Math.round(c.score)}%`));b.addEventListener('click',()=>acceptRecognition(c));$('candidates').append(b);}
    $('recognitionDialog').showModal();refresh();
  };worker.postMessage({id,actions});
}
async function restart(){if(online){await online.leave();online=null;}s.paused=true;keys.clear();worker?.terminate();requestId++;busy=false;$('optionsDialog').close();$('resultDialog').close();$('recognitionDialog').close();physics?.dispose();physics=await createDuelPhysics();s=createMatch({mode:$('experimental').checked?'experimental':'standard'});region=null;view.region=null;view.particles.length=0;view.preview=null;resultShown=false;accumulator=0;drag=null;select(null);setTool('draw');populateExamples();invalidate();refresh();$('networkStatus').textContent='Contre un bot';$('pause').disabled=false;}
function frame(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;if(!s.paused){
  if(selectedEffect!=null&&!s.effects.some(e=>e.source===selectedEffect&&e.owner===0)&&!s.objects.some(o=>o.source===selectedEffect&&o.owner===0&&o.hp>0))select(null);
  const dx=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),dy=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));
  if(dx||dy){if(selectedEffect!=null){if(online)online.action(s,{type:'steer',source:selectedEffect,dx,dy});else steerEffect(s,selectedEffect,dx,dy);}else if(wellSelected)command(s,{type:'move-well',dx,dy,dt});else if(selected==null){const step=10*dt/view.zoom/Math.hypot(dx,dy);view.pan.x=Math.max(-24,Math.min(456,view.pan.x+dx*step));view.pan.y=Math.max(-14,Math.min(266,view.pan.y+dy*step));view.resize();}}
  if((wellSelected&&(dx||dy))||(drag?.well&&drag.moved)){
    const pan=followWellPan(s.players[0],view.pan,view.camera,s.rules);
    if(Math.abs(pan.x-view.pan.x)>1e-8||Math.abs(pan.y-view.pan.y)>1e-8){Object.assign(view.pan,pan);view.resize();}
  }
  if(!online&&s.phase!=='preparation'){accumulator+=dt;while(accumulator>=RULES.step){stepMatch(s,RULES.step,physics);accumulator-=RULES.step;}}}
  view.update(s,s.paused?0:dt);uiTime+=dt;if(uiTime>.15){refresh();uiTime=0;}$('performance').textContent=busy?'Analyse locale':`${Math.round(view.zoom*100)}%`;if(now>toastUntil)$('toast').classList.remove('visible');requestAnimationFrame(frame);}

document.querySelectorAll('[name="tool"]').forEach(e=>e.addEventListener('change',()=>setTool(e.value)));
$('example').addEventListener('change',refreshExample);$('stamp').addEventListener('click',()=>{if(region){notify('Terminez le perimetre en cours');return;}setTool('stamp');notify('Choisissez un emplacement pour cet exemple');});
$('regionButton').addEventListener('click',regionCorner);$('cancelRegion').addEventListener('click',cancelRegion);$('analyze').addEventListener('click',analyze);
$('keepDrawing').addEventListener('click',()=>{$('recognitionDialog').close();finishAnalysis();});$('recognitionDialog').addEventListener('cancel',()=>finishAnalysis());
$('angle').addEventListener('input',()=>{if(selected){perform({type:'rotate',id:selected,angle:Number($('angle').value)*Math.PI/180});$('angleValue').textContent=`${$('angle').value}°`;invalidate();}});
$('activate').addEventListener('click',()=>perform({type:'activate',id:selected}));$('remove').addEventListener('click',()=>{perform({type:'remove',id:selected});s.glyphs=s.glyphs.filter(g=>g.sealId!==selected);select(null);invalidate();});
$('begin').addEventListener('click',()=>{if(online){online.ready().then(()=>notify('Pret : attente de votre adversaire')).catch(e=>notify(e.message));return;}perform({type:'start'});for(const seal of s.seals.filter(x=>x.owner===0).slice(0,3))command(s,{type:'activate',id:seal.id});});
$('pause').addEventListener('click',()=>{keys.clear();perform({type:'pause'});});$('resume').addEventListener('click',()=>perform({type:'pause'}));
$('settings').addEventListener('click',()=>{optionWasPaused=s.paused;s.paused=true;keys.clear();$('optionsDialog').showModal();refresh();});$('optionsDialog').addEventListener('close',()=>{s.paused=optionWasPaused;refresh();});
$('restart').addEventListener('click',()=>{if(confirm('Abandonner cette partie et recommencer ?'))restart();});$('again').addEventListener('click',restart);
for(const [id,factor]of [['zoomIn',1.2],['zoomOut',1/1.2]])$(id).addEventListener('click',()=>{view.zoomBy(factor);refresh();});$('resetCamera').addEventListener('click',()=>{view.resetCamera();refresh();});
$('reduced').addEventListener('change',()=>{view.reduced=$('reduced').checked;view.quality=view.reduced?.35:Number($('quality').value);});$('quality').addEventListener('change',()=>{view.quality=Number($('quality').value);});
document.addEventListener('keydown',e=>{if(e.repeat&&!e.key.startsWith('Arrow'))return;if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)||document.querySelector('dialog[open]'))return;
  if(e.code==='Space'){e.preventDefault();regionCorner();}else if(e.key==='Enter'){e.preventDefault();analyze();}else if(e.key==='Escape'){cancelRegion();setTool('draw');select(null);}else if(e.key.startsWith('Arrow')&&(wellSelected||selected==null)){e.preventDefault();keys.add(e.key);}});
document.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();s.paused=true;refresh();}});
try{physics=await createDuelPhysics();view=new DuelRenderer($('arena'));$('loading').remove();const canvas=view.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Toile de duel');canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>{drag=null;command(s,{type:'repair',point:null});view.preview=null;});canvas.addEventListener('wheel',e=>{e.preventDefault();view.zoomBy(Math.exp(-e.deltaY*.001));refresh();},{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());populateExamples();refresh();requestAnimationFrame(frame);}catch(e){console.error(e);$('loading').textContent='Le duel ne peut pas demarrer : '+e.message;}
window.addEventListener('pagehide',e=>{online?.leave();s.paused=true;keys.clear();worker?.terminate();if(!e.persisted){physics?.dispose();view?.dispose();}});
$('opponents').addEventListener('click',()=>{$('lobbyDialog').showModal();keys.clear();});
$('playBot').addEventListener('click',async()=>{await restart();$('lobbyDialog').close();});
async function joinOnline(mode){
  const code=$('roomCode').value;
  for(const id of ['createRoom','quickMatch','joinRoom','playBot'])$(id).disabled=true;
  try{
    await restart();s=createMatch({ai:false});s.paused=true;
    const connection=new OnlineDuel(snapshot=>{if(online!==connection)return;const paused=s.paused;s=snapshot;if(busy||$('optionsDialog').open)s.paused=paused;invalidate();refresh();},(message,failed)=>{
      $('networkStatus').textContent=message;$('lobbyStatus').textContent=message;
      if(failed){s.paused=true;notify(message);$('lobbyDialog').showModal();}
      else if(connection.players===2)$('lobbyDialog').close();
    });
    online=connection;await connection.join(mode,code);$('roomCode').value=connection.code;$('copyRoom').hidden=false;$('pause').disabled=true;
  }catch(e){if(online)await online.leave();online=null;s.paused=true;$('lobbyStatus').textContent=e.message;}
  finally{for(const id of ['createRoom','quickMatch','joinRoom','playBot'])$(id).disabled=false;}
}
$('createRoom').addEventListener('click',()=>joinOnline('create'));
$('quickMatch').addEventListener('click',()=>joinOnline('quick'));
$('joinRoom').addEventListener('click',()=>joinOnline('join'));
$('copyRoom').addEventListener('click',()=>navigator.clipboard.writeText($('roomCode').value).then(()=>{$('lobbyStatus').textContent='Code copie';}).catch(()=>{$('lobbyStatus').textContent='Selectionnez le code pour le copier';}));
$('cancelSearch').addEventListener('click',async()=>{if(online&&online.players!==2)await restart();$('lobbyDialog').close();});
$('lobbyDialog').addEventListener('cancel',e=>{if(online&&online.players!==2){e.preventDefault();$('cancelSearch').click();}});
$('lobbyDialog').showModal();

import { DUEL_CATALOG, PRESETS, compileDuelRecipe } from './ink-duel-catalog.mjs';
import { createMatch, command, stepMatch, sealAt, isSealIntact, RULES } from './ink-duel-engine.mjs';
import { nearestSegment, distance } from './ink-duel-strokes.mjs';
import { DuelRenderer } from './ink-duel-renderer.mjs';
import { createDuelPhysics } from './ink-duel-world.mjs';
import { SYMBOL_PATHS } from './symbol-catalog.mjs';

const $=id=>document.getElementById(id);
const WORDS={
  title:['Duel d encre','Ink Duel'],solo:['DUEL SOLO','SOLO DUEL'],yourWell:['Votre encrier','Your inkwell'],opponent:['Adversaire','Opponent'],loading:['Preparation de la toile...','Preparing the canvas...'],
  standard:['Standard','Standard'],experimental:['Regles experimentales (prochaine partie)','Experimental rules (next match)'],begin:['Commencer le combat','Begin combat'],tools:['Outils','Tools'],paused:['Pause','Paused'],resume:['Reprendre','Resume'],ink:['Encre disponible','Available ink'],composition:['Composition','Composition'],newSeal:['Nouveau cercle','New seal'],sigil:['Sigil','Sigil'],signs:['Signes','Signs'],orientation:['Orientation','Orientation'],thickness:['Epaisseur du trait','Stroke thickness'],cost:['Inscription','Inscription'],upkeep:['Entretien','Upkeep'],range:['Portee','Range'],inscribe:['Inscrire','Inscribe'],activate:['Activer','Activate'],deactivate:['Arreter','Stop'],preparation:['Preparation','Preparation'],combat:['Combat','Combat'],overtime:['Prolongation','Overtime'],ended:['Termine','Ended'],options:['Options du duel','Duel options'],reduced:['Effets attenues','Reduced effects'],quality:['Qualite des effets','Effect quality'],restart:['Nouvelle partie','New match'],close:['Fermer','Close'],back:['Retour a l atelier','Back to workshop'],
  win:['Victoire','Victory'],lose:['Defaite','Defeat'],draw:['Egalite','Draw'],saved:['Composition enregistree','Composition saved'],select:['Selectionnez un de vos cercles','Select one of your seals'],ready:['Cercle inscrit','Seal inscribed'],confirm:['Abandonner cette partie et recommencer ?','Abandon this match and restart?'],unavailable:['Indisponible','Unavailable'],invert:['Inverser','Invert'],active:['Actif','Active'],broken:['Brise','Broken'],idle:['Inactif','Idle'],charged:['Activation','Charging'],camera:['Camera','Camera'],repair:['Reparer','Repair'],aim:['Viser','Aim'],place:['Cercle','Seal'],pen:['Trace libre','Freehand'],apply:['Appliquer','Apply'],fatal:['Le rendu du duel n a pas pu demarrer. Rechargez la page avec WebGL active.','The duel renderer could not start. Reload with WebGL enabled.'],
};
let locale='fr';try{locale=localStorage.getItem('whaLocale')==='en'?'en':'fr';}catch{}
const tr=k=>WORDS[k]?.[locale==='fr'?0:1]||k;
const name=n=>locale==='en'?(DUEL_CATALOG.find(e=>e.name===n)?.english||n):n;
let s=createMatch(),view,physics,tool='select',selected=null,slot=0,composing=structuredClone(PRESETS[0]),angle=0,drag=null,last=0,accumulator=0,uiTime=0,toastUntil=0,resultShown=false,frames=0,frameSeconds=0,pausedForOptions=false;
let presets=structuredClone(PRESETS);
try{const stored=JSON.parse(localStorage.getItem('whaInkDuelLoadout'));if(Array.isArray(stored)&&stored.length===3){stored.forEach(p=>compileDuelRecipe(p,'experimental'));presets=stored;composing=structuredClone(presets[0]);}}catch{}

function icon(name){const paths=SYMBOL_PATHS[name]||[];return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><g fill="none" stroke="#284a4b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${paths.map(p=>`<path d="${p}"/>`).join('')}</g></svg>`)}`;}
function translate(){
  document.documentElement.lang=locale;document.title=`${tr('title')} | Witch Hat Atelier`;
  document.querySelectorAll('[data-t]').forEach(e=>e.textContent=tr(e.dataset.t));$('locale').textContent=locale==='fr'?'EN':'FR';
  const labels={select:'select',place:'place',draw:'pen',repair:'repair',aim:'aim',pan:'camera'};
  document.querySelectorAll('[name="tool"]').forEach(e=>{e.setAttribute('aria-label',tr(labels[e.value]));e.parentElement.title=tr(labels[e.value]);});
  populate();refresh();
}
function populate(){
  $('sigil').replaceChildren();
  for(const entry of DUEL_CATALOG.filter(e=>e.kind==='sigil')){
    const option=document.createElement('option');option.value=entry.name;option.textContent=`${name(entry.name)}${entry.status==='experimental'?' *':''}${entry.status==='unavailable'?' - '+tr('unavailable'):''}`;
    option.disabled=entry.status==='unavailable'||entry.status==='experimental'&&s.mode!=='experimental';$('sigil').append(option);
  }
  $('sigil').value=composing.sigil;$('signs').replaceChildren();
  for(const entry of DUEL_CATALOG.filter(e=>e.kind==='sign')){
    const label=document.createElement('label');label.title=entry.reason;if(entry.status==='experimental')label.className='experimental';
    const input=document.createElement('input');input.type='checkbox';input.value=entry.name;input.checked=composing.signs.some(v=>(typeof v==='string'?v:v.name)===entry.name);
    input.disabled=entry.status==='unavailable'||entry.status==='experimental'&&s.mode!=='experimental';
    const img=document.createElement('img');img.src=icon(entry.name);img.alt='';
    const text=document.createElement('span');text.textContent=name(entry.name)+(entry.status==='experimental'?' *':'');
    input.addEventListener('change',()=>{if(input.checked){if(composing.signs.length>=6){input.checked=false;notify('Maximum 6 signes / signs');return;}composing.signs.push({name:entry.name,inverted:false});}else composing.signs=composing.signs.filter(x=>(typeof x==='string'?x:x.name)!==entry.name);refreshRecipe();});
    label.append(input,img,text);$('signs').append(label);
  }
  refreshRecipe();
}
function refreshRecipe(){
  $('signCount').textContent=`${composing.signs.length} / 6`;
  $('sigilNote').textContent=DUEL_CATALOG.find(e=>e.name===composing.sigil)?.reason||'';
  $('inversions').replaceChildren();
  composing.signs=composing.signs.map(v=>typeof v==='string'?{name:v,inverted:false}:v);
  for(const sign of composing.signs)if(DUEL_CATALOG.find(x=>x.name===sign.name)?.invertible){
    const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=sign.inverted;
    check.addEventListener('change',()=>{sign.inverted=check.checked;refreshRecipe();});label.append(check,document.createTextNode(`${tr('invert')} ${name(sign.name)}`));$('inversions').append(label);
  }
  let recipe;try{recipe=compileDuelRecipe(composing,s.mode);$('validation').textContent='';$('place').disabled=false;}
  catch(e){$('validation').textContent=e.message;$('place').disabled=true;}
  $('cost').textContent=recipe?`${Math.ceil(recipe.cost+Math.PI*3.2)}`:'--';$('maintenance').textContent=recipe?`${recipe.upkeep.toFixed(1)}/s`:'--';$('range').textContent=recipe?`${recipe.range} u`:'--';
  if(view?.preview)view.preview.recipe=recipe;
}
function notify(message){$('toast').textContent=message;$('toast').classList.add('visible');toastUntil=performance.now()+3500;}
function setTool(value){tool=value;document.querySelector(`[name="tool"][value="${value}"]`).checked=true;if(view)view.preview=null;}
function perform(c){const result=command(s,c);if(!result.ok)notify(result.message);refresh();return result;}
function select(id){selected=id;view.selected=id;const seal=s.seals.find(x=>x.id===id);if(seal){composing={sigil:seal.recipe.sigil,signs:seal.recipe.signs.map(x=>({...x}))};populate();angle=seal.angle;$('angle').value=Math.round(angle*180/Math.PI);$('angleValue').textContent=`${Math.round(angle*180/Math.PI)}°`;}refresh();}
function refresh(){
  for(const [i,p]of s.players.entries()){$(i?'enemyHp':'yourHp').textContent=`${Math.ceil(p.hp)} / 300`;$(i?'enemyMeter':'yourMeter').value=p.hp;}
  const p=s.players[0];$('ink').textContent=Math.floor(p.ink);$('inkMeter').value=p.ink;
  const own=s.seals.filter(x=>x.owner===0),active=own.filter(x=>x.active||x.charging);
  const maintenance=active.reduce((v,x)=>v+x.recipe.upkeep,0);$('upkeep').textContent=`${(3-maintenance)>=0?'+':''}${(3-maintenance).toFixed(1)} / s`;
  const limit=s.phase==='preparation'?30:s.phase==='overtime'?60:300,seconds=Math.max(0,Math.ceil(limit-s.phaseTime));
  $('timer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  $('phase').textContent=tr(s.phase);$('matchStatus').textContent=tr(s.phase);$('activeCount').textContent=`${active.length} / 3 ${tr('active')}`;
  $('begin').hidden=s.phase!=='preparation';$('modeBadge').textContent=s.mode==='experimental'?'Experimental':tr('standard');$('pauseOverlay').hidden=!s.paused;
  const seal=s.seals.find(x=>x.id===selected);$('selectionLabel').textContent=seal?`${name(seal.recipe.sigil)} #${seal.id}`:tr('newSeal');
  $('place').textContent=seal&&tool!=='place'?tr('apply'):tr('inscribe');
  $('activate').disabled=!seal||s.phase==='preparation'||s.phase==='ended';$('activate').textContent=seal?.active||seal?.charging?tr('deactivate'):tr('activate');$('remove').disabled=!seal;
  $('sealList').replaceChildren();for(const item of own){const button=document.createElement('button');button.className=item.id===selected?'selected':'';
    const dot=document.createElement('span');dot.className=`dot ${item.active?'on':''}`;const title=document.createElement('span');title.textContent=name(item.recipe.sigil);
    const state=document.createElement('small');state.textContent=!isSealIntact(s,item)?tr('broken'):item.charging?tr('charged'):item.active?tr('active'):tr('idle');
    button.append(dot,title,state);button.addEventListener('click',()=>{select(item.id);setTool('select');});$('sealList').append(button);
  }
  document.querySelectorAll('[data-slot]').forEach(e=>{e.classList.toggle('selected',Number(e.dataset.slot)===slot);e.title=name(presets[Number(e.dataset.slot)].sigil);});
  if(s.phase==='ended'&&!resultShown){resultShown=true;$('resultTitle').textContent=tr(s.winner==='draw'?'draw':s.winner===0?'win':'lose');$('resultScore').textContent=`${Math.ceil(s.players[0].hp)} / ${Math.ceil(s.players[1].hp)} PV`;$('resultDialog').showModal();}
}
function pointerPoint(e){return view.screenPoint(e.clientX,e.clientY);}
function pointerDown(e){
  if(s.paused||s.phase==='ended'||e.button>1)return;
  const p=pointerPoint(e);if(!p)return;
  const canvas=view.renderer.domElement;canvas.setPointerCapture(e.pointerId);
  if(e.button===1||tool==='pan'){drag={type:'pan',x:e.clientX,y:e.clientY,pan:{...view.pan}};return;}
  if(tool==='place'){
    const result=perform({type:'place',owner:0,...p,angle,recipe:composing});if(result.ok){select(result.id);notify(tr('ready'));if(s.phase!=='preparation')perform({type:'activate',owner:0,id:result.id});}return;
  }
  if(tool==='draw'){drag={type:'draw',points:[p]};view.preview={stroke:drag.points};return;}
  if(tool==='repair'){drag={type:'repair'};command(s,{type:'repair',point:p,owner:0});return;}
  if(tool==='aim'){if(!selected){notify(tr('select'));return;}perform({type:'aim',id:selected,owner:0,point:p});select(selected);return;}
  select(sealAt(s,p,0)?.id??null);
}
function pointerMove(e){
  const p=pointerPoint(e);if(!p)return;
  if(drag?.type==='pan'){const rect=view.renderer.domElement.getBoundingClientRect();view.pan.x=drag.pan.x-(e.clientX-drag.x)/rect.width*(view.camera.right-view.camera.left);view.pan.y=drag.pan.y-(e.clientY-drag.y)/rect.height*(view.camera.top-view.camera.bottom);view.resize();return;}
  if(drag?.type==='draw'){if(distance(drag.points.at(-1),p)>.04&&drag.points.length<4096)drag.points.push(p);return;}
  if(drag?.type==='repair'){command(s,{type:'repair',owner:0,point:p});return;}
  if(tool==='place'){let recipe;try{recipe=compileDuelRecipe(composing,s.mode);}catch{}view.preview={point:p,recipe,angle,valid:p.x>=.85&&p.x<=11.15&&p.y>=.85&&p.y<=13.15};}
  view.hoverSegment=nearestSegment(s,p,null,.2);
}
function pointerUp(e){if(drag?.type==='draw')perform({type:'stroke',owner:0,points:drag.points,thickness:Number($('thickness').value)});if(drag?.type==='repair')command(s,{type:'repair',point:null});drag=null;view.preview=null;if(view.renderer.domElement.hasPointerCapture(e.pointerId))view.renderer.domElement.releasePointerCapture(e.pointerId);}
async function restart(){
  $('optionsDialog').close();$('resultDialog').close();s.paused=true;physics?.dispose();physics=await createDuelPhysics();s=createMatch({mode:$('experimental').checked?'experimental':'standard'});selected=null;view.selected=null;view.particles.length=0;resultShown=false;accumulator=0;
  composing=structuredClone(presets[slot]);try{compileDuelRecipe(composing,s.mode);}catch{composing=structuredClone(PRESETS[0]);}
  setTool('place');populate();refresh();
}
function frame(now){
  const dt=Math.min(.05,(now-last)/1000||0);last=now;
  const previousPhase=s.phase;
  if(!s.paused){accumulator+=dt;while(accumulator>=RULES.step){stepMatch(s,RULES.step,physics);accumulator-=RULES.step;}}
  if(previousPhase==='preparation'&&s.phase==='combat')activatePreparedSeals();
  view.update(s,s.paused?0:dt);uiTime+=dt;frames++;frameSeconds+=dt;
  if(uiTime>.15){refresh();uiTime=0;}
  if(frameSeconds>1){$('performance').textContent=`${Math.round(frames/frameSeconds)} FPS`;if(frames/frameSeconds<28)view.quality=Math.min(view.quality,.5);frames=0;frameSeconds=0;}
  if(now>toastUntil)$('toast').classList.remove('visible');requestAnimationFrame(frame);
}

$('locale').addEventListener('click',()=>{locale=locale==='fr'?'en':'fr';try{localStorage.setItem('whaLocale',locale);}catch{}translate();});
$('sigil').addEventListener('change',()=>{composing.sigil=$('sigil').value;refreshRecipe();});
$('angle').addEventListener('input',()=>{angle=Number($('angle').value)*Math.PI/180;$('angleValue').textContent=`${$('angle').value}°`;if(selected&&tool!=='place')perform({type:'rotate',id:selected,owner:0,angle});if(view.preview)view.preview.angle=angle;});
document.querySelectorAll('[name="tool"]').forEach(e=>e.addEventListener('change',()=>setTool(e.value)));
document.querySelectorAll('[data-slot]').forEach(e=>e.addEventListener('click',()=>{slot=Number(e.dataset.slot);composing=structuredClone(presets[slot]);populate();setTool('place');refresh();}));
$('saveSlot').addEventListener('click',()=>{try{compileDuelRecipe(composing,s.mode);presets[slot]=structuredClone(composing);localStorage.setItem('whaInkDuelLoadout',JSON.stringify(presets));notify(tr('saved'));refresh();}catch(e){notify(e.message);}});
$('place').addEventListener('click',()=>{if(selected&&tool!=='place'){perform({type:'recompose',owner:0,id:selected,recipe:composing});return;}selected=null;view.selected=null;setTool('place');refresh();});
$('activate').addEventListener('click',()=>perform({type:'activate',owner:0,id:selected}));
$('remove').addEventListener('click',()=>{if(perform({type:'remove',owner:0,id:selected}).ok)select(null);});
function activatePreparedSeals(){for(const seal of s.seals.filter(x=>x.owner===0&&!x.active&&!x.charging).slice(0,3))command(s,{type:'activate',owner:0,id:seal.id});}
$('begin').addEventListener('click',()=>{perform({type:'start'});activatePreparedSeals();});
$('pause').addEventListener('click',()=>perform({type:'pause'}));$('resume').addEventListener('click',()=>perform({type:'pause'}));
$('settings').addEventListener('click',()=>{pausedForOptions=!s.paused;s.paused=true;refresh();$('optionsDialog').showModal();});
$('optionsDialog').addEventListener('close',()=>{if(pausedForOptions)s.paused=false;refresh();});
$('restart').addEventListener('click',()=>{if(confirm(tr('confirm')))restart();});$('again').addEventListener('click',restart);
$('zoomIn').addEventListener('click',()=>view.zoomBy(1.15));$('zoomOut').addEventListener('click',()=>view.zoomBy(1/1.15));$('resetCamera').addEventListener('click',()=>view.resetCamera());
$('reduced').addEventListener('change',()=>{view.reduced=$('reduced').checked;view.quality=view.reduced?.35:Number($('quality').value);});$('quality').addEventListener('change',()=>{view.quality=Number($('quality').value);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&s.phase!=='ended'){s.paused=true;refresh();}});
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)||document.querySelector('dialog[open]'))return;if(e.code==='Space'){e.preventDefault();perform({type:'pause'});}if(e.key==='Escape'){setTool('select');}if(['1','2','3'].includes(e.key))document.querySelector(`[data-slot="${Number(e.key)-1}"]`).click();});
try{
  physics=await createDuelPhysics();view=new DuelRenderer($('arena'));$('loading').remove();$('reduced').checked=view.reduced;
  const canvas=view.renderer.domElement;canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>{drag=null;command(s,{type:'repair',point:null});view.preview=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();view.zoomBy(Math.exp(-e.deltaY*.001));},{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());
  translate();setTool('place');requestAnimationFrame(frame);
}catch(e){console.error(e);$('loading').textContent=tr('fatal');$('begin').disabled=true;}
window.addEventListener('pagehide',e=>{s.paused=true;if(!e.persisted){physics?.dispose();view?.dispose();}});

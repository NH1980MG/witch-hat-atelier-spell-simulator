import { assetStore, assetHash } from './effect-assets.mjs';
import { MAX_GLB_BYTES, validateGlb } from './effect-glb-validation.mjs';
import { normalizeAnimation, sampleTrack } from './effect-animation-model.mjs';
import { PART_TYPES } from './effect-authoring-model.mjs';
export function download(blob,name) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
export function initializeAssetsUI({getEffect,change,preview,editPose=()=>{},endPoseEdit=()=>{}}) {
  const panel=document.getElementById('modelAnimationPanel');
  panel.innerHTML=`<h2>Modèle & animation</h2>
    <p class="field-hint">Formes simples ici, personnages et animations complexes dans Blender. Aucun envoi en ligne.</p>
    <details><summary>Import, export et animations Blender</summary>
    <label>Source de la forme<select id="geometrySource"><option value="volumes">Volumes de l’atelier</option><option value="asset">Modèle Blender (GLB)</option></select></label>
    <label>Importer ou rattacher un GLB (50 Mo max)<input id="importGlb" type="file" accept=".glb"></label>
    <button id="exportGlb" type="button" class="button button-subtle">Exporter la forme vers Blender</button>
    <p id="modelStatus" role="status" class="field-hint">Les textures doivent être intégrées au GLB.</p>
    <details><summary>Comment utiliser Blender ?</summary><p>Dans Blender : Fichier → Importer → glTF 2.0. Modifiez votre modèle, puis exportez en glTF binaire (.glb), avec matériaux et animations, sans compression Draco. Réimportez ce fichier ici.</p><p>Pour suivre une trajectoire, préférez une animation sur place. Un déplacement inclus dans le clip s’ajoute au trajet.</p></details>
    <h3>Animation Blender</h3><label>Clip<select id="modelClip"><option value="">Aucun clip</option></select></label>
    <label>Vitesse du clip<input id="clipSpeed" type="number" min="0.1" max="3" step="0.1" value="1"></label>
    <label><input id="clipLoop" type="checkbox" checked> Boucler le clip</label>
    </details>
    <h3>Timeline</h3><p class="field-hint">Une ligne par volume. Cliquez pour choisir un instant ; glissez un repère pour le déplacer (flèches au clavier : 0,05 s). Ajoutez un volume dans Forme, puis programmez son apparition ici.</p>
    <div class="author-row"><button id="timelinePlay" type="button" class="button button-subtle">Lecture / pause</button><button id="timelineStart" type="button" class="button button-subtle">Début</button></div>
    <div id="effectTimeline" class="effect-timeline"></div>
    <h3>Mes poses clés</h3><p class="field-hint">Animez position, rotation et taille, sans toucher aux os. Les poses s’ajoutent à la trajectoire du sort.</p>
    <label>Cible<select id="poseTarget"><option value="object">Objet entier</option></select></label>
    <label>Durée (secondes)<input id="poseDuration" type="number" min="0.1" max="60" step="0.1" value="6"></label>
    <label><input id="poseLoop" type="checkbox" checked> Boucler les poses</label>
    <label>Interpolation<select id="poseInterpolation"><option value="linear">Régulière</option><option value="smooth">Départ et arrivée adoucis</option><option value="step">Instantanée</option></select></label>
    <label>Temps<input id="poseTime" type="range" min="0" max="6" step="0.05" value="0"><output id="poseTimeLabel">0 s</output></label>
    <label>Instant précis (secondes)<input id="poseTimeNumber" type="number" min="0" max="60" step="0.05" value="0"></label>
    <label>Pose enregistrée<select id="poseKey"><option value="">Nouvelle pose</option></select></label>
    <div id="poseFields" class="effect-field-grid"></div>
    <button id="editPosePreview" type="button" class="button button-subtle">Modifier cette pose dans l’aperçu</button>
    <label><input id="poseVisible" type="checkbox" checked> Visible à partir de cet instant</label>
    <div class="author-row"><button id="appearPose" type="button" class="button button-subtle">Faire apparaître ici</button><button id="hidePose" type="button" class="button button-subtle">Faire disparaître ici</button></div>
    <label>Forme à cet instant<select id="poseShape"><option value="">Forme d’origine</option></select></label>
    <p class="field-hint">La forme et la visibilité changent instantanément. Position, rotation et taille suivent l’interpolation choisie.</p>
    <div class="author-row"><button id="capturePose" type="button" class="button button-subtle">Copier la transformation du volume</button><button id="savePose" type="button" class="button button-primary">Enregistrer la pose</button><button id="removePose" type="button" class="button button-subtle">Supprimer la pose</button></div>
    <p id="poseStatus" class="field-hint" role="status"></p>`;
  const $=id=>document.getElementById(id);
  for(const [value,name] of Object.entries(PART_TYPES)) if(value!=='contour') $('poseShape').add(new Option(name,value));
  const fields=[];
  for(const [field,label,base] of [['position','Position',0],['rotation','Rotation (°)',0],['scale','Échelle',1]]) for(let i=0;i<3;i++) {
    const l=document.createElement('label');l.textContent=`${label} ${'XYZ'[i]}`;
    const input=document.createElement('input');input.type='number';input.step=field==='rotation'?'5':'.1';input.value=base;
    input.min=field==='scale'?'.05':field==='rotation'?'-180':'-4';input.max=field==='rotation'?'180':'4';
    l.append(input);$('poseFields').append(l);fields.push({field,i,input});
  }
  let request=0,signature='';
  const status=(message,clips)=>{
    $('modelStatus').textContent=message;
    if(clips) { $('modelClip').replaceChildren(new Option('Aucun clip',''),...clips.map(n=>new Option(n,n)));$('modelClip').value=getEffect().clip.name; }
  };
  $('geometrySource').onchange=()=>change({geometrySource:$('geometrySource').value});
  $('importGlb').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    const token=++request;status('Vérification du fichier…');
    try {
      if(file.size>MAX_GLB_BYTES) throw new Error('50 Mo maximum.');
      const buffer=await file.arrayBuffer();validateGlb(buffer);
      const {loadGlb,disposeModel}=await import('./effect-model-io.mjs');
      const model=await loadGlb(buffer),clips=model.animations.map(c=>c.name);disposeModel(model.scene);
      if(token!==request)return;
      const id=await assetHash(buffer);await assetStore.put({id,name:file.name,blob:new Blob([buffer])});
      if(token!==request)return;
      change({assetId:id,geometrySource:'asset',clip:{name:'',speed:1,loop:true}});status(`${file.name} enregistré sur cet appareil.`,clips);
    } catch(e) {if(token===request)status(`Import impossible : ${e.message}`);}
    event.target.value='';
  };
  $('exportGlb').onclick=async()=>{
    try {
      const e=getEffect();
      if(e.geometrySource==='asset') {
        const record=await assetStore.get(e.assetId);if(!record)throw new Error('GLB manquant.');
        download(record.blob,record.name);status('GLB original exporté, avec ses clips. Les poses de l’atelier sont dans la sauvegarde JSON.');
      } else {const data=await preview()?.exportModel();if(!data)throw new Error('Aperçu indisponible.');download(new Blob([data]),'forme-atelier.glb');status('Forme exportée. Les poses de l’atelier restent dans la sauvegarde JSON.');}
    } catch(e) {status(e.message);}
  };
  for(const id of ['modelClip','clipSpeed','clipLoop']) $(id).onchange=()=>change({clip:{name:$('modelClip').value,speed:Number($('clipSpeed').value),loop:$('clipLoop').checked}});
  function track() {return getEffect().animation.tracks.find(t=>t.target===$('poseTarget').value);}
  function writeFields(pose) {for(const {field,i,input} of fields)input.value=pose?.[field]?.[i]??(field==='scale'?1:0);$('poseVisible').checked=pose?.visible!==false;$('poseShape').value=pose?.shape||'';}
  function readFields() {return {...Object.fromEntries(['position','rotation','scale'].map(f=>[f,fields.filter(v=>v.field===f).map(v=>Number(v.input.value))])),visible:$('poseVisible').checked,shape:$('poseShape').disabled?'':$('poseShape').value};}
  function basePose(target=$('poseTarget').value) {
    const p=getEffect().parts.find(p=>p.id===target);
    return p?{position:[p.x,p.y,p.z],rotation:[p.rx,p.ry,p.rz],scale:[p.sx,p.sy,p.sz]}:null;
  }
  function selectTime(time,target=$('poseTarget').value) {
    endPoseEdit();
    $('poseTarget').value=target;syncKeys();
    const t=Math.max(0,Math.min(getEffect().animation.duration,time));
    $('poseTime').value=t;if(document.activeElement!==$('poseTimeNumber'))$('poseTimeNumber').value=t;$('poseTimeLabel').textContent=`${t.toFixed(2)} s`;
    const pose=track()?sampleTrack(track(),t):basePose();writeFields(pose);
    $('poseKey').value=track()?.keys.some(k=>k.time===t)?String(t):'';
    preview()?.seek(t);updateCursor(t);
  }
  function updateCursor(time) {$('effectTimeline').style.setProperty('--cursor',`${100*time/getEffect().animation.duration}%`);}
  function moveKey(target,oldTime,time) {
    const e=getEffect(),animation=structuredClone(e.animation),t=animation.tracks.find(t=>t.target===target);
    const k=t?.keys.find(k=>k.time===oldTime);if(!k)return;
    const next=Math.max(0,Math.min(animation.duration,Math.round(time*20)/20));
    t.keys=t.keys.filter(key=>key!==k&&key.time!==next);t.keys.push({...k,time:next});
    change({animation});selectTime(next,target);
    [...$('effectTimeline').querySelectorAll('.timeline-key')].find(b=>b.dataset.target===target&&Number(b.dataset.time)===next)?.focus();
  }
  function renderTimeline() {
    const e=getEffect();$('effectTimeline').replaceChildren();
    const ruler=document.createElement('div');ruler.className='timeline-ruler';
    for(const text of ['0 s',`${e.animation.duration} s`]){const label=document.createElement('span');label.textContent=text;ruler.append(label);}
    $('effectTimeline').append(ruler);
    for(const [target,name] of [['object','Objet entier'],...(e.geometrySource==='asset'?[]:e.parts.map(p=>[p.id,p.name]))]) {
      const row=document.createElement('div');row.className='timeline-row';
      const label=document.createElement('button');label.type='button';label.className='timeline-name';label.textContent=name;label.onclick=()=>selectTime(Number($('poseTime').value),target);
      const lane=document.createElement('div');lane.className='timeline-lane';lane.setAttribute('aria-label',`Piste ${name}`);
      const cursor=document.createElement('span');cursor.className='timeline-cursor';lane.append(cursor);
      const at=x=>(x-lane.getBoundingClientRect().left)/lane.getBoundingClientRect().width*e.animation.duration;
      lane.onclick=event=>{if(event.target===lane)selectTime(Math.round(at(event.clientX)*20)/20,target);};
      for(const key of e.animation.tracks.find(t=>t.target===target)?.keys||[]) {
        const marker=document.createElement('button');marker.type='button';marker.className='timeline-key';marker.style.left=`${100*key.time/e.animation.duration}%`;marker.textContent=key.visible===false?'○':'◆';
        marker.dataset.target=target;marker.dataset.time=key.time;
        marker.title=`${name} · ${key.time.toFixed(2)} s${key.visible===false?' · masqué':''}${key.shape?` · ${PART_TYPES[key.shape]}`:''}`;marker.setAttribute('aria-label',marker.title);
        marker.onclick=event=>{event.stopPropagation();selectTime(key.time,target);};
        let drag=null;
        marker.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();drag={id:event.pointerId,x:event.clientX};marker.setPointerCapture(event.pointerId);};
        marker.onpointermove=event=>{if(drag?.id===event.pointerId)marker.style.left=`${Math.max(0,Math.min(100,100*at(event.clientX)/e.animation.duration))}%`;};
        marker.onpointerup=event=>{if(drag?.id!==event.pointerId)return;const moved=Math.abs(drag.x-event.clientX)>3;drag=null;if(moved)moveKey(target,key.time,at(event.clientX));else selectTime(key.time,target);};
        marker.onpointercancel=()=>{drag=null;marker.style.left=`${100*key.time/e.animation.duration}%`;};
        marker.onkeydown=event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();moveKey(target,key.time,key.time+(event.key==='ArrowRight'?.05:-.05));}};
        lane.append(marker);
      }
      row.append(label,lane);$('effectTimeline').append(row);
    }
    updateCursor(Number($('poseTime').value));
  }
  $('timelinePlay').onclick=()=>preview()?.toggle();$('timelineStart').onclick=()=>selectTime(0);
  let frame;
  function followPlayback() {const state=preview()?.playback();if(state?.playing){$('poseTime').value=state.time;if(document.activeElement!==$('poseTimeNumber'))$('poseTimeNumber').value=state.time.toFixed(2);$('poseTimeLabel').textContent=`${state.time.toFixed(2)} s`;updateCursor(state.time);}frame=requestAnimationFrame(followPlayback);}
  frame=requestAnimationFrame(followPlayback);window.addEventListener('pagehide',()=>cancelAnimationFrame(frame),{once:true});
  function syncKeys() {
    $('poseKey').replaceChildren(new Option('Nouvelle pose',''),...(track()?.keys||[]).map(k=>new Option(`${k.time.toFixed(2)} s`,String(k.time))));
    $('poseInterpolation').value=track()?.interpolation||'linear';
    $('poseShape').disabled=$('poseTarget').value==='object';
  }
  $('poseTarget').onchange=()=>selectTime(Number($('poseTime').value));
  $('poseKey').onchange=()=>{
    const key=track()?.keys.find(k=>String(k.time)===$('poseKey').value);if(!key)return;
    selectTime(key.time);
  };
  $('poseTime').oninput=()=>selectTime(Number($('poseTime').value));
  $('poseTimeNumber').oninput=()=>{if(Number.isFinite($('poseTimeNumber').valueAsNumber))selectTime($('poseTimeNumber').valueAsNumber);};
  $('editPosePreview').onclick=()=>{
    if($('poseTarget').value==='object'||getEffect().geometrySource==='asset'){$('poseStatus').textContent='Choisissez un volume de l’atelier pour le manipuler.';return;}
    editPose($('poseTarget').value,Number($('poseTime').value),readFields());
    $('poseStatus').textContent='Glissez le volume dans l’aperçu, puis Enregistrer la pose. La forme de base reste inchangée.';
  };
  $('capturePose').onclick=()=>{
    const part=getEffect().parts.find(p=>p.id===$('poseTarget').value);
    if(!part){$('poseStatus').textContent='Choisissez un volume pour copier sa transformation.';return;}
    writeFields({position:[part.x,part.y,part.z],rotation:[part.rx,part.ry,part.rz],scale:[part.sx,part.sy,part.sz]});
  };
  function updateAnimation(remove=false,appearance=false) {
    endPoseEdit();
    const e=getEffect(),animation=structuredClone(e.animation),target=$('poseTarget').value,time=Number($('poseTime').value);
    let t=animation.tracks.find(t=>t.target===target);
    if(!t){t={target,keys:[]};animation.tracks.push(t);}
    t.interpolation=$('poseInterpolation').value;t.keys=t.keys.filter(k=>k.time!==time);
    const pose=readFields();
    if(!remove) {
      if(!t.keys.length&&time>0)t.keys.push({time:0,...(basePose()||{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}),visible:!appearance,shape:''});
      t.keys.push({time,...pose});
    }
    animation.duration=Number($('poseDuration').value);animation.loop=$('poseLoop').checked;
    change({animation:normalizeAnimation(animation,e.parts.map(p=>p.id))});preview()?.seek(time);syncKeys();
    $('poseStatus').textContent=remove?'Pose supprimée.':'Pose enregistrée. Changez le temps pour la prochaine pose, ou lancez la lecture.';
  }
  $('savePose').onclick=()=>updateAnimation();$('removePose').onclick=()=>updateAnimation(true);
  $('appearPose').onclick=()=>{$('poseVisible').checked=true;updateAnimation(false,true);};
  $('hidePose').onclick=()=>{$('poseVisible').checked=false;updateAnimation();};
  for(const id of ['poseDuration','poseLoop']) $(id).onchange=()=>change({animation:{...getEffect().animation,duration:Number($('poseDuration').value),loop:$('poseLoop').checked}});
  return {status,captureEditedPart(part){
    $('poseTarget').value=part.id;syncKeys();
    const pose={...readFields(),position:[part.x,part.y,part.z],rotation:[part.rx,part.ry,part.rz],scale:[part.sx,part.sy,part.sz]};
    writeFields(pose);preview()?.setPoseDraft(part.id,pose);
  },sync(e){
    $('geometrySource').value=e.geometrySource;$('clipSpeed').value=e.clip.speed;$('clipLoop').checked=e.clip.loop;
    $('poseDuration').value=e.animation.duration;$('poseLoop').checked=e.animation.loop;$('poseTime').max=e.animation.duration;$('poseTimeNumber').max=e.animation.duration;
    const next=JSON.stringify(e.parts.map(p=>[p.id,p.name]));
    if(next!==signature){const selected=$('poseTarget').value;signature=next;$('poseTarget').replaceChildren(new Option('Objet entier','object'),...e.parts.map(p=>new Option(p.name,p.id)));$('poseTarget').value=e.parts.some(p=>p.id===selected)?selected:'object';}
    syncKeys();
    renderTimeline();
  }};
}

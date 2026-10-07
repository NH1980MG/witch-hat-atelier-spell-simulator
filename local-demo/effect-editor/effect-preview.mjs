import * as THREE from "../../vendor/three/three.module.js";
import { OrbitControls } from "../../vendor/three/examples/jsm/controls/OrbitControls.js";
import { normalizeEffect } from "./effect-runtime-model.mjs";
import { estimateCombat, sampleTrajectory } from "./effect-authoring-model.mjs";
import { transformVolume } from "./effect-manipulation.mjs";
import { assetStore } from './effect-assets.mjs';
import { loadGlb, exportGlb, disposeModel } from './effect-model-io.mjs';
import { sampleTrack } from './effect-animation-model.mjs';

function primitiveGeometry(type) {
  return type==='box'?new THREE.BoxGeometry(1,1,1)
    :type==='cone'?new THREE.ConeGeometry(.5,1,32)
    :type==='cylinder'?new THREE.CylinderGeometry(.5,.5,1,32)
    :type==='torus'?new THREE.TorusGeometry(.8,.12,12,64)
    :type==='crystal'?new THREE.OctahedronGeometry(.75)
    :new THREE.SphereGeometry(1,24,16);
}

export function createEffectPreview(canvas, report, interaction = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x182c33);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(7, 5, 9);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.7, 0);
  controls.enableDamping = true;
  controls.minDistance = 4;
  controls.maxDistance = 20;
  scene.add(new THREE.HemisphereLight(0xedf8ff, 0x796348, 2.5));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(3, 6, 4);
  scene.add(light);
  const grid = new THREE.GridHelper(14, 28, 0x748a8d, 0x304950);
  scene.add(grid);
  const circle = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.63, 80), new THREE.MeshBasicMaterial({ color: 0xd4ae64, side: THREE.DoubleSide }));
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = 0.02;
  scene.add(circle);
  const root = new THREE.Group();
  scene.add(root);
  let recipe = { effect: normalizeEffect(), stages: [] };
  let objects = [], time = 0, last = performance.now(), stageIndex = -1, frame, disposed = false;
  let playing = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = normalizeEffect();
  let combat = estimateCombat(current);
  let editing = false, selected = 0, editMode = "move", editAxis = "free", drag = null;
  let coreGroup = null, volumes = [];
  let generation = 0, mixer = null, clipAction = null, poseGroup = null;
  const poseDrafts = new Map();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const selection = new THREE.BoxHelper(new THREE.Object3D(), 0xffd27c);
  selection.material.depthTest = false;
  selection.renderOrder = 10;
  selection.visible = false;
  scene.add(selection);
  function applyPart(mesh, part) {
    mesh.position.set(part.x, part.y, part.z);
    mesh.scale.set(part.sx, part.sy, part.sz);
    mesh.rotation.set(...[part.rx, part.ry, part.rz].map(v => v * Math.PI / 180));
  }
  function setRay(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }
  function finishDrag(cancel = false) {
    if (!drag) return;
    const completed = drag;
    drag = null;
    controls.enabled = true;
    if (canvas.hasPointerCapture(completed.pointerId)) canvas.releasePointerCapture(completed.pointerId);
    if (cancel) applyPart(completed.mesh, completed.original);
    else interaction.commit?.(completed.index, completed.value);
  }
  function pointerDown(event) {
    if (!editing || event.button !== 0 || drag) return;
    scene.updateMatrixWorld(true);
    setRay(event);
    const hit = raycaster.intersectObjects(volumes.filter(m=>m.visible), false)[0];
    if (!hit) return;
    event.preventDefault(); event.stopImmediatePropagation();
    controls.enabled = false;
    selected = hit.object.userData.partIndex;
    interaction.select?.(selected);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), hit.point);
    const m=hit.object, original={...current.parts[selected],x:m.position.x,y:m.position.y,z:m.position.z,sx:m.scale.x,sy:m.scale.y,sz:m.scale.z,rx:m.rotation.x*180/Math.PI,ry:m.rotation.y*180/Math.PI,rz:m.rotation.z*180/Math.PI};
    drag = { pointerId: event.pointerId, index: selected, mesh: hit.object, original, value: {...original},
      plane, start: coreGroup.worldToLocal(hit.point.clone()), x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    setRay(event);
    const point = raycaster.ray.intersectPlane(drag.plane, new THREE.Vector3());
    if (!point) return;
    const delta = coreGroup.worldToLocal(point).sub(drag.start);
    // An axis viewed end-on cannot be dragged reliably on the camera plane.
    if (editAxis !== "free" && editMode === "move") {
      const axis = new THREE.Vector3(editAxis === "x" ? 1 : 0, editAxis === "y" ? 1 : 0, editAxis === "z" ? 1 : 0).transformDirection(coreGroup.matrixWorld);
      if (Math.abs(axis.dot(camera.getWorldDirection(new THREE.Vector3()))) > .95) delta[editAxis] = (event.clientX - drag.x - event.clientY + drag.y) / 100;
    }
    drag.value = transformVolume(drag.original, editMode, editAxis, delta, { x: event.clientX - drag.x, y: event.clientY - drag.y });
    applyPart(drag.mesh, drag.value);
  }
  function pointerUp(event) { if (drag && drag.pointerId === event.pointerId) { event.stopImmediatePropagation(); finishDrag(event.type !== "pointerup"); } }
  function keyDown(event) { if (event.key === "Escape" && drag) { event.preventDefault(); finishDrag(true); } }
  canvas.addEventListener("pointerdown", pointerDown, true);
  canvas.addEventListener("pointermove", pointerMove, true);
  canvas.addEventListener("pointerup", pointerUp, true);
  canvas.addEventListener("pointercancel", pointerUp, true);
  canvas.addEventListener("lostpointercapture", pointerUp, true);
  window.addEventListener("keydown", keyDown);

  function clear() {
    generation++;
    mixer?.stopAllAction(); mixer = null; clipAction = null;
    disposeModel(root);
    root.clear();
    objects = [];
    volumes = [];
  }
  function build(effect) {
    clear();
    current = normalizeEffect(effect);
    combat = estimateCombat(current);
    const e = current;
    root.visible = !recipe.empty && !(e.geometrySource !== 'asset' && e.shape === "custom" && !e.parts.length);
    const material = new THREE.MeshStandardMaterial({
      color: e.color, metalness: e.material === "crystal" ? 0.35 : 0.05,
      roughness: e.material === "earth" ? 1 : 0.22,
      transparent: true, opacity: e.material === "air" ? 0.4 : e.material === "water" ? 0.75 : 1,
      emissive: e.color, emissiveIntensity: ["fire", "light"].includes(e.material) ? 0.8 : 0.08,
      flatShading: ["earth", "crystal"].includes(e.material),
    });
    const core = new THREE.Group();
    coreGroup = core;
    root.add(core);
    poseGroup = new THREE.Group(); core.add(poseGroup);
      const geometryParent = poseGroup;
    if (e.geometrySource === 'asset') {
      material.dispose();
      const token=generation;
      interaction.assetStatus?.('Chargement du modèle…');
      assetStore.get(e.assetId).then(async record=>{
        if(!record) throw new Error('Modèle manquant sur cet appareil : importez à nouveau son GLB.');
        const gltf=await loadGlb(await record.blob.arrayBuffer());
        if(disposed||token!==generation) {disposeModel(gltf.scene);return;}
        const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
        const fit=new THREE.Group();fit.scale.setScalar(2/Math.max(size.x,size.y,size.z,.001));
        const offset=new THREE.Group();offset.position.copy(center).multiplyScalar(-1);offset.add(gltf.scene);fit.add(offset);geometryParent.add(fit);
        mixer=new THREE.AnimationMixer(gltf.scene);
        const clip=gltf.animations.find(c=>c.name===e.clip.name);
        if(clip) {clipAction=mixer.clipAction(clip);clipAction.setLoop(e.clip.loop?THREE.LoopRepeat:THREE.LoopOnce,Infinity);clipAction.clampWhenFinished=true;clipAction.play();}
        interaction.assetStatus?.(`${record.name} · ${gltf.animations.length} animation(s)`,gltf.animations.map(c=>c.name));
      }).catch(error=>{if(token===generation) interaction.assetStatus?.(error.message,[]);});
    } else if (e.shape === "custom") {
      for (const [partIndex, part] of e.parts.entries()) {
        let geometry;
        if (part.type === "contour") {
          if (part.contour.length < 3) continue;
          const shape = new THREE.Shape(part.contour.map(p => new THREE.Vector2(p.x, p.y)));
          geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1 });
          geometry.translate(0, 0, -0.5);
        } else geometry = primitiveGeometry(part.type);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.partIndex = partIndex;
        mesh.userData.shape = part.type;
        mesh.position.set(part.x, part.y, part.z);
        mesh.scale.set(part.sx, part.sy, part.sz);
        mesh.rotation.set(...[part.rx, part.ry, part.rz].map(v => v * Math.PI / 180));
        geometryParent.add(mesh);
        volumes.push(mesh);
      }
    } else if (e.shape === "flower") {
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 12), material);
      geometryParent.add(center);
      const geometry = new THREE.SphereGeometry(1, 24, 12);
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        const petal = new THREE.Mesh(geometry, material);
        petal.scale.set(0.23, 0.58, 0.13);
        petal.position.set(Math.sin(angle) * 0.58, Math.cos(angle) * 0.58, 0);
        petal.rotation.z = -angle;
        geometryParent.add(petal);
      }
    } else {
      const geometry = e.shape === "column" ? new THREE.CylinderGeometry(0.35, 0.5, 2.3, 24)
        : e.shape === "ring" ? new THREE.TorusGeometry(0.8, 0.12, 12, 64)
        : e.shape === "shards" ? new THREE.OctahedronGeometry(0.75)
        : new THREE.SphereGeometry(0.7, 32, 24);
      geometryParent.add(new THREE.Mesh(geometry, material));
    }
    objects.push({ mesh: core, core: true, seed: 0 });
    if (e.motion === "path" && e.trajectory.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(e.trajectory.map(p => new THREE.Vector3(p.x, 2 + p.y, p.z)));
      root.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xe5bb73, transparent: true, opacity: 0.55 })));
    }
    const particleGeometry = e.material === "crystal" || e.shape === "shards" ? new THREE.OctahedronGeometry(0.12) : new THREE.SphereGeometry(0.07, 8, 6);
    for (let i = 0; i < (e.geometrySource === 'asset' ? 0 : e.count); i++) {
      const mesh = new THREE.Mesh(particleGeometry, material);
      root.add(mesh);
      objects.push({ mesh, core: false, seed: i / e.count });
    }
    if(e.geometrySource === 'asset') particleGeometry.dispose();
  }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  function animate(now) {
    if (disposed) return;
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (playing && !editing && !document.hidden) time += delta;
    const duration = recipe.effect.duration;
    const progress = (time % duration) / duration;
    const stages = editing ? [] : recipe.stages;
    const index = stages.length ? Math.min(stages.length - 1, Math.floor(progress * stages.length)) : 0;
    if (index !== stageIndex) {
      stageIndex = index;
      build(stages[index]?.effect || recipe.effect);
    }
    const localProgress = stages.length ? progress * stages.length - index : progress;
    const e = current;
    const elapsed = localProgress * duration / Math.max(1, stages.length);
    const animationTime = e.animation.loop && (playing || time>e.animation.duration) ? time % e.animation.duration : Math.min(time,e.animation.duration);
    if(!editing || poseDrafts.size) {
      for(const track of e.animation.tracks) {
        const target=track.target==='object'?poseGroup:volumes.find(m=>e.parts[m.userData.partIndex].id===track.target);
        const pose=poseDrafts.get(track.target)||sampleTrack(track,animationTime);
        if(drag?.mesh===target)continue;
        if(target&&pose) {
          target.position.fromArray(pose.position);target.rotation.set(...pose.rotation.map(n=>n*Math.PI/180));target.scale.fromArray(pose.scale);
          target.visible=pose.visible!==false;
          if(target.isMesh) {
            const part=e.parts[target.userData.partIndex],shape=pose.shape||part.type;
            if(shape!==target.userData.shape) {
              let geometry;
              if(shape==='contour') {
                const outline=new THREE.Shape(part.contour.map(p=>new THREE.Vector2(p.x,p.y)));
                geometry=new THREE.ExtrudeGeometry(outline,{depth:1,bevelEnabled:false,steps:1});geometry.translate(0,0,-.5);
              } else geometry=primitiveGeometry(shape);
              target.geometry.dispose();target.geometry=geometry;target.userData.shape=shape;
            }
          }
        }
      }
      if(mixer) {clipAction?.reset().play();mixer.setTime(time*e.clip.speed);}
    }
    for(const [id,pose] of poseDrafts) {
      const mesh=volumes.find(m=>e.parts[m.userData.partIndex].id===id);
      if(mesh&&drag?.mesh!==mesh){mesh.position.fromArray(pose.position);mesh.rotation.set(...pose.rotation.map(n=>n*Math.PI/180));mesh.scale.fromArray(pose.scale);mesh.visible=true;}
    }
    const speed = combat.speed;
    const pathPosition = !editing && e.motion === "path" ? sampleTrajectory(e.trajectory, elapsed * speed, e.pathMode) : null;
    root.rotation.y = e.angle * Math.PI / 180;
    for (const { mesh, core, seed } of objects) {
      const a = seed * Math.PI * 2 + time * e.speed;
      const phase = (elapsed * speed / 4 + seed) % 1;
      let x = core ? 0 : Math.cos(a) * e.spread;
      let y = 2 + (core ? Math.sin(time * e.speed * 2) * 0.13 : Math.sin(a * 2) * 0.4);
      let z = core ? 0 : Math.sin(a) * e.spread;
      if (e.motion === "orbit" && core) { x = Math.cos(elapsed * speed / e.spread) * e.spread; z = Math.sin(elapsed * speed / e.spread) * e.spread; }
      if (e.motion === "rise") y = 0.4 + phase * 4;
      if (e.motion === "rain") y = 4.5 - phase * 4;
      if (e.motion === "projectile") { x += (elapsed * speed % 5) - 2.5; }
      if (e.motion === "burst") {
        const radius = Math.min(elapsed * speed, 3 * e.spread);
        x = Math.cos(a) * radius; z = Math.sin(a) * radius; y = 2 + Math.sin(seed * 37) * radius * 0.6;
      }
      if (pathPosition) { x += pathPosition.x; y = 2 + pathPosition.y + (core ? 0 : Math.sin(a * 2) * 0.2); z += pathPosition.z; }
      if (editing) { x = core ? 0 : x; y = 2; z = core ? 0 : z; }
      mesh.visible = editing ? core : !(core && e.motion === "burst" && localProgress > 0.15);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(e.size * (core ? 1 : (e.motion === "burst" ? 2 : 1)));
      mesh.rotation.y = e.geometrySource === 'asset' || e.animation.tracks.length || e.shape === "custom" ? 0 : time * e.speed * (e.shape === "flower" ? 0.15 : 0.4);
    }
    controls.update();
    const selectedMesh = volumes.find(mesh => mesh.userData.partIndex === selected);
    selection.visible = editing && !!selectedMesh && root.visible;
    if (selection.visible) { scene.updateMatrixWorld(true); selection.setFromObject(selectedMesh); }
    renderer.render(scene, camera);
    report({ progress, label: editing ? "Modelage · animation suspendue" : recipe.empty ? "Ajoutez un symbole ou un exemple" : stages[index]?.label || "Effet personnalisé", index, playing });
    frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);
  return {
    setRecipe(value) { finishDrag(true); recipe = value; time = 0; stageIndex = -1; },
    selectPart(index) { selected = index; },
    setManipulation(enabled, mode, axis) { finishDrag(true); editing = enabled; editMode = mode; editAxis = axis; stageIndex = -1; },
    toggle() { playing = !playing; return playing; },
    restart() { time = 0; stageIndex = -1; },
    seek(seconds) {time=Math.max(0,seconds);playing=false;},
    setPoseDraft(id,pose) {poseDrafts.set(id,structuredClone(pose));},
    clearPoseDraft() {poseDrafts.clear();},
    playback() { return {time:current.animation.loop?time%current.animation.duration:Math.min(time,current.animation.duration),playing:playing&&!editing}; },
    exportModel() { return exportGlb(poseGroup); },
    dispose() {
      finishDrag(true); disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      canvas.removeEventListener("pointerdown", pointerDown, true); canvas.removeEventListener("pointermove", pointerMove, true);
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.removeEventListener(type, pointerUp, true);
      window.removeEventListener("keydown", keyDown); selection.geometry.dispose(); selection.material.dispose();
      controls.dispose(); clear(); grid.geometry.dispose(); grid.material.dispose(); circle.geometry.dispose(); circle.material.dispose(); renderer.dispose();
    },
  };
}

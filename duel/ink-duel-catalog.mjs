import { SIGIL_PROFILES, SIGN_PROFILES } from './spell-grammar.mjs';
import { PALETTE_ELEMENTS, ENGLISH_DISPLAY_NAMES } from './symbol-palette-data.mjs';

const unknown = new Set(['Radial','Glaives','Aeriforme defini','Signe de vent','Lumiere vacillante']);
const experimental = new Set(['Diamant','Selection','Lancement','Fenetres','Rassemblement','Vent tourbillonnant','Arret temporel','Chat-hibou']);
export const DUEL_CATALOG = Object.freeze(PALETTE_ELEMENTS.map(entry => {
  const p = (entry.kind === 'sigil' ? SIGIL_PROFILES : SIGN_PROFILES)[entry.name];
  const noDuelBehavior = entry.kind==='sigil' && ((p.phase==='form' && p.family!=='sword') || p.family==='calling');
  const status = unknown.has(entry.name) || noDuelBehavior ? 'unavailable' : experimental.has(entry.name) ? 'experimental' : 'standard';
  return Object.freeze({...entry, english:ENGLISH_DISPLAY_NAMES[entry.name] || entry.name,
    status, reason:noDuelBehavior?'Manifestation connue, comportement de duel non defini. Aucun pouvoir de combat invente.':p?.mechanic || entry.meaning, operation:p?.operation, invertible:!!p?.invertible});
}));
export const PRESETS = Object.freeze([
  {sigil:'Feu',signs:['Colonne','Viseur','Projection']},
  {sigil:'Eau',signs:['Pluie','Region']},
  {sigil:'Terre',signs:['Enveloppe','Renforcement']},
]);

export function compileDuelRecipe(input, mode='standard') {
  const sigil=SIGIL_PROFILES[input?.sigil];
  if(!sigil) throw new Error('Sigil inconnu / Unknown sigil');
  const check=name=>{
    const entry=DUEL_CATALOG.find(x=>x.name===name);
    if(!entry || entry.status==='unavailable') throw new Error(`${name}: fonction indisponible / unavailable`);
    if(entry.status==='experimental' && mode!=='experimental') throw new Error(`${name}: mode experimental requis`);
    return entry;
  };
  check(input.sigil);
  if(!Array.isArray(input.signs) || input.signs.length>6) throw new Error('Maximum 6 signes');
  const signs=input.signs.map(s=>typeof s==='string'?{name:s,inverted:false}:s);
  const ops=[];
  const solid=sigil.phase==='solid'||sigil.phase==='form';
  for(const s of signs){
    check(s.name); const p=SIGN_PROFILES[s.name];
    if(!p) throw new Error('Signe inconnu');
    if(p.families && !p.families.includes(sigil.family)) throw new Error(`${s.name}: matiere incompatible`);
    if(p.phases && !p.phases.includes(sigil.phase) && !(solid&&p.phases.includes('solid'))) throw new Error(`${s.name}: matiere solide requise`);
    if(s.inverted&&!p.invertible) throw new Error(`${s.name}: inversion non disponible`);
    ops.push(s.inverted&&p.inverseOperation?p.inverseOperation:p.operation);
  }
  if(new Set(signs.map(x=>x.name)).size!==signs.length) throw new Error('Chaque signe ne compte qu une fois');
  if(ops.includes('solidify')&&!['solid','liquid','form'].includes(sigil.phase)) throw new Error('Solidification: matiere incompatible');
  if(ops.includes('purify')&&!['liquid','solid'].includes(sigil.phase)) throw new Error('Purification: eau ou terre requise');
  if(ops.includes('cool')&&sigil.family==='fire') throw new Error('Refroidissement et feu incompatibles');
  const forms=['column','dispersion','cloud','rain','orb','bolt','ribbon','coil','envelope'];
  const shapes=ops.filter(x=>forms.includes(x));
  if(shapes.length>1) throw new Error('Une forme principale par cercle');
  const shape=shapes[0]||(solid?'orb':'dispersion');
  if(ops.some(x=>['link','bind','puppet','entwine'].includes(x))&&!solid&&!ops.includes('solidify'))throw new Error('Ce signe exige une forme solide dans le duel');
  const area=['rain','cloud','dispersion','envelope'].includes(shape);
  const scale=ops.includes('resize')?1.5:ops.includes('shrink')?.65:1;
  const strength=ops.includes('strengthen')?1.6:1;
  const power=ops.includes('focus')?1.35:area?.7:1;
  const cost=12+signs.length*3+(solid?4:0);
  return Object.freeze({sigil:input.sigil,family:sigil.family,phase:sigil.phase,signs:signs.map(x=>({...x})),ops:Object.freeze(ops),
    shape,solid:solid||ops.includes('solidify'),area,scale,strength,power,regionInverted:signs.some(x=>x.name==='Region'&&x.inverted),
    radius:(area?2.1:.38)*scale*(ops.includes('focus')?.65:1),range:ops.includes('project')?12:8,
    speed:ops.includes('still')?0:ops.includes('burst')?7:ops.includes('bolt')?4:ops.includes('project')?3:2.8,
    upkeep:(solid?2:area?2:1)*scale*strength+(ops.includes('focus')?.5:0),cost,
    color:DUEL_CATALOG.find(x=>x.name===input.sigil).color});
}

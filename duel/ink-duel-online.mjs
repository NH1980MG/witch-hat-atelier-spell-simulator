import {applyOnlineAction,flipPlayers} from './ink-duel-online-rules.mjs';
import {createMatch,stepMatch,isSealIntact} from './ink-duel-engine.mjs';
import {DUEL_CLOUD} from './ink-duel-cloud-config.mjs';
import {DuelWire,encodeSnapshot,decodeSnapshot} from './ink-duel-wire.mjs';

export function applySeatAction(state,templates,seat,seq,action){
  const oldId=state.nextId;state.nextId=1e9+seat*1e12+seq*10000;
  if(seat)flipPlayers(state);state.usedTemplates=templates[seat];
  const all=state.glyphs;state.glyphs=all.filter(g=>g.strokeIds.some(id=>state.strokes.some(st=>st.id===id&&st.owner===0)));
  const others=all.filter(g=>!state.glyphs.includes(g));
  try{return applyOnlineAction(state,action);}finally{
    state.glyphs=[...others,...state.glyphs];templates[seat]=state.usedTemplates;
    if(seat)flipPlayers(state);state.nextId=oldId;
  }
}
export class OnlineDuel{
  constructor(onState,onStatus){
    this.onState=onState;this.onStatus=onStatus;this.seq=0;this.actions=new Map();this.active=false;
    this.acks=[0,0];this.templates=[[],[]];this.readyFlags=[false,false];this.snapshotId=0;this.lastSnapshot=0;
    this.token=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
  }
  async rpc(action,extra={}){
    const r=await fetch(DUEL_CLOUD.url+'/rest/v1/rpc/ink_duel_lobby',{method:'POST',headers:{apikey:DUEL_CLOUD.key,'Content-Type':'application/json'},body:JSON.stringify({p_action:action,p_token:this.token,p_code:this.code||'',...extra}),signal:AbortSignal.timeout(10000)});
    const result=await r.json();if(!r.ok)throw Error(result.message||'Connexion impossible');return result;
  }
  fail(message){if(!this.active)return;this.active=false;clearInterval(this.loop);clearTimeout(this.lobbyTimer);this.wire?.close();this.onStatus(message,true);}
  async join(mode,code){
    const result=await this.rpc('join',{p_mode:mode,p_code:code||''});
    this.code=result.code;this.channel=result.channel;this.seat=result.seat;this.players=result.players;this.readyFlags=result.ready;
    this.state=createMatch({ai:false});this.active=true;this.lastPeer=performance.now();
    this.wire=new DuelWire(DUEL_CLOUD,this.channel,m=>this.receive(m),m=>this.fail(m));
    try{await this.wire.open();}catch(e){await this.leave();throw e;}
    this.lastTick=performance.now();this.lastSend=0;
    this.loop=setInterval(()=>this.tick(),1000/30);this.onState(this.project(this.seat));this.lobby();return result;
  }
  project(seat){const snapshot=structuredClone(this.state);if(seat)flipPlayers(snapshot);snapshot.usedTemplates=[...this.templates[seat]];return snapshot;}
  async lobby(){
    if(!this.active)return;
    try{const result=await this.rpc('status');if(!this.active)return;
      if(result.closed){this.fail('Votre adversaire a quitte la partie, ou le salon a expire.');return;}
      if(this.players<2&&result.players===2)this.lastPeer=performance.now();
      this.players=result.players;this.readyFlags=result.ready;
      this.onStatus('Salon '+this.code+' — '+(this.players<2?'attente d’un adversaire':this.readyFlags.every(Boolean)?'combat':'preparation'));
      this.lobbyTimer=setTimeout(()=>this.lobby(),4000);
    }catch(e){this.fail(e.message);}
  }
  tick(){
    if(!this.active)return;const now=performance.now(),elapsed=Math.min(.2,(now-this.lastTick)/1000);this.lastTick=now;
    if(this.players===2&&now-this.lastPeer>20000){this.fail('Adversaire deconnecte ou onglet suspendu.');return;}
    if(this.seat===0){
      if(this.players===2&&this.readyFlags.every(Boolean)){
        if(this.state.phase==='preparation'){this.state.phase='combat';this.state.phaseTime=0;for(const owner of [0,1])for(const seal of this.state.seals.filter(x=>x.owner===owner&&isSealIntact(this.state,x)).slice(0,3))seal.charging=1;}
        for(let remaining=elapsed;remaining>1e-6;remaining-=1/30)stepMatch(this.state,Math.min(1/30,remaining));
      }
      if(now-this.lastSend>=200&&!this.encoding){this.lastSend=now;this.publish();}
    }else if(now-this.lastSend>=100){this.lastSend=now;this.wire.send({kind:'commands',items:[...this.actions].slice(0,20).map(([seq,action])=>({seq,action}))});}
  }
  async publish(){
    this.encoding=true;
    try{this.onState(this.project(0));if(this.players===2){const data=await encodeSnapshot({state:this.project(1),ack:this.acks[1],id:++this.snapshotId});if(this.active)this.wire.send({kind:'state',data});}}
    catch(e){this.fail(e.message);}finally{this.encoding=false;}
  }
  async receive(message){
    if(!this.active||!message)return;
    if(message.kind==='leave'){this.fail('Votre adversaire a quitte la partie.');return;}
    if(this.seat===0&&message.kind==='commands'&&Array.isArray(message.items)&&message.items.length<=20){
      this.lastPeer=performance.now();
      for(const item of message.items){
        if(item.seq!==this.acks[1]+1||!item.action||JSON.stringify(item.action).length>180000)continue;
        this.acks[1]=item.seq;
        try{const r=applySeatAction(this.state,this.templates,1,item.seq,item.action);if(!r.ok)this.wire.send({kind:'notice',text:r.message||'Commande refusee'});}catch{this.wire.send({kind:'notice',text:'Commande refusee'});}
      }
    }else if(this.seat===1&&message.kind==='state'){
      const packet=await decodeSnapshot(message.data);
      if(!Number.isSafeInteger(packet.id)||packet.id<=this.lastSnapshot||!packet.state||packet.state.players?.length!==2)return;
      this.lastPeer=performance.now();this.lastSnapshot=packet.id;
      for(const seq of this.actions.keys())if(seq<=packet.ack)this.actions.delete(seq);
      for(const [seq,action]of this.actions){packet.state.nextId=1e9+1e12+seq*10000;applyOnlineAction(packet.state,action);}
      this.onState(packet.state);
    }else if(this.seat===1&&message.kind==='notice'&&typeof message.text==='string')this.onStatus(message.text.slice(0,200));
  }
  action(state,action){
    if(!this.active)return {ok:false,message:'Connexion interrompue'};
    if(this.actions.size>300)return {ok:false,message:'Connexion trop lente, patientez'};
    const seq=++this.seq;state.nextId=1e9+this.seat*1e12+seq*10000;
    const result=applyOnlineAction(state,action);
    if(this.seat===0){applySeatAction(this.state,this.templates,0,seq,action);this.acks[0]=seq;}
    else this.actions.set(seq,structuredClone(action));return result;
  }
  async ready(){const result=await this.rpc('ready');this.readyFlags=result.ready;this.players=result.players;this.onStatus('Pret : attente de votre adversaire');}
  async leave(){this.active=false;clearInterval(this.loop);clearTimeout(this.lobbyTimer);this.wire?.send({kind:'leave'});this.wire?.close();if(this.code)try{await this.rpc('leave');}catch{} }
}

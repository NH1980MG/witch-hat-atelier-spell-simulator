export async function encodeSnapshot(value){
  const text=JSON.stringify(value);if(text.length>6000000)throw Error('Toile trop volumineuse');
  const bytes=new Uint8Array(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  if(bytes.length>350000)throw Error('Toile trop volumineuse');
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
}
export async function decodeSnapshot(value){
  if(typeof value!=='string'||value.length>470000)throw Error('Message trop volumineux');
  const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));
  const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),chunks=[];let size=0;
  for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>6000000){await reader.cancel();throw Error('Message trop volumineux');}chunks.push(value);}
  return JSON.parse(await new Blob(chunks).text());
}
export class DuelWire{
  constructor(config,channel,onMessage,onError){this.config=config;this.topic='realtime:ink-duel:'+channel;this.onMessage=onMessage;this.onError=onError;this.ref=1;this.closed=false;}
  open(){return new Promise((resolve,reject)=>{
    this.socket=new WebSocket(this.config.url.replace(/^http/,'ws')+'/realtime/v1/websocket?apikey='+encodeURIComponent(this.config.key)+'&vsn=1.0.0');
    const timeout=setTimeout(()=>{reject(Error('Connexion temps reel expiree'));this.close();},10000);
    this.socket.onopen=()=>this.socket.send(JSON.stringify({topic:this.topic,event:'phx_join',payload:{config:{broadcast:{self:false,ack:false},presence:{enabled:false},private:false}},ref:'1',join_ref:'1'}));
    this.socket.onmessage=event=>{
      if(typeof event.data!=='string'||event.data.length>600000)return;
      let message;try{message=JSON.parse(event.data);}catch{return;}
      if(message.event==='phx_reply'&&message.ref==='1'){
        clearTimeout(timeout);if(message.payload?.status!=='ok'){reject(Error('Canal refuse'));this.close();return;}
        this.timer=setInterval(()=>this.push('heartbeat',{},'phoenix'),20000);resolve();
      }else if(message.topic===this.topic&&message.event==='broadcast'&&message.payload?.event==='duel')Promise.resolve(this.onMessage(message.payload.payload)).catch(()=>this.onError('Message de jeu invalide'));
    };
    this.socket.onerror=()=>{clearTimeout(timeout);reject(Error('Connexion temps reel impossible'));};
    this.socket.onclose=()=>{clearTimeout(timeout);clearInterval(this.timer);if(!this.closed)this.onError('Connexion interrompue. Rejoignez une nouvelle partie.');};
  });}
  push(event,payload,topic=this.topic){if(this.socket?.readyState===1)this.socket.send(JSON.stringify({topic,event,payload,ref:String(++this.ref),join_ref:topic===this.topic?'1':null}));}
  send(message){if(this.socket?.bufferedAmount>500000)return;this.push('broadcast',{type:'broadcast',event:'duel',payload:message});}
  close(){this.closed=true;clearInterval(this.timer);this.socket?.close();}
}

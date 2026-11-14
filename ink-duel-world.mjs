import RAPIER from './vendor/rapier/rapier3d-compat.module.js';
let ready;
export async function createDuelPhysics(){
  ready ||= RAPIER.init();await ready;
  const world=new RAPIER.World({x:0,y:0,z:0}),bodies=new Map();
  for(const [x,z,hx,hz] of [[-1,7,1,9],[25,7,1,9],[12,-1,14,1],[12,15,14,1]]){
    const b=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x,0,z));
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx,2,hz),b);
  }
  return {
    step(objects,dt){
      const living=new Set(objects.filter(o=>o.hp>0).map(o=>o.id));
      for(const [id,item]of bodies)if(!living.has(id)){world.removeRigidBody(item.body);bodies.delete(id);}
      for(const o of objects){
        if(o.hp<=0)continue;
        let item=bodies.get(o.id);
        if(!item){
          const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(o.x,0,o.y).setLinearDamping(1.2).lockRotations());
          body.setEnabledTranslations(true,false,true,true);
          const desc=o.shape==='sword'?RAPIER.ColliderDesc.cuboid(o.r*.1,.2,o.r*1.2):o.shape==='ribbon'?RAPIER.ColliderDesc.cuboid(o.r,.2,o.r*.35):RAPIER.ColliderDesc.ball(o.r);
          const collider=world.createCollider(desc.setMass(o.mass).setRestitution(.25),body);
          item={body,collider};bodies.set(o.id,item);
        }
        item.body.setTranslation({x:o.x,y:0,z:o.y},true);
        item.body.setLinvel({x:o.vx,y:0,z:o.vy},true);
        item.collider.setSensor(o.height>.5);
      }
      world.timestep=dt;world.step();
      for(const o of objects){const item=bodies.get(o.id);if(!item)continue;const p=item.body.translation(),v=item.body.linvel();o.x=p.x;o.y=p.z;o.vx=v.x;o.vy=v.z;}
    },
    dispose(){bodies.clear();world.free();},
  };
}

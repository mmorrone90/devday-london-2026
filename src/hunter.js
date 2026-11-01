import * as T from 'three';
import {makeMonster} from './player-avatars.js';
export function createHunter(scene,navigation){
 const mesh=makeMonster('reaper');mesh.scale.setScalar(1.3);mesh.visible=false;scene.add(mesh);
 const ring=new T.Mesh(new T.TorusGeometry(.9,.055,6,32),new T.MeshBasicMaterial({color:'#fc4777'}));ring.rotation.x=-Math.PI/2;ring.position.y=.12;mesh.add(ring);
 let route=[],repath=0,spawned=false,graceUntil=0,catches=0;
 function relocate(player,t){const p=navigation.free(player.x+9,player.z-7,.8);mesh.position.set(p.x,0,p.z);route=[];repath=0;graceUntil=t+4;}
 return {reset(player,t){relocate(player,t);spawned=true;},update(dt,t,player,frozen){if(!player){mesh.visible=false;return {caught:false,catches};}mesh.visible=true;if(!spawned){relocate(player,t);spawned=true;}mesh.position.y=.05+Math.sin(t*5)*.06;if(frozen)return {caught:false,catches};if(t<graceUntil)return {caught:false,catches,grace:true};
  if(t>repath){route=navigation.path(mesh.position,player);repath=t+.65;}
  let target=navigation.segmentClear(mesh.position,player,.65)?player:route[0];if(target!==player&&target&&Math.hypot(target.x-mesh.position.x,target.z-mesh.position.z)<.35){route.shift();target=route[0];}
  if(target){const dx=target.x-mesh.position.x,dz=target.z-mesh.position.z,d=Math.hypot(dx,dz),step=Math.min(d,dt*3.6);if(d>.01){const p={x:mesh.position.x,z:mesh.position.z};navigation.move(p,dx/d*step,dz/d*step,.65);mesh.position.x=p.x;mesh.position.z=p.z;mesh.rotation.y=Math.atan2(dx,dz);}}
  const caught=Math.hypot(player.x-mesh.position.x,player.z-mesh.position.z)<1.15&&navigation.segmentClear(mesh.position,player,.1);if(caught){catches++;relocate(player,t);}return {caught,catches};
 }};
}

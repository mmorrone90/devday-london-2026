import {makeMonster} from './player-avatars.js';
import {createRoamer} from './roaming.js';
export function createCharacters(scene,camera,navigation){
 const actors=[],meshes=[];let partyUntil=0,last=0;
 const quotes={reaper:['The scythe is for cutting the cake.','I am only here for the buffet.'],ghost:['Boo. That was my networking pitch.','I came for the atmosphere.'],pumpkin:['My costume? Business squash.','Please do not call me seasonal.']};
 const positions=[[-7,9],[7,12],[-8,-1],[8,-1],[-14,18],[14,18],[-34,11],[34,18],[-34,22],[39,21],[-5,32],[22,36],[-19,37],[-4,19],[4,24],[-29,4],[34,3],[0,36]];
 positions.forEach(([x,z],i)=>{
  const kind=['reaper','ghost','pumpkin'][i%3],mesh=makeMonster(kind),p=navigation.free(x,z,.65);
  mesh.position.set(p.x,0,p.z);mesh.userData.kind=kind;
  mesh.traverse(o=>{if(o.isMesh){o.userData.kind=kind;meshes.push(o);}});
  scene.add(mesh);actors.push({mesh,kind,roamer:createRoamer(navigation,p,i),phase:i*1.3});
 });
 return {count:actors.length,meshes,
  startParty(t,duration=10){partyUntil=t+duration;},stopParty(){partyUntil=0;},
  quote(mesh){const kind=mesh.userData.kind;return {name:kind==='reaper'?'Grim, off duty':kind==='ghost'?'A social spirit':'Pumpkin, party guest',text:quotes[kind][Math.floor(Math.random()*quotes[kind].length)]};},
  update(t){
   const dt=Math.min(.05,Math.max(0,t-last));last=t;let canPlan=true;
   for(const a of actors){
    const dance=t<partyUntil,result=a.roamer.update(dt,t,{paused:dance,canPlan});if(result.planned)canPlan=false;
    const p=a.roamer.position,frequency=dance?8:result.moving?6:2,amplitude=dance?.14:result.moving?.08:.035;
    a.mesh.position.set(p.x,(a.kind==='ghost'?.35:0)+Math.sin(t*frequency+a.phase)*amplitude,p.z);
    if(result.moving){const angle=a.roamer.heading-a.mesh.rotation.y;a.mesh.rotation.y+=Math.atan2(Math.sin(angle),Math.cos(angle))*Math.min(1,dt*8);}
    a.mesh.rotation.z=dance?Math.sin(t*8+a.phase)*.14:0;
    a.mesh.userData.arms.forEach((arm,i)=>{arm.rotation.z=dance?Math.sin(t*8+i+a.phase)*.8:result.moving?Math.sin(t*6+i*Math.PI+a.phase)*.22:0;});
   }
  }
 };
}

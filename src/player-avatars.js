import * as T from 'three';

const material=(color)=>new T.MeshStandardMaterial({color,roughness:.75});
function part(root,geo,mat,x,y,z,sx=1,sy=sx,sz=sx){const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);root.add(mesh);return mesh;}
function makeMonster(kind){
 const root=new T.Group(),sphere=new T.SphereGeometry(1,12,10),black=material('#17101e'),white=material('#e3fff0'),green=new T.MeshBasicMaterial({color:'#a6ff37'});
 const arms=[];
 if(kind==='pumpkin'){
  const orange=material('#fa8e19');
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2;part(root,sphere,orange,Math.cos(a)*.25,1.05,Math.sin(a)*.25,.49,.65,.49);}
  const stem=part(root,new T.CylinderGeometry(.06,.1,.3,6),material('#546d24'),0,1.78,0);stem.rotation.z=-.22;
  for(const x of [-.23,.23])part(root,new T.ConeGeometry(.12,.2,3),black,x,1.22,.62,1,1,.25);
  part(root,new T.BoxGeometry(.45,.09,.06),black,0,.89,.7);
  for(const x of [-.7,.7]){const arm=part(root,sphere,orange,x,.85,0,.13,.28,.13);arms.push(arm);}
 }else if(kind==='ghost'){
  part(root,sphere,white,0,1.4,0,.58,.6,.43);
  part(root,new T.CylinderGeometry(.5,.66,.9,16),white,0,.95,0,1,1,.72);
  for(let i=0;i<7;i++){const a=i/7*6.28;part(root,sphere,white,Math.cos(a)*.47,.52,Math.sin(a)*.3,.2,.25,.2);}
  for(const x of [-.19,.19])part(root,sphere,black,x,1.5,.4,.09,.14,.04);
  part(root,sphere,black,0,1.2,.42,.08,.09,.03);
  for(const x of [-.68,.68])arms.push(part(root,sphere,white,x,1.02,0,.25,.16,.18));
 }else{
  part(root,new T.ConeGeometry(.6,1.4,12),material('#302837'),0,.85,0);
  part(root,sphere,black,0,1.62,0,.54,.59,.47);
  part(root,sphere,material('#070a0b'),0,1.55,.38,.4,.39,.1);
  for(const x of [-.16,.16]){const eye=part(root,sphere,green,x,1.63,.48,.1,.05,.025);eye.rotation.z=x>0?.3:-.3;}
  part(root,new T.CylinderGeometry(.035,.035,2.5,6),material('#86512e'),.7,1.25,.08);
  const blade=new T.Shape();blade.moveTo(.7,2.4);blade.quadraticCurveTo(0,2.8,-.45,2.2);blade.quadraticCurveTo(.15,2.5,.7,2.2);blade.closePath();
  part(root,new T.ExtrudeGeometry(blade,{depth:.04,bevelEnabled:false}),material('#aec5d3'),0,0,.06);
  for(const x of [-.57,.57])arms.push(part(root,sphere,black,x,1.12,0,.17,.34,.18));
 }
 root.userData.arms=arms;return root;
}
function labelTexture(name,color){const c=document.createElement('canvas');c.width=512;c.height=112;const x=c.getContext('2d');x.fillStyle='#140e22db';x.beginPath();x.roundRect(4,4,504,100,30);x.fill();x.strokeStyle=color;x.lineWidth=4;x.stroke();x.fillStyle='#fff5df';x.font='600 37px Barlow, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(name,256,56,470);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;}
export function createPlayerAvatars(scene){
 const actors=new Map();let self=null;
 function upsert(p){let a=actors.get(p.id);if(a){a.data=p;return;}const group=new T.Group(),monster=makeMonster(p.kind);group.add(monster);const tex=labelTexture(p.nickname,p.color),label=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:true,depthWrite:false}));label.scale.set(3.1,.68,1);label.position.y=3;group.add(label);const shadow=new T.Mesh(new T.CircleGeometry(.65,20),new T.MeshBasicMaterial({color:'#070511',opacity:.3,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.08;group.add(shadow);group.position.set(p.x,0,p.z);scene.add(group);actors.set(p.id,{group,monster,label,shadow,data:p,displayKind:p.kind});}
 function disposeObject(object){object.traverse(o=>{if(o.isMesh||o.isSprite){o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});}
 return {
  setSelf(id){self=id;},upsert,
  remove(id){const a=actors.get(id);if(a){scene.remove(a.group);disposeObject(a.group);actors.delete(id);}},
  get(id){return actors.get(id);},
  update(dt,t,event,local){
   let visible=0;for(const [id,a] of actors){const p=a.data,active=event&&Date.parse(event.expires_at)>Date.now(),kind=active&&event.kind==='pumpkin_rain'?'pumpkin':p.kind;
    if(a.displayKind!==kind){a.group.remove(a.monster);disposeObject(a.monster);a.monster=makeMonster(kind);a.group.add(a.monster);a.displayKind=kind;}
    a.group.visible=id===self||visible++<100;if(!a.group.visible)continue;
    const pos=id===self&&local?local:p,dx=pos.x-a.group.position.x,dz=pos.z-a.group.position.z,moving=Math.abs(dx)+Math.abs(dz)>.025;
    a.group.position.x=T.MathUtils.lerp(a.group.position.x,pos.x,1-Math.exp(-dt*12));a.group.position.z=T.MathUtils.lerp(a.group.position.z,pos.z,1-Math.exp(-dt*12));
    a.monster.rotation.y=pos.heading??0;
    const emote=Date.parse(p.emote_until??'')>Date.now()?p.emote:'idle',dance=(active&&event.kind==='ghost_dance')||emote==='dance';
    a.monster.position.y=(kind==='ghost'?.3:0)+Math.sin(t*(dance?9:moving?8:2)+p.x)*((dance||moving)?.13:.035);
    a.monster.rotation.z=dance?Math.sin(t*9)*.15:0;
    a.monster.userData.arms.forEach((arm,i)=>{arm.rotation.z=dance?Math.sin(t*9+i)*.8:emote==='wave'&&i===0?1.5+Math.sin(t*12)*.4:0;});
    if(emote==='boo'){const s=1+Math.sin(t*10)*.1;a.monster.scale.setScalar(s);}else a.monster.scale.setScalar(1);
   }
  },
 };
}

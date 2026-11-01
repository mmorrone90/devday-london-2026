import * as T from 'three';
import { createNavigation } from './navigation.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {rand,stoneTexture,plasterTexture,rosetteTexture,skullTexture,papelTexture,glowTexture,mosaicTexture} from './textures.js';

export function createWorld(scene) {
  const staticParts=new Map(), instances=new Map(), colliders=[];
  const unitBox=new T.BoxGeometry(1,1,1), unitSphere=new T.SphereGeometry(1,8,6), dummy=new T.Object3D();
  const mat=(color,opts={})=>new T.MeshStandardMaterial({color,roughness:.9,...opts});
  const plaster=plasterTexture(); plaster.wrapS=plaster.wrapT=T.RepeatWrapping; plaster.repeat.set(3,3);
  const m={sand:mat('#ae7346',{map:plaster,bumpMap:plaster,bumpScale:.08}),gold:mat('#e2a141'),stone:mat('#8d736a',{map:plaster}),darkStone:mat('#50404f'),ochre:mat('#c48a3d',{map:plaster}),rose:mat('#9c365c',{map:plaster}),teal:mat('#2c777c',{map:plaster}),purple:mat('#61446d',{map:plaster}),wood:mat('#432824'),metal:mat('#2a2630',{metalness:.65,roughness:.55}),wax:mat('#f5d9a2'),leaf:mat('#304b2b'),terracotta:mat('#a4442b'),orange:mat('#ff820b',{emissive:'#8d2600',emissiveIntensity:.17}),yellow:mat('#ffb328',{emissive:'#8d3700',emissiveIntensity:.12}),pink:mat('#c51e59'),cream:mat('#ebc68b'),recess:mat('#291a35'),flame:new T.MeshBasicMaterial({color:new T.Color(5.5,2.8,.65)}),window:new T.MeshBasicMaterial({color:new T.Color(1.8,.72,.17)})};
  function batch(geo,material,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0]){
    const g=geo.index ? geo.toNonIndexed() : geo.clone();dummy.position.set(...pos);dummy.scale.set(...scale);dummy.rotation.set(...rot);dummy.updateMatrix();g.applyMatrix4(dummy.matrix);
    if(!staticParts.has(material))staticParts.set(material,[]);staticParts.get(material).push(g);
  }
  function box(material,x,y,z,w,h,d,ry=0){batch(unitBox,material,[x,y,z],[w,h,d],[0,ry,0]);if(y-h/2<1.7&&y+h/2>.45&&Math.max(w,d)>.2)colliders.push({type:'box',x,z,w:Math.abs(w*Math.cos(ry))+Math.abs(d*Math.sin(ry)),d:Math.abs(d*Math.cos(ry))+Math.abs(w*Math.sin(ry))});}
  function sphere(material,x,y,z,sx,sy=sx,sz=sx){batch(unitSphere,material,[x,y,z],[sx,sy,sz]);if(y-sy<1.7&&y+sy>.45&&Math.max(sx,sz)>.2)colliders.push({type:'circle',x,z,r:Math.max(sx,sz)});}
  function inst(key,geo,material,x,y,z,sx=1,sy=sx,sz=sx,rx=0,ry=0,rz=0){
    if(!instances.has(key))instances.set(key,{geo,material,items:[]});instances.get(key).items.push({x,y,z,sx,sy,sz,rx,ry,rz});
  }
  function cyl(material,x,y,z,rt,rb,h,n=16){batch(new T.CylinderGeometry(rt,rb,h,n),material,[x,y,z]);if(y-h/2<1.7&&y+h/2>.45&&Math.max(rt,rb)>.15)colliders.push({type:'circle',x,z,r:Math.max(rt,rb)});}
  function line(points,material,r=.025){batch(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(8,points.length*3),r,5,false),material);}
  const diskGeo=new T.PlaneGeometry(1,1), glowMat=new T.MeshBasicMaterial({map:glowTexture(),transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.28});
  function glow(x,y,z,size=2){inst('ground-glows',diskGeo,glowMat,x,y+.015,z,size,size,size,-Math.PI/2);}
  function light(x,y,z,intensity=22,distance=9,color='#ff982c'){const l=new T.PointLight(color,intensity,distance,2);l.position.set(x,y,z);scene.add(l);return l;}
  function archShape(w,h){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h-w/2);s.absarc(0,h-w/2,w/2,0,Math.PI,false);s.lineTo(-w/2,0);return s;}
  function archSolid(material,x,y,z,w,h,depth=.12){if(y<1.7&&y+h>.45)colliders.push({type:'box',x,z:z+depth/2,w,d:depth});batch(new T.ExtrudeGeometry(archShape(w,h),{depth,bevelEnabled:false,curveSegments:20}),material,[x,y,z]);}
  function archRing(material,x,y,z,w,h,thickness=.3,depth=.5){
    if(y<1.7)for(const side of [-1,1])colliders.push({type:'box',x:x+side*(w/2-thickness/2),z:z+depth/2,w:thickness,d:depth});
    // One continuous U-shaped outline. A hole extending outside the outer
    // contour produces invalid triangles and angle-dependent flashing.
    const outer=new T.Shape(),r=w/2,inner=r-thickness,cy=h-r;
    outer.moveTo(-r,0);outer.lineTo(-r,cy);outer.absarc(0,cy,r,Math.PI,0,true);
    outer.lineTo(r,0);outer.lineTo(inner,0);outer.lineTo(inner,cy);
    outer.absarc(0,cy,inner,0,Math.PI,false);outer.lineTo(-inner,0);outer.closePath();
    batch(new T.ExtrudeGeometry(outer,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.03,bevelThickness:.03,curveSegments:20}),material,[x,y,z]);
  }
  function plane(material,x,y,z,w,h,ry=0){batch(new T.PlaneGeometry(w,h),material,[x,y,z],[1,1,1],[0,ry,0]);}
  // A layered flower head, instanced thousands of times across the plaza.
  const petals=[];
  for(let ring=0;ring<2;ring++)for(let i=0;i<9;i++){
    const a=i/9*Math.PI*2+ring*.3,g=new T.SphereGeometry(.095,5,3);
    dummy.position.set(Math.cos(a)*(.12-ring*.04),ring*.035,Math.sin(a)*(.12-ring*.04));dummy.scale.set(1,.55,1);dummy.rotation.set(0,a,0);dummy.updateMatrix();g.applyMatrix4(dummy.matrix);petals.push(g);
  }
  const flowerGeo=mergeGeometries(petals);petals.forEach(g=>g.dispose());
  const leafGeo=new T.SphereGeometry(1,5,3);
  function flower(x,y,z,size=1,kind='orange') {inst('flowers-'+kind,flowerGeo,m[kind],x,y,z,size,size,size,rand()*.6,rand()*6.28,rand()*.6);}
  function flowers(x,y,z,r=.6,count=25,kind='orange'){
    for(let i=0;i<count;i++){const a=rand()*6.28,d=Math.sqrt(rand())*r;flower(x+Math.cos(a)*d,y+rand()*.23,z+Math.sin(a)*d,.65+rand()*.6,i%5===0?'yellow':kind);}
  }
  function garland(points,count=80,r=.16,kind='orange'){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    for(let i=0;i<count;i++){const p=curve.getPoint(i/(count-1));flower(p.x+(rand()-.5)*r,p.y+(rand()-.5)*r,p.z+(rand()-.5)*r,.8+rand()*.55,i%7===0?'yellow':kind);}
  }
  function archFlowers(x,y,z,w,h,kind='orange'){
    const r=w/2,pts=[[x-r,y,z],[x-r,y+h-r,z]];for(let i=0;i<=16;i++){const a=Math.PI-i/16*Math.PI;pts.push([x+Math.cos(a)*r,y+h-r+Math.sin(a)*r,z]);}pts.push([x+r,y,z]);garland(pts,120,.2,kind);
  }
  const candleGeo=new T.CylinderGeometry(1,1,1,8),flameGeo=new T.SphereGeometry(1,6,5);
  function candle(x,y,z,scale=1){
    const h=(.24+rand()*.32)*scale,r=(.055+rand()*.025)*scale;
    inst('candles',candleGeo,m.wax,x,y+h/2,z,r,h,r);
    inst('flames',flameGeo,m.flame,x,y+h+.065*scale,z,.024*scale,.073*scale,.024*scale);
    if(rand()>.6)glow(x,y,z,.65*scale);
  }
  function candleCluster(x,y,z,count=8,r=.6){for(let i=0;i<count;i++){const a=rand()*6.28,d=rand()*r;candle(x+Math.cos(a)*d,y,z+Math.sin(a)*d,.75+rand()*.7);}glow(x,y,z,2.8);}
  function pot(x,y,z,size=.7,kind='orange'){
    cyl(m.terracotta,x,y+size*.45,z,size*.58,size*.38,size*.9);cyl(m.gold,x,y+size*.9,z,size*.63,size*.63,.1);
    for(let i=0;i<12;i++){const a=rand()*6.28;inst('leaves',leafGeo,m.leaf,x+Math.cos(a)*size*.5,y+size,z+Math.sin(a)*size*.5,.12*size,.45*size,.1*size,Math.cos(a)*.7,a,Math.sin(a)*.7);}
    flowers(x,y+size*1.14,z,size*.66,Math.floor(size*38),kind);
  }
  function lantern(x,y,z,s=1){
    const w=.25*s,h=.52*s;box(m.metal,x,y+.035*s,z,w,.07*s,w);box(m.metal,x,y+h,z,w*.95,.06*s,w*.95);
    for(const a of [-1,1])for(const b of [-1,1])box(m.metal,x+a*w*.43,y+h*.5,z+b*w*.43,.027*s,h,.027*s);
    cyl(m.metal,x,y+h+.08*s,z,.02*s,.2*s,.14*s,4);candle(x,y+.07*s,z,.8*s);
    const handle=new T.TorusGeometry(.08*s,.013*s,4,12);batch(handle,m.metal,[x,y+h+.19*s,z]);glow(x,y,z,1.8*s);
  }
  // Ground and the inlaid plaza medallion.
  const paving=stoneTexture();paving.wrapS=paving.wrapT=T.RepeatWrapping;paving.repeat.set(24,24);
  const ground=new T.Mesh(new T.PlaneGeometry(150,150),mat('#b7a5a0',{map:paving,bumpMap:paving,bumpScale:.11}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const mosaic=new T.Mesh(new T.CircleGeometry(5,80),mat('#d0b691',{map:mosaicTexture(),roughness:.8}));mosaic.rotation.x=-Math.PI/2;mosaic.position.set(0,.022,6);mosaic.receiveShadow=true;scene.add(mosaic);
  // Recessed paths, raised edges, and town perimeter.
  for(let side of [-1,1]){box(m.darkStone,side*20,.16,0,4,.32,46);for(let z=-19;z<23;z+=1.1)box(m.stone,side*18.2,.25,z,.25,.5,.98);}
  // Stepped altar: each terrace has real tread depth.
  for(let i=0;i<5;i++){
    const width=18-i*2.1,depth=8.2-i*1.3,y=.27+i*.58,z=-11.2-i*.35;
    box(i%2?m.rose:m.sand,0,y,z,width,.58,depth);
    box(m.gold,0,y+.31,z+depth/2,width+.12,.09,.2);
    for(let x=-width/2+.25;x<width/2;x+=.42){flower(x,y+.37,z+depth/2+.02,.95);if(Math.abs(x)>3)candle(x,y+.32,z+depth/2-.28,.8+rand()*.5);}
    for(let x=-width/2+.5;x<width/2;x+=1.4)if(Math.abs(x)>2)candleCluster(x,y+.32,z+depth/2-.7,3,.25);
  }
  // Main approach staircase in front of the altar.
  for(let i=0;i<10;i++){const h=.22*(i+1),z=-5.65-i*.43;box(m.stone,0,h/2,z,4.15,h,.48);box(m.cream,0,h+.015,z+.2,4.2,.035,.09);}
  for(let side of [-1,1])for(let i=0;i<7;i++){
    const h=.26*(i+1),z=-6.7-i*.5;box(m.stone,side*7,h/2,z,2.45,h,.55);candle(side*8,h+.02,z,.85);flower(side*5.8,h+.1,z,1.2);
  }
  // The central facade has layered arches and a sculptural crown.
  box(m.ochre,0,6,-15.6,7.8,7.1,.9);box(m.gold,0,9.6,-15.05,8.25,.28,1.3);
  archSolid(m.rose,0,3.2,-15.05,6.6,6.5,.18);archRing(m.gold,0,3.2,-14.82,6.7,6.5,.22,.2);
  const roseMat=mat('#ffffff',{map:rosetteTexture(),emissive:'#9d224b',emissiveIntensity:.22});
  const roseDisc=new T.Mesh(new T.CircleGeometry(2.45,64),roseMat);roseDisc.position.set(0,6.3,-14.57);scene.add(roseDisc);
  for(let side of [-1,1]){
    box(m.sand,side*6.05,4.8,-15.1,4.6,5.8,1);box(m.gold,side*6.05,7.8,-14.6,5,.2,1.3);
    archSolid(m.recess,side*6.05,2.8,-14.55,3.3,4.2);archRing(m.gold,side*6.05,2.8,-14.36,3.5,4.4,.2,.18);
    const sk=mat('#fff5cf',{map:skullTexture(),transparent:false,alphaTest:.35,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});plane(sk,side*6.05,5.05,-14.15,2.9,2.9);
    archFlowers(side*6.05,2.8,-14.05,3.55,4.4);pot(side*8.4,2,-13.5,.75);lantern(side*4,3,-13.4,1.6);
  }
  archFlowers(0,3,-14.35,7.3,6.8);
  box(m.sand,0,10.1,-15.35,3.3,.65,1.2);archRing(m.ochre,0,10.3,-15.3,2.7,2.5,.45,.8);
  const bell=new T.CylinderGeometry(.23,.46,.65,12);batch(bell,m.gold,[0,11.6,-14.95]);sphere(m.metal,0,11.2,-14.95,.12);
  cyl(m.terracotta,0,12.9,-14.9,.1,1.8,1.1,8);sphere(m.gold,0,13.6,-14.9,.13);
  for(let side of [-1,1]){cyl(m.gold,side*3.65,10.25,-15,.16,.24,1,10);sphere(m.gold,side*3.65,10.85,-15,.22);}
  // Offerings, frames and flower pots on the stage.
  for(let x of [-5,-3,0,3,5]){pot(x,2.65,-11.7,.6);candleCluster(x,2.65,-10.7,8,.45);}
  box(m.purple,0,3.3,-13.25,3.2,.8,1.1);box(m.gold,0,3.75,-13.25,3.45,.12,1.25);
  for(let x=-1.4;x<1.5;x+=.3)candle(x,3.82,-12.88,1.5);
  for(let x of [-2.1,2.1]){box(m.gold,x,4.1,-13.55,.8,1.2,.12);box(m.recess,x,4.1,-13.46,.65,1,.06);sphere(m.cream,x,4.3,-13.4,.14,.18,.05);}
  for(let z of [-9,-11,-13])for(let side of [-1,1]){pot(side*9.2,.1,z,1);candleCluster(side*10,0,z,10,.6);}
  // Circular flower island in the foreground.
  cyl(m.stone,0,.3,6,1.8,1.9,.6,48);cyl(m.gold,0,.63,6,1.86,1.86,.1,48);cyl(m.darkStone,0,.69,6,1.65,1.65,.06,48);
  flowers(0,.85,6,1.55,180);pot(0,.7,6,1.25,'pink');
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2;candle(Math.cos(a)*2.2,0,6+Math.sin(a)*2.2,.8+rand()*.8);}
  for(let a of [.3,2.4,4.4])lantern(Math.cos(a)*2.7,0,6+Math.sin(a)*2.7,1.5);
  // Flower beds beside the plaza.
  for(let side of [-1,1])for(let z of [0,8,15]){
    box(m.stone,side*12,.34,z,3.1,.68,1.7);box(m.gold,side*12,.72,z,3.3,.1,1.9);
    for(let k=0;k<110;k++)flower(side*12+(rand()-.5)*3,.86+rand()*.15,z+(rand()-.5)*1.5,.8+rand()*.5);
    pot(side*14.4,0,z,.9,'pink');candleCluster(side*10.2,0,z+.6,8,.55);
    box(m.wood,side*12,.6,z+2,2.7,.14,.75);for(let x of [-1,1])box(m.metal,side*12+x,.28,z+2,.08,.56,.55);
  }
  // Two freestanding gateways frame the plaza.
  function gateway(x,z,color){
    for(let side of [-1,1]){box(color,x+side*2.05,2.65,z,1.15,5.3,1.8);box(m.gold,x+side*2.05,5.3,z,1.45,.24,2);box(m.stone,x+side*2.05,.18,z,1.45,.36,2);}
    archRing(color,x,0,z-.7,5.25,6.4,.8,1.45);box(color,x,7,z,5.3,1.65,1.8);box(m.gold,x,7.9,z,5.65,.18,2);
    archFlowers(x,.1,z+1,4.1,5.9);garland([[x-2.7,8.1,z+.6],[x,8.3,z+.6],[x+2.7,8.1,z+.6]],95,.4);
    const sk=mat('#fff2cf',{map:skullTexture(),transparent:false,alphaTest:.35,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});plane(sk,x,7,z+.94,1.65,1.65);
    for(let side of [-1,1]){pot(x+side*2.75,0,z+1.2,1.1);lantern(x+side*1.75,0,z+1.7,2);candleCluster(x+side*2.4,0,z+2.2,14,.6);}
  }
  gateway(-15,-.6,m.ochre);gateway(15,-.6,m.teal);
  // Modular town houses and bell towers surround the scene.
  function house(x,z,w,h,d,color,ry=0){
    // Transform local facade coordinates by orientation.
    const p=(lx,ly,lz)=>[x+lx*Math.cos(ry)+lz*Math.sin(ry),ly,z-lx*Math.sin(ry)+lz*Math.cos(ry)];
    box(color,x,h/2,z,w,h,d,ry);box(m.gold,...p(0,h+.08,0),w+.3,.24,d+.35,ry);
    box(m.terracotta,...p(0,h+.3,0),w+.6,.25,d+.6,ry);
    for(let lx=-w/2+.6;lx<w/2;lx+=1.35){
      const [wx,wy,wz]=p(lx,h*.62,d/2+.03);const matWin=m.window;
      plane(matWin,wx,wy,wz,.52,1.05,ry);box(m.wood,...p(lx,h*.62,d/2+.07),.05,1.1,.08,ry);box(m.wood,...p(lx,h*.62,d/2+.08),.58,.06,.08,ry);
      box(m.gold,...p(lx,h*.62-.6,d/2+.1),.8,.14,.3,ry);
      if(h>6){plane(matWin,...p(lx,1.9,d/2+.03),.5,.9,ry);box(m.gold,...p(lx,1.4,d/2+.1),.75,.12,.25,ry);}
    }
    const door=p(0,1.1,d/2+.05);plane(m.wood,...door,1.1,2.2,ry);
    for(let i=0;i<Math.floor(w*3);i++){const fp=p((rand()-.5)*w,h+.5,d/2);flower(...fp,1.1,i%4?'orange':'pink');}
    if(ry===0){for(let side of [-1,1])pot(x+side*(w/2-.45),0,z+d/2+.6,.7);}
  }
  const colors=[m.ochre,m.rose,m.teal,m.sand,m.purple];
  for(let i=0;i<7;i++){const x=-24+i*8;house(x,-23,7.8,5+rand()*5,5,colors[i%5]);}
  for(let side of [-1,1])for(let i=0;i<5;i++){house(side*24,-12+i*8,7.7,4.6+rand()*4.5,6,colors[(i+(side+1))%5],-side*Math.PI/2);}
  function tower(x,z){box(m.sand,x,8,z,3.7,16,3.7);box(m.gold,x,13,z,4,.3,4);box(m.gold,x,16,z,4.2,.35,4.2);archSolid(m.window,x,13.5,z+1.87,1.5,2.1);archRing(m.ochre,x,13.4,z+1.94,1.7,2.3,.2,.15);batch(new T.SphereGeometry(2.5,20,12,0,Math.PI*2,0,Math.PI/2),m.terracotta,[x,16.2,z],[1,.9,1]);cyl(m.gold,x,18.9,z,.1,.2,1);sphere(m.gold,x,19.5,z,.16);}
  tower(-20,-29);tower(20,-29);
  // Garden trees with visible trunks and canopy silhouettes.
  for(let side of [-1,1])for(let z of [-17,6,20]){
    const x=side*20.5;cyl(m.wood,x,2.3,z,.18,.38,4.6,7);
    for(let i=0;i<12;i++){const a=i*2.399;const bx=x+Math.cos(a)*(1+rand()),bz=z+Math.sin(a)*(1+rand());line([[x,2.8,z],[bx,4.7,bz]],m.wood,.09);sphere(m.leaf,bx,5+rand()*1.5,bz,1+rand()*.6,.8,1.2);}
  }
  // Long strands of cut paper and incandescent festoon lamps.
  const paperMats=['#ff8b22','#a42d92','#ec3265','#1b9ca0','#e7ac32'].map((color,i)=>new T.MeshStandardMaterial({map:papelTexture(i),color,side:T.DoubleSide,alphaTest:.5,roughness:1,emissive:color,emissiveIntensity:.12}));
  function strand(x1,y1,z1,x2,y2,z2,sag=1.3){
    const pts=[];for(let i=0;i<=32;i++){const t=i/32;pts.push([T.MathUtils.lerp(x1,x2,t),T.MathUtils.lerp(y1,y2,t)-Math.sin(t*Math.PI)*sag,T.MathUtils.lerp(z1,z2,t)]);}
    line(pts,m.metal,.025);
    const len=Math.hypot(x2-x1,z2-z1),n=Math.floor(len/1.25),angle=-Math.atan2(z2-z1,x2-x1);
    for(let i=1;i<n;i++){const t=i/n,x=T.MathUtils.lerp(x1,x2,t),y=T.MathUtils.lerp(y1,y2,t)-Math.sin(t*Math.PI)*sag,z=T.MathUtils.lerp(z1,z2,t);
      const g=new T.PlaneGeometry(.94,.86,4,5);batch(g,paperMats[i%5],[x,y-.46,z],[1,1,1],[0,angle,0]);
      sphere(m.flame,x,y+.09,z,.045);
    }
  }
  strand(-23,10,8,23,10,8,2);strand(-21,11,-3,21,11,-3,1.7);strand(-22,12,-13,22,12,-13,1.4);
  strand(-22,10,16,0,13,-15,2);strand(22,10,16,0,13,-15,2);
  strand(-22,9,22,22,9,22,1.8);
  // New neighborhoods, reached along the lantern streets.
  for(let side of [-1,1]) {
    for(let i=0;i<5;i++)house(side*49,-23+i*14,10,5+rand()*5,7,colors[(i+2)%5],-side*Math.PI/2);
    for(let i=0;i<3;i++)house(side*(11+i*13),51,10,5+rand()*4,7,colors[(i+1)%5],Math.PI);
    // Keep a clear crossing through the existing ring of houses.
    for(let z=26;z<47;z+=5){pot(side*8,0,z,.85);lantern(side*7,0,z,1.7);}
    for(let x=28;x<47;x+=4){lantern(side*x,0,24,1.6);pot(side*x,0,26,.7);}
    strand(side*9,8,29,side*46,9,29,1.4);
    strand(side*9,8,42,side*46,9,42,1.7);
    light(side*30,5,26,65,24);
  }
  // A market court with fabric awnings and shelves of offerings.
  function stall(x,z,color){
    box(m.wood,x,.7,z,4,1.4,2);box(m.gold,x,1.43,z,4.15,.12,2.15);
    for(let a of [-1,1])for(let b of [-1,1])box(m.wood,x+a*1.85,2.2,z+b*.82,.12,4.4,.12);
    box(color,x,4.2,z,4.5,.17,2.8);box(m.gold,x,3.98,z+1.4,4.5,.4,.1);
    for(let i=0;i<5;i++){pot(x-1.5+i*.75,1.5,z,.36,i%2?'pink':'orange');candle(x-1.5+i*.75,1.5,z+.6,.9);}
    garland([[x-2,3.8,z+1.5],[x,3.45,z+1.5],[x+2,3.8,z+1.5]],30,.08);
  }
  for(let z of [1,10,19]){stall(-40,z,m.rose);stall(-29,z,m.teal);}
  gateway(-35,30,m.rose);strand(-45,8,-3,-25,8,-3,1.4);strand(-45,8,15,-25,8,15,1.4);
  light(-35,5,10,90,25);
  // The lantern garden: low monuments, petal circles and a central tree.
  box(m.darkStone,36,.12,10,18,.24,24);
  for(let side of [-1,1])for(let z of [1,8,15,22]){
    const x=36+side*6;box(m.stone,x,.2,z,2.1,.4,3.3);archSolid(m.cream,x,.4,z-1.4,1.3,1.65,.3);
    flowers(x,.45,z,.7,22);candleCluster(x,.43,z+.7,5,.45);
    box(m.gold,x,1.38,z-1.04,.45,.07,.03);box(m.gold,x,1.38,z-1.03,.07,.5,.03);
  }
  cyl(m.wood,36,3.2,10,.32,.65,6.4,9);
  for(let i=0;i<9;i++){const a=i/9*6.28,x=36+Math.cos(a)*3,z=10+Math.sin(a)*3;
    line([[36,3.8,10],[x,6.6,z]],m.wood,.17);sphere(m.leaf,x,7+rand(),z,2,1.4,2);lantern(x,4.4,z,1.5);
    line([[x,6.7,z],[x,5.4,z]],m.metal,.02);
  }
  flowers(36,.1,10,1.5,85);gateway(36,30,m.purple);light(36,4,10,55,22);
  strand(27,9,27,45,9,27,1.5);
  const timeUniform={value:0};
  paperMats.forEach(material=>{material.onBeforeCompile=shader=>{shader.uniforms.uTime=timeUniform;shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z += sin(position.x * 1.8 + position.y + uTime * 1.5) * .09 * (1.0 - uv.y);');};});
  // Marigold petals scattered in continuous pathways.
  const petalGeo=new T.SphereGeometry(1,4,2);
  for(let i=0;i<4200;i++){
    let x,z;if(i<1800){const a=rand()*6.28,r=3.4+rand()*.65;x=Math.cos(a)*r;z=6+Math.sin(a)*r;}else if(i<2900){x=(rand()-.5)*.8;z=-5+rand()*25;}else{const side=rand()>.5?1:-1,z0=rand()*20-3;x=side*(5+z0*.28)+(rand()-.5)*.7;z=z0;}
    inst('petals-'+(i%4===0?'yellow':'orange'),petalGeo,i%4===0?m.yellow:m.orange,x,.065,z,.035+rand()*.06,.012,.035+rand()*.06,0,rand()*6.28);
  }
  // Extra clusters, votives and village lanterns.
  for(let side of [-1,1])for(let z=-18;z<23;z+=3.5){lantern(side*17.4,0,z,1.5);candleCluster(side*17,0,z+1,5,.6);}
  for(let x of [-9,-5,5,9]){pot(x,0,17,1.1);candleCluster(x+1,0,17,9,.7);}
  // Real lighting is concentrated at the landmarks; emissive flames do the rest.
  light(0,5.5,-10,85,23);light(-8,3.5,-7,65,15);light(8,3.5,-7,65,15);light(0,2.7,6,22,10);
  light(-15,4,1,65,12);light(15,4,1,65,12);light(-10,3,15,38,12);light(10,3,15,38,12);
  light(0,7,-13,45,9,'#f42b8f');
  const hemi=new T.HemisphereLight('#7089cb','#452032',1.45);scene.add(hemi);
  const moonlight=new T.DirectionalLight('#819cf8',2.4);moonlight.position.set(-14,25,12);moonlight.castShadow=true;moonlight.shadow.mapSize.set(2048,2048);moonlight.shadow.camera.left=-32;moonlight.shadow.camera.right=32;moonlight.shadow.camera.top=30;moonlight.shadow.camera.bottom=-30;moonlight.shadow.camera.far=85;moonlight.shadow.normalBias=.06;moonlight.shadow.bias=-.0003;scene.add(moonlight);
  // Finish geometry batches. Each material draws as one static mesh.
  for(const [material,parts] of staticParts){const geo=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());const mesh=new T.Mesh(geo,material);mesh.castShadow=material!==m.flame&&material!==m.window&&!paperMats.includes(material);mesh.receiveShadow=true;scene.add(mesh);}
  const flameMeshes=[];
  for(const [key,{geo,material,items}] of instances){
    const mesh=new T.InstancedMesh(geo,material,items.length);items.forEach((v,i)=>{dummy.position.set(v.x,v.y,v.z);dummy.scale.set(v.sx,v.sy,v.sz);dummy.rotation.set(v.rx,v.ry,v.rz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=key==='candles';mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);if(key==='flames')flameMeshes.push(mesh);
  }
  const emberCount=160,emberPositions=new Float32Array(emberCount*3),emberSeeds=[];
  for(let i=0;i<emberCount;i++){emberSeeds.push({x:(rand()-.5)*36,y:rand()*12,z:(rand()-.5)*36,speed:.15+rand()*.3});}
  const emberGeo=new T.BufferGeometry();emberGeo.setAttribute('position',new T.BufferAttribute(emberPositions,3));const emberMat=new T.PointsMaterial({color:'#ffb344',size:.045,transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending});const embers=new T.Points(emberGeo,emberMat);scene.add(embers);
  // A painted gradient sky and distant stars.
  const sky=new T.Mesh(new T.SphereGeometry(180,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color('#07122f')},bottom:{value:new T.Color('#50324c')}},vertexShader:'varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vPos;uniform vec3 top;uniform vec3 bottom;void main(){float h=clamp(normalize(vPos).y*2.5,0.,1.);gl_FragColor=vec4(mix(bottom,top,h),1.);}'}));scene.add(sky);
  const starPositions=[];for(let i=0;i<700;i++){const a=rand()*6.28,e=.2+rand()*1.2;starPositions.push(Math.cos(a)*Math.cos(e)*140,Math.sin(e)*140,Math.sin(a)*Math.cos(e)*140);}
  const starsGeo=new T.BufferGeometry();starsGeo.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));scene.add(new T.Points(starsGeo,new T.PointsMaterial({color:'#c3c6e6',size:.15,sizeAttenuation:true,transparent:true,opacity:.65})));
  const moon=new T.Mesh(new T.SphereGeometry(2,24,16),new T.MeshBasicMaterial({color:'#d9d8f4'}));moon.position.set(-52,66,-100);scene.add(moon);
  return {navigation:createNavigation(colliders),update(t){timeUniform.value=t;for(let i=0;i<emberCount;i++){const v=emberSeeds[i];emberPositions[i*3]=v.x+Math.sin(t*.3+i)*.6;emberPositions[i*3+1]=(v.y+t*v.speed)%12;emberPositions[i*3+2]=v.z+Math.cos(t*.2+i)*.5;}emberGeo.attributes.position.needsUpdate=true;m.flame.color.setRGB(5.2+Math.sin(t*3.7)*.25,2.7+Math.sin(t*4.2)*.15,.6);},counts:{flowers:[...instances.entries()].filter(([k])=>k.startsWith('flowers')).reduce((n,[k,v])=>n+v.items.length,0),candles:instances.get('candles').items.length}};
}

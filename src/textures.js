import * as THREE from 'three';

function canvas(size, draw) {
  const el = document.createElement('canvas'); el.width = el.height = size;
  const ctx = el.getContext('2d'); draw(ctx, size);
  const tex = new THREE.CanvasTexture(el); tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8; return tex;
}
let seed = 20261101;
export function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
export function stoneTexture() {
  return canvas(1024, (c,s) => {
    c.fillStyle='#403342'; c.fillRect(0,0,s,s);
    const h=102.4,w=170.66;
    for(let row=-1;row<11;row++) for(let col=-1;col<8;col++) {
      const x=col*w+(row%2)*w/2,y=row*h, v=Math.floor(rand()*22);
      c.fillStyle=`rgb(${100+v},${84+v},${82+v})`;
      c.beginPath(); c.roundRect(x+3,y+3,w-6,h-6,9); c.fill();
      c.strokeStyle='rgba(224,192,157,.16)'; c.lineWidth=2; c.stroke();
      for(let i=0;i<90;i++) { c.fillStyle=rand()>.5?'rgba(244,211,180,.06)':'rgba(29,20,37,.1)'; c.fillRect(x+rand()*w,y+rand()*h,rand()*9+1,rand()*3+1); }
    }
  });
}
export function plasterTexture() {
  return canvas(256,(c,s)=>{c.fillStyle='#d9c8b1';c.fillRect(0,0,s,s);for(let i=0;i<15000;i++){c.fillStyle=rand()>.5?'rgba(84,66,53,.07)':'rgba(255,247,212,.1)';c.fillRect(rand()*s,rand()*s,rand()*3+1,rand()*2+1);}});
}
export function rosetteTexture() {
  return canvas(1024,(c,s)=>{
    c.fillStyle='#33162f'; c.fillRect(0,0,s,s);c.translate(s/2,s/2);
    for(let ring=0;ring<4;ring++){
      const n=12+ring*4,r=100+ring*90;
      for(let i=0;i<n;i++){ c.save();c.rotate(i/n*Math.PI*2);c.translate(0,-r);
        c.fillStyle=['#f8aa29','#c51e65','#ff7928','#8b245f'][ring];c.beginPath();c.ellipse(0,0,35+ring*4,85,0,0,Math.PI*2);c.fill();
        c.strokeStyle='#f5ba4c';c.lineWidth=4;c.stroke();c.restore();}
    }
    for(let r=90;r>10;r-=14){c.fillStyle=r%28?'#f59623':'#a72a49';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();}
  });
}
export function skullTexture() {
  return canvas(512,(c,s)=>{
    c.translate(256,230);c.fillStyle='#f5d9a2';
    c.beginPath();c.ellipse(0,-30,158,174,0,0,Math.PI*2);c.fill();c.beginPath();c.roundRect(-102,20,204,165,42);c.fill();
    for(const x of [-64,64]) {c.fillStyle='#49203e';c.beginPath();c.ellipse(x,-45,47,57,0,0,Math.PI*2);c.fill();
      for(let i=0;i<10;i++){const a=i*Math.PI/5;c.fillStyle=i%2?'#f98a23':'#df3466';c.beginPath();c.ellipse(x+Math.cos(a)*52,-45+Math.sin(a)*62,10,15,a,0,Math.PI*2);c.fill();}
      c.fillStyle='#183c44';c.beginPath();c.arc(x,-45,18,0,Math.PI*2);c.fill();}
    c.fillStyle='#49203e';c.beginPath();c.moveTo(0,5);c.lineTo(-24,52);c.lineTo(24,52);c.closePath();c.fill();
    c.strokeStyle='#4e203f';c.lineWidth=7;c.beginPath();c.moveTo(-92,106);c.quadraticCurveTo(0,137,92,106);c.stroke();
    for(let x=-75;x<=75;x+=25){c.beginPath();c.moveTo(x,91);c.lineTo(x,140);c.stroke();}
    c.fillStyle='#c43372';c.beginPath();c.moveTo(0,-176);c.bezierCurveTo(-60,-150,-33,-95,0,-108);c.bezierCurveTo(33,-95,60,-150,0,-176);c.fill();
    for(let side of [-1,1]){c.strokeStyle='#328d8e';c.lineWidth=7;c.beginPath();c.arc(side*112,36,20,.3,Math.PI*1.8);c.stroke();}
    for(let i=0;i<7;i++){c.fillStyle='#ea7434';c.beginPath();c.arc(Math.sin(i)*16,163+Math.cos(i)*12,6,0,Math.PI*2);c.fill();}
  });
}
export function papelTexture(variant=0) {
  return canvas(256,(c,s)=>{
    c.fillStyle='#fff4da';c.fillRect(4,0,248,222);
    for(let i=0;i<8;i++){c.beginPath();c.arc(20+i*31,222,16,0,Math.PI);c.fill();}
    c.globalCompositeOperation='destination-out';
    for(let x=18;x<248;x+=22)for(let y=20;y<210;y+=24){if(x>45&&x<213&&y>43&&y<180)continue;c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fill();}
    c.save();c.translate(128,112);
    if(variant%2===0){
      c.beginPath();c.ellipse(0,-10,46,51,0,0,Math.PI*2);c.fill();c.fillRect(-29,12,58,49);
      c.globalCompositeOperation='source-over';c.beginPath();c.arc(-18,-14,12,0,Math.PI*2);c.arc(18,-14,12,0,Math.PI*2);c.fill();
      for(let x=-20;x<=20;x+=10)c.fillRect(x,31,4,24);
    } else {for(let i=0;i<8;i++){c.save();c.rotate(i*Math.PI/4);c.beginPath();c.ellipse(0,-35,11,29,0,0,Math.PI*2);c.fill();c.restore();}}
    c.restore();c.globalCompositeOperation='destination-out';
    for(let x of [48,208])for(let y of [60,105,155]){c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillRect(-7,-7,14,14);c.restore();}
  });
}
export function glowTexture() {
  return canvas(128,(c,s)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,174,55,.7)');g.addColorStop(.2,'rgba(255,128,20,.32)');g.addColorStop(1,'rgba(255,93,10,0)');c.fillStyle=g;c.fillRect(0,0,s,s);});
}
export function mosaicTexture() {
  return canvas(1024,(c,s)=>{c.translate(s/2,s/2);c.fillStyle='#4e3544';c.beginPath();c.arc(0,0,510,0,Math.PI*2);c.fill();
    for(let r of [495,470,360,340,185,160]){c.strokeStyle=r%2?'#dfa14d':'#b27145';c.lineWidth=5;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();}
    for(let i=0;i<24;i++){c.save();c.rotate(i/24*Math.PI*2);c.fillStyle=i%2?'#ab4d60':'#c08c48';c.beginPath();c.moveTo(0,-180);c.quadraticCurveTo(90,-270,0,-345);c.quadraticCurveTo(-90,-270,0,-180);c.fill();c.restore();}
    for(let i=0;i<40;i++){c.save();c.rotate(i/40*Math.PI*2);c.fillStyle=i%2?'#285659':'#aa7854';c.beginPath();c.moveTo(-19,-375);c.lineTo(19,-375);c.lineTo(21,-452);c.lineTo(-21,-452);c.closePath();c.fill();c.restore();}
  });
}

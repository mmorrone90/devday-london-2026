import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createWorld } from './world.js';
import { createCharacters } from './characters.js';
import './style.css';

const host=document.querySelector('#world');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try {renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){document.querySelector('#loading').hidden=true;document.querySelector('#error').hidden=false;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
host.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#1c1731',.007);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.3,350);
const views={plaza:{p:[0,10.5,28],t:[0,3.6,-6]},ofrenda:{p:[9,6.8,1],t:[0,5,-13]},arch:{p:[4.5,4.2,14],t:[-14,3,-1]},above:{p:[64,62,80],t:[0,1,9]},market:{p:[-24,10,33],t:[-35,2,10]},garden:{p:[25,10,35],t:[36,3,12]}};
camera.position.fromArray(views.plaza.p);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.fromArray(views.plaza.t);controls.enableDamping=true;controls.dampingFactor=.06;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=4;controls.maxDistance=105;controls.zoomSpeed=.65;controls.panSpeed=.7;controls.rotateSpeed=.45;
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.25,.45,1.35);composer.addPass(bloom);composer.addPass(new OutputPass());
const world=createWorld(scene);
const characters=createCharacters(scene,camera);
let paused=reducedMotion,tour=false,t=0,last=performance.now(),transition=null,hidden=false;
const motionButton=document.querySelector('#motion');motionButton.textContent=paused?'Resume motion':'Pause motion';motionButton.setAttribute('aria-label',motionButton.textContent);
function selectView(name){tour=false;document.querySelector('#tour').setAttribute('aria-pressed','false');const view=views[name];transition={start:performance.now(),from:camera.position.clone(),targetFrom:controls.target.clone(),to:new THREE.Vector3(...view.p),targetTo:new THREE.Vector3(...view.t),duration:reducedMotion?1:1800};document.querySelectorAll('[data-view]').forEach(b=>{const selected=b.dataset.view===name;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>selectView(b.dataset.view)));
controls.addEventListener('start',()=>{transition=null;tour=false;document.querySelector('#tour').setAttribute('aria-pressed','false');});
motionButton.addEventListener('click',()=>{paused=!paused;motionButton.textContent=paused?'Resume motion':'Pause motion';motionButton.setAttribute('aria-label',motionButton.textContent);if(paused){tour=false;document.querySelector('#tour').setAttribute('aria-pressed','false');}});
document.querySelector('#tour').addEventListener('click',()=>{tour=!tour;transition=null;document.querySelector('#tour').setAttribute('aria-pressed',String(tour));if(tour){paused=false;motionButton.textContent='Pause motion';motionButton.setAttribute('aria-label','Pause ambient animation');}document.querySelectorAll('[data-view]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});});
document.querySelector('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{document.querySelector('#hint').textContent='Fullscreen is unavailable in this browser.';}});
function toggleUI(){hidden=!hidden;document.body.classList.toggle('ui-hidden',hidden);document.querySelector('#restore-ui').hidden=!hidden;}
document.querySelector('#hide-ui').addEventListener('click',toggleUI);document.querySelector('#restore-ui').addEventListener('click',toggleUI);
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h')toggleUI();if(e.key==='1')selectView('plaza');if(e.key==='2')selectView('ofrenda');if(e.key==='3')selectView('arch');if(e.key==='4')selectView('above');});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
if(innerWidth<700){camera.position.set(15,15,37);controls.target.set(0,3,-6);document.querySelector('#hint').textContent='Drag to look around · Pinch to explore';}
let frames=0, sampleStart=performance.now(), sampleFrames=0;
const keys=new Set(), move=new THREE.Vector3(), forward=new THREE.Vector3(), right=new THREE.Vector3();
window.addEventListener('keydown',e=>{if(['w','a','s','d','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(e.key)){keys.add(e.key);e.preventDefault();transition=null;tour=false;document.querySelector('#tour').setAttribute('aria-pressed','false');}});
window.addEventListener('keyup',e=>keys.delete(e.key));
window.addEventListener('blur',()=>keys.clear());
const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
let pointerStart=null, toastTimer;
renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{if(!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>6)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(characters.meshes)[0];if(hit){const quote=characters.quote(hit.object);showToast(quote.name,quote.text);}});
function showToast(name,text){document.querySelector('#guest-name').textContent=name;document.querySelector('#guest-quote').textContent=text;document.querySelector('#guest-toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{document.querySelector('#guest-toast').hidden=true;},5000);}
document.querySelector('#dance').addEventListener('click',()=>{paused=false;motionButton.textContent='Pause motion';motionButton.setAttribute('aria-label','Pause motion');characters.startParty(t);showToast('The afterparty has started','Ten seconds. No pulse. All rhythm.');});
renderer.info.autoReset=false;
function animate(now){const dt=Math.min((now-last)/1000,.05);last=now;if(!paused)t+=dt;
  if(transition){const f=Math.min((now-transition.start)/transition.duration,1),e=1-Math.pow(1-f,4);camera.position.lerpVectors(transition.from,transition.to,e);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,e);if(f===1)transition=null;}
  if(tour){camera.position.set(Math.sin(t*.09)*25,11+Math.sin(t*.04)*3,Math.cos(t*.09)*24+1);controls.target.set(0,4,-7);}
  if(keys.size){camera.getWorldDirection(forward);forward.y=0;forward.normalize();right.crossVectors(forward,camera.up).normalize();move.set(0,0,0);if(keys.has('w')||keys.has('ArrowUp'))move.add(forward);if(keys.has('s')||keys.has('ArrowDown'))move.sub(forward);if(keys.has('d')||keys.has('ArrowRight'))move.add(right);if(keys.has('a')||keys.has('ArrowLeft'))move.sub(right);move.normalize().multiplyScalar(dt*10);camera.position.add(move);controls.target.add(move);}
  controls.target.x=THREE.MathUtils.clamp(controls.target.x,-52,52);controls.target.z=THREE.MathUtils.clamp(controls.target.z,-30,55);
  controls.update();world.update(t);characters.update(t);renderer.info.reset();composer.render();
  sampleFrames++;if(import.meta.env.DEV&&now-sampleStart>5000){console.info("AFTERLIFE render",JSON.stringify({fps:Math.round(sampleFrames*1000/(now-sampleStart)),triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,flowers:world.counts.flowers,guests:characters.count}));sampleFrames=0;sampleStart=now;}
  if(frames++===3){document.querySelector('#loading').classList.add('loaded');setTimeout(()=>{document.querySelector('#loading').hidden=true;},750);renderer.shadowMap.autoUpdate=false;}
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
// Read-only diagnostics for visual QA and future scene integration.
window.afterlife={scene,camera,renderer,world,views,selectView,getState:()=>({paused,tour,hidden,objects:scene.children.length,guests:characters.count,...world.counts,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles})};

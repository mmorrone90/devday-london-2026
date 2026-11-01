import assert from 'node:assert/strict';
import {createNavigation} from '../src/navigation.js';
import {createRoamer} from '../src/roaming.js';
const nav=createNavigation([{type:'box',x:0,z:3,w:4,d:10},{type:'circle',x:14,z:12,r:3}]);
let seed=729;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const walkers=Array.from({length:18},(_,i)=>createRoamer(nav,nav.free(-15+(i%6)*6,18+Math.floor(i/6)*5,.65),i,random));
const distance=walkers.map(()=>0),last=walkers.map(w=>({...w.position}));
for(let frame=1;frame<=2400;frame++){
 let canPlan=true;for(const [i,w] of walkers.entries()){
  const result=w.update(1/30,frame/30,{canPlan});if(result.planned)canPlan=false;
  assert(nav.clear(w.position.x,w.position.z,.65),'Every guest stays outside the scenery');
  distance[i]+=Math.hypot(w.position.x-last[i].x,w.position.z-last[i].z);last[i]={...w.position};
 }
}
assert(distance.every(d=>d>20),'All eighteen guests must roam meaningfully, not oscillate in place');
assert(new Set(distance.map(d=>Math.round(d))).size>5,'Guests move independently at different paces');
const before=walkers.map(w=>({...w.position}));walkers.forEach(w=>w.update(.05,81,{paused:true}));assert.deepEqual(walkers.map(w=>w.position),before,'Dancing pauses navigation');
console.log('PASS: 18 independent roaming guests, sustained movement, obstacle avoidance and dance pause.');

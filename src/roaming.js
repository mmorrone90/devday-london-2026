// Each ambient guest owns its route, pace and short rest stops.
export function createRoamer(navigation,start,index=0,random=Math.random){
 const position={x:start.x,z:start.z};
 let route=[],restUntil=index*.12,stuck=0,heading=0;
 const speed=.95+(index%5)*.15;
 function chooseRoute(t){
  for(let attempt=0;attempt<5;attempt++){
   const angle=random()*Math.PI*2,distance=6+random()*12;
   const target=navigation.free(position.x+Math.cos(angle)*distance,position.z+Math.sin(angle)*distance,.65);
   if(Math.hypot(target.x-position.x,target.z-position.z)<4)continue;
   const candidate=navigation.path(position,target);
   if(candidate.length<3)continue;
   // Bridge the actual position to its grid route without cutting a corner.
   const first=candidate.findIndex(p=>navigation.segmentClear(position,p,.65));
   if(first<0)continue;
   route=candidate.slice(first);return;
  }
  restUntil=t+.5+random();
 }
 return {position,get heading(){return heading;},update(dt,t,{paused=false,canPlan=true}={}){
  if(paused||dt<=0)return {moving:false,planned:false};
  let planned=false;
  if(!route.length&&t>=restUntil&&canPlan){chooseRoute(t);planned=true;}
  let budget=dt*speed,moved=0;
  while(route.length&&budget>0){
   const target=route[0],dx=target.x-position.x,dz=target.z-position.z,d=Math.hypot(dx,dz);
   if(d<.06){route.shift();if(!route.length)restUntil=t+.5+random()*1.5;continue;}
   const step=Math.min(budget,d),before={...position};
   navigation.move(position,dx/d*step,dz/d*step,.65);
   const actual=Math.hypot(position.x-before.x,position.z-before.z);moved+=actual;budget-=step;
   if(actual>.0001)heading=Math.atan2(position.x-before.x,position.z-before.z);
   if(actual<step*.2)break;
  }
  stuck=route.length&&moved<dt*speed*.15?stuck+dt:0;
  if(stuck>.8){route=[];stuck=0;restUntil=t+.2;}
  return {moving:moved>.0001,planned};
 }};
}

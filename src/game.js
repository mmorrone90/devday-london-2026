import * as T from 'three';
import {createClient} from '@supabase/supabase-js';
import QRCode from 'qrcode';
import {createHunter} from './hunter.js';
import {createPlayerAvatars} from './player-avatars.js';
const URL='https://flwzkistgefltcuvzybi.supabase.co';
const API=URL+'/functions/v1/afterlife-api/';
const KEY='sb_publishable_hwtrzD27ULJ9hlVn5RfFuA_Qk_EpgF_';
const client=createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const tokenKey='afterlife.guest.v1';
const byId=id=>document.getElementById(id);
const icons={pumpkin:'🎃',ghost:'👻',reaper:'💀'};
export function createGame(scene,camera,controls,{toast,onDance,stopDance,navigation}){
 const avatars=createPlayerAvatars(scene,navigation),players=new Map(),hunter=createHunter(scene,navigation);
 let overlordPaused=false,canHost=false,leaving=false,pendingMove=null;
 let me=null,local=null,token=localStorage.getItem(tokenKey),event=null,nextEvent=null,photo=null,sequence=0,lastSend=0,sending=false,lastPoll=0,eventSeen=null,connected=false,voteTally={},clockOffset=0,lastTick=0,tickPending=false;
 const movement=new Set(),direction=new T.Vector3(),right=new T.Vector3(),delta=new T.Vector3();
 const joinDialog=byId('join-dialog'),shareDialog=byId('share-dialog'),leaveDialog=byId('leave-dialog');
 function status(text){byId('connection-status').textContent=text;}
 async function request(action,body,method='POST'){
  const r=await fetch(API+action,{method,headers:{'Content-Type':'application/json',...(token?{'x-player-token':token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});let j;try{j=await r.json();}catch{throw new Error('The party connection is unavailable.');}if(!r.ok)throw new Error(j.error??'The party connection is unavailable.');return j;
 }
 function updatePlayer(p){if(p.id!==me?.id&&Date.parse(p.updated_at)<Date.now()+clockOffset-65000){players.delete(p.id);avatars.remove(p.id);renderCount();return;}players.set(p.id,p);avatars.upsert(p);if(me?.id===p.id){me={...me,...p};sequence=Math.max(sequence,p.sequence);renderCard();}renderCount();}
 function renderCount(){byId('player-count').textContent=`${players.size} ${players.size===1?'soul':'souls'} in town`;}
 function renderCard(){if(!me)return;byId('my-nickname').textContent=me.nickname;byId('my-title').textContent=me.title;byId('my-source').textContent=me.assignment_source==='openai_decisions'?'Chosen by OpenAI Decisions':'Party draw · AI unavailable';byId('my-icon').textContent=icons[me.kind];const portrait=byId('my-portrait');if(me.portrait_url){portrait.src=me.portrait_url;portrait.hidden=false;byId('my-icon').hidden=true;}byId('portrait-status').textContent=me.portrait_status==='generating'?'Your AI portrait is being painted…':me.portrait_status==='ready'?'Portrait by Image 2.5':me.portrait_status==='failed'?'Portrait unavailable. Your monster is ready to play.':'';}
 function enter(p,host=false){me=p;canHost=host;local={...navigation.free(p.x,p.z),heading:p.heading};byId('overlord-control').hidden=!canHost;sequence=p.sequence;avatars.setSelf(p.id);updatePlayer(p);joinDialog.close();document.body.classList.add('joined');byId('join-button').textContent='My monster';camera.position.set(p.x+7,10,p.z+13);controls.target.set(p.x,1.4,p.z);toast('Welcome to Afterlife',`${p.nickname}, ${p.title}. Use the arrow pad or WASD to move.`);}
 async function refresh(){try{const s=await request('state',undefined,'GET');clockOffset=Date.parse(s.server_time)-Date.now();const ids=new Set(s.players.map(p=>p.id));for(const id of players.keys())if(!ids.has(id)&&id!==me?.id){players.delete(id);avatars.remove(id);}s.players.forEach(updatePlayer);overlordPaused=Boolean(s.overlord_paused);event=overlordPaused?null:s.event;if(overlordPaused)stopDance();nextEvent=s.next_event_at;voteTally=s.tally;byId('ai-status').textContent=s.ai_enabled?'OpenAI connected':'AI offline · party draw active';renderEvent();status(connected?'Live town':'Connected · syncing');}catch{status('Reconnecting…');}}
 function renderEvent(){const now=Date.now()+clockOffset,active=event&&Date.parse(event.expires_at)>now;byId('event-banner').hidden=!active;if(active){byId('event-title').textContent=event.title;byId('event-message').textContent=event.message;byId('event-source').textContent=event.source==='openai_decisions'?'THE AI OVERLORD HAS SPOKEN':event.source==='party_rotation'?'OVERLORD VARIETY ROUND':'PARTY HOST · AI UNAVAILABLE';byId('vote-controls').hidden=event.kind!=='monster_election';byId('event-seconds').textContent=Math.max(0,Math.ceil((Date.parse(event.expires_at)-now)/1000))+'s';if(event.id!==eventSeen){eventSeen=event.id;if(event.kind==='ghost_dance')onDance(Math.max(1,(Date.parse(event.expires_at)-now)/1000));}for(const kind of Object.keys(icons))byId('votes-'+kind).textContent=voteTally[kind]??0;}
  else if(event?.kind==='monster_election'&&eventSeen===event.id){const sorted=Object.entries(voteTally).sort((a,b)=>b[1]-a[1]);if(sorted[0]?.[1]){const tied=sorted.filter(x=>x[1]===sorted[0][1]).map(x=>x[0]);toast('Election result',tied.length>1?'A tie! The town has a coalition of monsters.':`${icons[sorted[0][0]]} ${sorted[0][0]} is mayor of Afterlife!`);}eventSeen=null;}
  byId('overlord-control').textContent=overlordPaused?'Resume Overlord':'Stop Overlord';byId('overlord-control').setAttribute('aria-pressed',String(overlordPaused));
  byId('next-event').textContent=overlordPaused?'Overlord stopped · free roaming':nextEvent?'Next world event in '+Math.max(0,Math.ceil((Date.parse(nextEvent)-now)/1000))+'s':'The Overlord is waking up…';
 }
 byId('overlord-control').addEventListener('click',async()=>{const b=byId('overlord-control');b.disabled=true;try{await request('overlord-control',{paused:!overlordPaused});await refresh();toast(overlordPaused?'Overlord stopped':'Overlord resumed',overlordPaused?'Takeovers are paused for everyone. Run free!':'The next takeover starts in 20 seconds.');}catch(e){toast('Host control',e.message);}finally{b.disabled=false;}});
 async function leaveParty(){
  if(leaving||!me)return;leaving=true;movement.clear();byId('leave-confirm').disabled=true;byId('leave-confirm').textContent='Leaving…';
  // Finish an in-flight position update before marking this guest inactive.
  try{await Promise.race([pendingMove??Promise.resolve(),new Promise(resolve=>setTimeout(resolve,2500))]);await Promise.race([request('leave',{}),new Promise(resolve=>setTimeout(resolve,2500))]);}catch{}
  localStorage.removeItem(tokenKey);me=null;token=null;
  const url=new globalThis.URL(location.href);url.searchParams.set('join','1');location.replace(url.href);
 }
 byId('leave-button').addEventListener('click',()=>{byId('leave-host-note').hidden=!canHost;leaveDialog.showModal();});
 byId('leave-cancel').addEventListener('click',()=>leaveDialog.close());
 byId('leave-confirm').addEventListener('click',leaveParty);
 // Signing out in one tab must also stop an already open copy from moving.
 window.addEventListener('storage',e=>{if(e.key===tokenKey&&e.newValue!==token){me=null;token=null;location.reload();}});
 byId('join-button').addEventListener('click',()=>{if(me){byId('my-card').classList.toggle('expanded');return;}joinDialog.showModal();});
 byId('join-close').addEventListener('click',()=>joinDialog.close());
 byId('share-button').addEventListener('click',async()=>{shareDialog.showModal();const link=(location.hostname==='localhost'?'https://afterlife-halloween-afterparty.mirco1990.chatgpt.site':location.origin)+'/?join=1';byId('join-link').value=link;await QRCode.toCanvas(byId('join-qr'),link,{width:230,margin:2,color:{dark:'#1c1029',light:'#fff3df'}});});
 byId('share-close').addEventListener('click',()=>shareDialog.close());
 byId('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(byId('join-link').value);byId('copy-link').textContent='Copied';}catch{byId('join-link').select();}});
 byId('selfie').addEventListener('change',async e=>{photo=null;byId('selfie-preview').hidden=true;const file=e.target.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){byId('join-error').textContent='Choose a JPEG, PNG or WebP photo smaller than 10 MB.';e.target.value='';return;}try{const bitmap=await createImageBitmap(file),c=document.createElement('canvas'),ratio=Math.min(1,512/Math.max(bitmap.width,bitmap.height));c.width=Math.round(bitmap.width*ratio);c.height=Math.round(bitmap.height*ratio);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();photo=c.toDataURL('image/jpeg',.8);byId('selfie-preview').src=photo;byId('selfie-preview').hidden=false;byId('join-error').textContent='';}catch{byId('join-error').textContent='Could not read this photo. Try another image.';}});
 byId('join-form').addEventListener('submit',async e=>{e.preventDefault();const submit=byId('join-submit');submit.disabled=true;submit.textContent='Finding your inner monster…';byId('join-error').textContent='';try{if(!token){token=[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');localStorage.setItem(tokenKey,token);}const s=await request('join',{token,nickname:byId('nickname').value,vibe:byId('vibe').value,snack:byId('snack').value,selfie:photo});enter(s.player,s.can_host);if(s.ai_enabled){request('portrait',{selfie:photo}).catch(e=>{byId('portrait-status').textContent=e.message;});}else byId('portrait-status').textContent='AI portraits are currently unavailable.';photo=null;byId('selfie').value='';byId('selfie-preview').removeAttribute('src');byId('selfie-preview').hidden=true;}catch(e){byId('join-error').textContent=e.message;}finally{submit.disabled=false;submit.textContent='Become a monster';}});
 document.querySelectorAll('[data-move]').forEach(b=>{const direction=b.dataset.move;b.addEventListener('pointerdown',e=>{e.preventDefault();movement.add(direction);b.setPointerCapture(e.pointerId);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>movement.delete(direction));});
 document.querySelectorAll('[data-emote]').forEach(b=>b.addEventListener('click',async()=>{try{await request('emote',{emote:b.dataset.emote});}catch(e){toast('Connection',e.message);}}));
 document.querySelectorAll('[data-vote]').forEach(b=>b.addEventListener('click',async()=>{if(!me){joinDialog.showModal();return;}try{await request('vote',{event_id:event.id,candidate:b.dataset.vote});toast('Vote counted',`You voted for ${b.dataset.vote}.`);refresh();}catch(e){toast('Election',e.message);}}));
 const channel=client.channel('afterlife-world-v1').on('postgres_changes',{event:'*',schema:'public',table:'afterlife_players'},({new:p,old,event:change})=>{if(p?.id)updatePlayer(p);else if(old?.id){players.delete(old.id);avatars.remove(old.id);}}).on('postgres_changes',{event:'INSERT',schema:'public',table:'afterlife_events'},({new:e})=>{event=e;refresh();}).on('postgres_changes',{event:'*',schema:'public',table:'afterlife_votes'},()=>refresh()).on('postgres_changes',{event:'UPDATE',schema:'public',table:'afterlife_state'},()=>refresh()).subscribe(s=>{connected=s==='SUBSCRIBED';status(connected?'Live town':'Connecting…');});
 refresh();
 if(token)request('session',undefined,'GET').then(s=>enter(s.player,s.can_host)).catch(()=>{token=null;localStorage.removeItem(tokenKey);if(new URLSearchParams(location.search).has('join'))joinDialog.showModal();});
 else if(new URLSearchParams(location.search).has('join'))joinDialog.showModal();
 const interval=setInterval(()=>{renderEvent();if(Date.now()-lastPoll>15000){lastPoll=Date.now();refresh();}if(me&&!leaving&&!overlordPaused&&!tickPending&&Date.now()-lastTick>10000&&nextEvent&&Date.parse(nextEvent)<Date.now()+clockOffset){tickPending=true;lastTick=Date.now();request('tick',{}).then(r=>{if(r.event)refresh();}).catch(()=>{}).finally(()=>{tickPending=false;});}},1000);
 window.addEventListener('blur',()=>movement.clear());
 window.addEventListener('pagehide',()=>{if(me)fetch(API+'leave',{method:'POST',headers:{'Content-Type':'application/json','x-player-token':token},body:'{}',keepalive:true}).catch(()=>{});clearInterval(interval);client.removeChannel(channel);});
 // Instanced toy pumpkins provide a visible global event without downloading assets.
 const rain=new T.InstancedMesh(new T.SphereGeometry(.4,8,6),new T.MeshStandardMaterial({color:'#ff8c16',roughness:.7}),60);rain.visible=false;scene.add(rain);const dummy=new T.Object3D();
 return {
  isJoined:()=>Boolean(me),isTyping:()=>joinDialog.open||shareDialog.open||leaveDialog.open,
  update(dt,t,keys){
   const frozen=Boolean(!overlordPaused&&event&&Date.parse(event.expires_at)>Date.now()+clockOffset);
   document.body.classList.toggle('takeover',frozen);
   if(me&&local&&!leaving){const previous={x:local.x,z:local.z};camera.getWorldDirection(direction);direction.y=0;direction.normalize();right.crossVectors(direction,camera.up).normalize();delta.set(0,0,0);
    if(!frozen&&!joinDialog.open&&!shareDialog.open&&!leaveDialog.open){if(keys.has('w')||keys.has('ArrowUp')||movement.has('up'))delta.add(direction);if(keys.has('s')||keys.has('ArrowDown')||movement.has('down'))delta.sub(direction);if(keys.has('a')||keys.has('ArrowLeft')||movement.has('left'))delta.sub(right);if(keys.has('d')||keys.has('ArrowRight')||movement.has('right'))delta.add(right);}
    if(delta.lengthSq()){delta.normalize().multiplyScalar(dt*5);navigation.move(local,delta.x,delta.z,.65);local.heading=Math.atan2(delta.x,delta.z);const dx=local.x-previous.x,dz=local.z-previous.z;camera.position.x+=dx;camera.position.z+=dz;controls.target.x+=dx;controls.target.z+=dz;}
    const chase=hunter.update(dt,t,local,frozen);byId('hunt-status').textContent=frozen?'AI takeover · movement paused':chase.grace?'Reaper incoming · run!':`Escape the Reaper · Caught ${chase.catches}`;
    if(chase.caught){const spawn=navigation.free(0,15,.65),dx=spawn.x-local.x,dz=spawn.z-local.z;Object.assign(local,spawn);camera.position.x+=dx;camera.position.z+=dz;controls.target.x+=dx;controls.target.z+=dz;hunter.reset(local,t);lastSend=0;toast('The Reaper caught you!','One more afterlife. Respawned in the plaza. Run!');}
    const now=performance.now();if(!sending&&now-lastSend>(delta.lengthSq()?500:20000)){sending=true;lastSend=now;pendingMove=request('move',{...local,sequence:++sequence}).catch(()=>status('Reconnecting…')).finally(()=>sending=false);}
   }
   avatars.update(dt,t,event,local);
   rain.visible=Boolean(event&&event.kind==='pumpkin_rain'&&Date.parse(event.expires_at)>Date.now()+clockOffset);if(rain.visible){for(let i=0;i<60;i++){dummy.position.set(Math.sin(i*33.7)*17,18-((t*4+i*.65)%18),Math.cos(i*17.1)*15+5);dummy.rotation.set(t+i,t*.7,0);dummy.scale.set(1,.8,1);dummy.updateMatrix();rain.setMatrixAt(i,dummy.matrix);}rain.instanceMatrix.needsUpdate=true;rain.computeBoundingSphere();}
  }
 };
}

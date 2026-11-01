import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
const URL='https://flwzkistgefltcuvzybi.supabase.co';
const KEY='sb_publishable_hwtrzD27ULJ9hlVn5RfFuA_Qk_EpgF_';
const session=JSON.parse(await readFile(process.argv[2],'utf8'));
const API=URL+'/functions/v1/afterlife-api/';
async function call(action,body,token=session.token){const r=await fetch(API+action,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{'x-player-token':token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json()};}
const identity=await call('session');assert.equal(identity.status,200);
const unauthorized=await call('move',{x:0,z:0,sequence:99},'');assert.equal(unauthorized.status,401);
const fake=await call('emote',{emote:'dance'},'a'.repeat(64));assert.equal(fake.status,401);
const invalid=await call('move',{x:'not-a-number',z:0,sequence:99});assert.equal(invalid.status,400);
const same=await call('join',{token:session.token,nickname:'Must not replace existing nickname',vibe:'chill'});assert.equal(same.body.player.id,identity.body.player.id);assert.equal(same.body.player.nickname,identity.body.player.nickname);
const anon=createClient(URL,KEY,{auth:{persistSession:false}});
const privateRows=await anon.from('afterlife_sessions').select('*');assert(privateRows.error,'Private guest passes must be inaccessible');
const write=await anon.from('afterlife_players').update({nickname:'unauthorized'}).eq('id',identity.body.player.id).select();assert(write.error,'Anonymous direct writes must be denied');
const clients=[createClient(URL,KEY,{auth:{persistSession:false}}),createClient(URL,KEY,{auth:{persistSession:false}})];
const received=[false,false];const channels=clients.map((c,i)=>c.channel('smoke-'+i).on('postgres_changes',{event:'UPDATE',schema:'public',table:'afterlife_players',filter:'id=eq.'+identity.body.player.id},payload=>{if(payload.new.sequence===identity.body.player.sequence+2)received[i]=true;}));
try{
 await Promise.all(channels.map(c=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Realtime subscription timed out')),12000);c.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timeout);resolve();}else if(status==='CHANNEL_ERROR'){clearTimeout(timeout);reject(new Error('Realtime subscription failed'));}});}))); 
 const moved=await call('move',{x:3,z:15,heading:1.2,sequence:identity.body.player.sequence+2});assert.equal(moved.status,200);
 const stale=await call('move',{x:30,z:30,heading:0,sequence:identity.body.player.sequence+1});assert.equal(stale.status,200);
 const end=Date.now()+10000;while(!received.every(Boolean)&&Date.now()<end)await new Promise(r=>setTimeout(r,100));assert(received.every(Boolean),'Both independent clients must receive the same movement');
 const current=await call('session');assert.equal(current.body.player.x,3,'Stale movements must not overwrite newer positions');
 const emote=await call('emote',{emote:'wave'});assert.equal(emote.status,200);
 const snapshot=await call('state');assert.equal(snapshot.status,200);assert(snapshot.body.players.some(p=>p.id===identity.body.player.id));
 const next=await call('tick',{});assert.equal(next.status,200);
 console.log('PASS: guest authentication, idempotent join, private session isolation, blocked direct writes, input validation, stale movement protection, two-client Realtime delivery, emotes and shared state.');
}finally{await Promise.all(clients.map((c,i)=>c.removeChannel(channels[i])));await anon.removeAllChannels();}

process.exit(0);

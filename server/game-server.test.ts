import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WebSocket} from 'ws';
import {createGameServer} from './game-server';
import type {RoomView} from '../src/online/protocol';
const origin='http://test';
async function launch(path=':memory:'){const server=createGameServer({databasePath:path,allowDevAuth:true,allowedOrigins:[origin]});server.http.listen(0,'127.0.0.1');await once(server.http,'listening');const port=(server.http.address() as any).port;return {server,url:`http://127.0.0.1:${port}`};}
async function player(url:string,name:string,token?:string){if(!token){const res=await fetch(url+'/dev/session',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({name})});token=(await res.json()).token;}const ws=new WebSocket(url.replace('http','ws'),{origin});await once(ws,'open');let room:RoomView|null=null;const pending=new Map<string,{resolve:()=>void;reject:(e:Error)=>void}>();ws.on('message',bytes=>{const m=JSON.parse(bytes.toString());if(m.type==='room')room=m.room;if(m.type==='reply'){const cb=pending.get(m.id)!;pending.delete(m.id);m.ok?cb.resolve():cb.reject(Error(m.error));}});async function send(type:string,payload:unknown={},revision=room?.revision){await new Promise<void>((resolve,reject)=>{const id=crypto.randomUUID();pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,type,payload,revision}));});}await send('auth',{token});return {ws,token,send,get room(){return room;}};}
const delay=(n=25)=>new Promise(r=>setTimeout(r,n));
test('two separate players: private hands, synchronized ready/turns/chat, rejected invalid and stale moves',async()=>{const {server,url}=await launch();const a=await player(url,'Naomi'),b=await player(url,'Friend');try{
 await a.send('create',{name:'Game Night',handSize:7});await b.send('join',{code:a.room!.code});await delay();assert.equal(a.room!.seats.length,2);
 await assert.rejects(b.send('start'),/host/);await a.send('ready',{ready:true});await delay();await b.send('ready',{ready:true});await delay();await a.send('start');await delay();
 const ar=a.room!,br=b.room!;assert.equal(ar.round!.hand.length,7);assert.equal(br.round!.hand.length,7);assert.equal(ar.round!.activeId,br.round!.activeId);assert.notDeepEqual(ar.round!.hand,br.round!.hand);
 const wire=JSON.stringify(ar);for(const c of br.round!.hand)assert(!wire.includes(c.id),'opponent card leaked');assert(!('deck' in ar.round!));assert(ar.round!.players.every(p=>!('hand'in p)));
 await b.send('message',{text:'😂',effect:'echo'});await delay();assert.deepEqual(a.room!.message,b.room!.message);assert.equal(a.room!.message!.effect,'echo');
 await assert.rejects(b.send('move',{move:{type:'draw'}}),/turn/);
 await delay(3500);await assert.rejects(a.send('move',{move:{type:'play',ids:[br.round!.hand[0].id]}}),/not available/);assert.equal(a.room!.round!.hand.length,7);
 const rev=a.room!.revision;await a.send('move',{move:{type:'draw'}});await delay();assert.equal(a.room!.round!.hand.length,8);assert.equal(b.room!.round!.players.find(p=>p.id===a.room!.you)!.count,8);await assert.rejects(a.send('move',{move:{type:'draw'}},rev),/changed/);
 }finally{a.ws.terminate();b.ws.terminate();await server.close();}});
test('saved identity, seat, cards and wins survive reconnect and a game-server restart',async()=>{const dir=mkdtempSync(join(tmpdir(),'uno-test-')),db=join(dir,'rooms.sqlite');let runtime=await launch(db);const a=await player(runtime.url,'Naomi'),b=await player(runtime.url,'Friend');await a.send('create',{name:'Saved room',handSize:7});await b.send('join',{code:a.room!.code});await delay();await a.send('ready',{ready:true});await delay();await b.send('ready',{ready:true});await delay();await a.send('start');await delay();const saved=structuredClone(a.room!);a.ws.terminate();b.ws.terminate();await runtime.server.close();runtime=await launch(db);const recovered=await player(runtime.url,'Naomi',a.token);try{await delay();assert.equal(recovered.room!.code,saved.code);assert.deepEqual(recovered.room!.round!.hand,saved.round!.hand);assert.deepEqual(recovered.room!.wins,saved.wins);assert.equal(recovered.room!.you,saved.you);}finally{recovered.ws.terminate();await runtime.server.close();rmSync(dir,{recursive:true,force:true});}});
test('untrusted origin and unauthenticated socket cannot access rooms',async()=>{const {server,url}=await launch();try{const res=await fetch(url+'/dev/session',{method:'POST',headers:{origin:'http://evil'},body:'{"name":"intruder"}'});assert.equal(res.status,404);const ws=new WebSocket(url.replace('http','ws'),{origin});await once(ws,'open');ws.send(JSON.stringify({id:'test',type:'create',payload:{name:'intruder',handSize:7}}));const [bytes]=await once(ws,'message');assert.match(JSON.parse(bytes.toString()).error,/sign in/i);ws.terminate();}finally{await server.close();}});
test('room requires two ready players and full games reject newcomers',async()=>{const {server,url}=await launch();const a=await player(url,'Host');try{await a.send('create',{name:'Private room',handSize:7});await a.send('ready',{ready:true});await assert.rejects(a.send('start'),/two connected/);await assert.rejects(a.send('move',{move:{type:'draw'}}),/turn/);}finally{a.ws.terminate();await server.close();}});
test('ten players complete a real shared round; wins sync once and persist into the next deal',async()=>{const {server,url}=await launch();const all:Awaited<ReturnType<typeof player>>[]=[];try{for(let i=0;i<10;i++){const p=await player(url,`Player ${i+1}`);all.push(p);if(i===0)await p.send('create',{name:'Full table',handSize:7});else await p.send('join',{code:all[0].room!.code});await delay();}for(const p of all){await p.send('ready',{ready:true});await delay();}await all[0].send('start');await delay(3550);assert.equal(all[0].room!.seats.length,10);assert.equal(all.reduce((n,p)=>n+p.room!.round!.hand.length,0),70);
 const outsider=await player(url,'Late arrival');await assert.rejects(outsider.send('join',{code:all[0].room!.code}),/started/);outsider.ws.terminate();
 for(let turn=0;turn<3000&&!all[0].room!.round!.winner;turn++){
  const active=all.find(p=>p.room!.you===all[0].room!.round!.activeId)!,r=active.room!.round!,top=r.discard.at(-1)!;
  const legal=r.hand.filter(c=>(!r.drawnCardId||c.id===r.drawnCardId)&&(r.pending?c.value===r.pendingType:c.color==='wild'||c.color===r.color||c.value===top.value));
  if(r.pending&&!legal.length){await delay(470);continue;}
  const card=legal[0];if(card)await active.send('move',{move:{type:'play',ids:[card.id,...(!r.drawnCardId&&/^\d$/.test(card.value)?r.hand.filter(c=>c.id!==card.id&&c.value===card.value).map(c=>c.id):[])],color:'red'}});else await active.send('move',{move:{type:'draw'}});await delay(35);
 }
 const r=all[0].room!;assert(r.round!.winner,'a valid winner must end the round');assert.equal(Object.values(r.wins).reduce((a,b)=>a+b,0),1);for(const p of all)assert.deepEqual(p.room!.wins,r.wins);
 const previous=r.round!.id;await all[0].send('start');await delay();assert.notEqual(all[0].room!.round!.id,previous);assert.equal(Object.values(all[0].room!.wins).reduce((a,b)=>a+b,0),1);
 }finally{all.forEach(p=>p.ws.terminate());await server.close();}});

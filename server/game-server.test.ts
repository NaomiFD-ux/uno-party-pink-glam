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
async function launch(path=':memory:',turnDurationMs=15000){const server=createGameServer({databasePath:path,allowDevAuth:true,allowedOrigins:[origin],turnDurationMs});server.http.listen(0,'127.0.0.1');await once(server.http,'listening');const port=(server.http.address() as any).port;return {server,url:`http://127.0.0.1:${port}`};}
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
  const legal=r.hand.filter(c=>(r.pending?c.value===r.pendingType:c.color==='wild'||c.color===r.color||c.value===top.value));
  if(r.pending&&!legal.length){await delay(470);continue;}
  const card=legal[0];if(card)await active.send('move',{move:{type:'play',ids:[card.id,...(!r.drawnCardId&&/^\d$/.test(card.value)?r.hand.filter(c=>c.id!==card.id&&c.value===card.value).map(c=>c.id):[])],color:'red'}});else await active.send('move',{move:{type:'draw'}});await delay(35);
 }
 const r=all[0].room!;assert(r.round!.winner,'a valid winner must end the round');assert.equal(Object.values(r.wins).reduce((a,b)=>a+b,0),1);for(const p of all)assert.deepEqual(p.room!.wins,r.wins);
 assert(r.round!.winningPlay);assert.equal(r.round!.winningPlay!.actorId,r.round!.winner);assert(r.round!.winningPlay!.cards.length>0);assert.equal(r.round!.winningPlay!.cards.at(-1)!.id,r.round!.discard.at(-1)!.id);for(const p of all)assert.deepEqual(p.room!.round!.winningPlay,r.round!.winningPlay);
 const previous=r.round!.id,scores=structuredClone(r.wins);
 await assert.rejects(all[1].send('open-seats'),/host/);
 await all[0].send('open-seats');await delay();
 for(const p of all){assert.equal(p.room!.round,null);assert.deepEqual(p.room!.wins,scores);assert(p.room!.seats.every(s=>!s.ready));}
 const departing=all.slice(1).find(p=>p.room!.you!==r.round!.winner)!;await departing.send('leave');await delay();
 const newcomer=await player(url,'New next-round player');all.push(newcomer);
 await newcomer.send('join',{code:r.code});await delay();
 assert.equal(all[0].room!.seats.length,10);assert.equal(newcomer.room!.wins[newcomer.room!.you]||0,0);
 assert.deepEqual(newcomer.room!.wins,scores);
 const seated=all.filter(p=>p.room?.code===r.code);
 for(const p of seated){await p.send('ready',{ready:true});await delay();}
 await all[0].send('start');await delay();assert.notEqual(all[0].room!.round!.id,previous);assert.equal(Object.values(all[0].room!.wins).reduce((a,b)=>a+b,0),1);
 assert.equal(all[0].room!.round!.activeId,r.round!.winner);
 assert.equal(newcomer.room!.round!.hand.length,7);assert(newcomer.room!.round!.players.some(p=>p.id===newcomer.room!.you));
 await assert.rejects(all[0].send('open-seats'),/Finish/);
 }finally{all.forEach(p=>p.ws.terminate());await server.close();}});

test('five online players take normal turns in seat order and every client agrees',async()=>{
 const {server,url}=await launch();const all:Awaited<ReturnType<typeof player>>[]=[];
 try{
  for(let i=0;i<5;i++){
   const p=await player(url,`Order ${i+1}`);all.push(p);
   if(i===0)await p.send('create',{name:'Turn order',handSize:7});
   else await p.send('join',{code:all[0].room!.code});
   await delay();
  }
  for(const p of all){await p.send('ready',{ready:true});await delay();}
  await all[0].send('start');await delay(3550);
  const ids=all.map(p=>p.room!.you);
  for(let turn=0;turn<10;turn++){
   const actor=all[turn%5],nextId=ids[(turn+1)%5];
   for(const p of all)assert.equal(p.room!.round!.activeId,ids[turn%5]);
   await assert.rejects(all[(turn+1)%5].send('move',{move:{type:'draw'}}),/turn/);
   await actor.send('move',{move:{type:'draw'}});await delay();
   // A playable drawn card keeps this turn until the player plays or skips.
   if(actor.room!.round!.drawnCardId){
    for(const p of all)assert.equal(p.room!.round!.activeId,ids[turn%5]);
    await actor.send('move',{move:{type:'skip'}});await delay();
   }
   for(const p of all)assert.equal(p.room!.round!.activeId,nextId);
  }
 }finally{all.forEach(p=>p.ws.terminate());await server.close();}
});

test('explicit leave frees the seat, transfers host, and keeps the next turn synchronized',async()=>{
 const {server,url}=await launch();const all:Awaited<ReturnType<typeof player>>[]=[];
 try{
  for(let i=0;i<3;i++){
   const p=await player(url,`Leaving ${i+1}`);all.push(p);
   if(!i)await p.send('create',{name:'Leave test',handSize:7});else await p.send('join',{code:all[0].room!.code});await delay();
  }
  for(const p of all){await p.send('ready',{ready:true});await delay();}
  await all[0].send('start');await delay(3550);
  const code=all[0].room!.code,nextId=all[1].room!.you,lastId=all[2].room!.you;
  await all[0].send('leave');await delay();assert.equal(all[0].room,null);
  for(const p of all.slice(1)){
   assert.equal(p.room!.code,code);assert.equal(p.room!.seats.length,2);assert.equal(p.room!.hostId,nextId);
   assert.equal(p.room!.round!.activeId,nextId);assert.equal(p.room!.round!.players.length,2);
  }
  await all[0].send('create',{name:'Another table',handSize:7});await delay();assert.notEqual(all[0].room!.code,code);
  await all[1].send('leave');await delay();assert.equal(all[1].room,null);
  assert.equal(all[2].room!.round!.winner,lastId);assert.equal(all[2].room!.wins[lastId],1);
  await all[2].send('message',{text:'Still here',effect:'normal'});await delay();assert.equal(all[2].room!.wins[lastId],1);
 }finally{all.forEach(p=>p.ws.terminate());await server.close();}
});

test('the server shares a turn deadline and plays automatically when it expires',async()=>{
 const {server,url}=await launch(':memory:',180),a=await player(url,'Timer host'),b=await player(url,'Timer friend');
 try{
  await a.send('create',{name:'Timed table',handSize:7});await b.send('join',{code:a.room!.code});await delay();
  await a.send('ready',{ready:true});await delay();await b.send('ready',{ready:true});await delay();await a.send('start');await delay();
  assert.equal(a.room!.round!.turnDeadline,b.room!.round!.turnDeadline);assert.equal(a.room!.round!.turnDeadline!-a.room!.round!.startedAt,3680);
  await delay(3720);assert(a.room!.round!.turns>0,'the first expired turn must resolve automatically');assert.equal(a.room!.round!.turns,b.room!.round!.turns);
  assert.equal(a.room!.round!.activeId,b.room!.round!.activeId);assert.equal(a.room!.round!.turnDeadline,b.room!.round!.turnDeadline);
 }finally{a.ws.terminate();b.ws.terminate();await server.close();}
});

test('table chat history includes names/times and survives reconnects, server restart and the next round',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'uno-chat-')),db=join(dir,'rooms.sqlite');let runtime=await launch(db);
 let a=await player(runtime.url,'Chat Host'),b=await player(runtime.url,'Chat Friend');
 try{
  await a.send('create',{name:'Chat table',handSize:7});await b.send('join',{code:a.room!.code});await delay();
  await a.send('message',{text:'First message',effect:'normal'});await delay();
  await b.send('message',{text:'😂',effect:'echo'});await delay();
  const saved=structuredClone(a.room!.messages!);assert.equal(saved.length,2);assert.deepEqual(saved,b.room!.messages);
  assert.deepEqual(saved.map(m=>m.senderName),['Chat Host','Chat Friend']);assert.deepEqual(saved.map(m=>m.text),['First message','😂']);
  assert(saved.every(m=>Number.isFinite(m.at)&&m.at<=Date.now()));assert.notEqual(saved[0].id,saved[1].id);
  const at=a.token,bt=b.token;a.ws.terminate();b.ws.terminate();await runtime.server.close();runtime=await launch(db);
  a=await player(runtime.url,'Chat Host',at);b=await player(runtime.url,'Chat Friend',bt);await delay();assert.deepEqual(a.room!.messages,saved);
  await a.send('ready',{ready:true});await delay();await b.send('ready',{ready:true});await delay();await a.send('start');await delay();
  assert.equal(a.room!.message,null);assert.deepEqual(a.room!.messages,saved);
  const deadline=a.room!.round!.turnDeadline;await b.send('message',{text:'New round!',effect:'slam'});await delay();
  assert.equal(a.room!.messages!.length,3);assert.deepEqual(a.room!.messages,b.room!.messages);assert.equal(a.room!.round!.turnDeadline,deadline);
 }finally{a.ws.terminate();b.ws.terminate();await runtime.server.close();rmSync(dir,{recursive:true,force:true});}
});


test('voice notes synchronize metadata, persist audio outside room state and reject invalid uploads',async()=>{
 const {server,url}=await launch();const a=await player(url,'Voice Host'),b=await player(url,'Voice Friend');
 try{
  await a.send('create',{name:'Voice table',handSize:7});await b.send('join',{code:a.room!.code});await delay();
  await assert.rejects(a.send('voice',{audio:'data:text/html;base64,PHNjcmlwdD4=',duration:2}),/record/i);
  await assert.rejects(a.send('voice',{audio:'data:audio/mp4;base64,YWJj',duration:31}),/record/i);
  await assert.rejects(a.send('voice',{audio:'data:audio/mp4;base64,'+'A'.repeat(550004),duration:2}),/record/i);
  await a.send('voice',{audio:'data:audio/mp4;base64,YWJj',duration:2});await delay();
  const message=a.room!.message!;assert.equal(message.text,'Voice message');assert.equal(message.voice!.duration,2);assert.match(message.voice!.url,/^\/api\/game\/voice\//);assert.deepEqual(message,b.room!.message);assert.equal(a.room!.messages!.at(-1)!.senderName,'Voice Host');assert(!JSON.stringify(a.room).includes('base64'));
  const response=await fetch(url+message.voice!.url.replace('/api/game',''));assert.equal(response.status,404);
 }finally{a.ws.terminate();b.ws.terminate();await server.close();}
});

test('profile slaps synchronize target, preserve gameplay and enforce cooldown and membership',async()=>{
 const {server,url}=await launch();const a=await player(url,'Slap Host'),b=await player(url,'Slap Friend');
 try{
  await a.send('create',{name:'Slap table',handSize:7});await b.send('join',{code:a.room!.code});await delay();
  await assert.rejects(a.send('slap',{targetId:b.room!.you}),/another player/i);
  await a.send('ready',{ready:true});await delay();await b.send('ready',{ready:true});await delay();await a.send('start');await delay();
  const before=structuredClone(a.room!),target=b.room!.you;
  await assert.rejects(a.send('slap',{targetId:a.room!.you}),/another player/i);
  await assert.rejects(a.send('slap',{targetId:'not-at-table'}),/another player/i);
  await a.send('slap',{targetId:target});await delay();
  assert.deepEqual(a.room!.message,b.room!.message);assert.equal(a.room!.message!.slap!.targetId,target);assert.equal(a.room!.message!.senderId,a.room!.you);
  assert.deepEqual(a.room!.round,before.round);assert.equal(a.room!.revision,before.revision);assert.deepEqual(a.room!.event,before.event);
  assert.equal(a.room!.messages!.at(-1)!.senderName,'Slap Host');assert.match(a.room!.messages!.at(-1)!.text,/Slap Friend/);
  await assert.rejects(a.send('slap',{targetId:target}),/recover/i);
  await b.send('slap',{targetId:a.room!.you});await delay();assert.equal(a.room!.message!.slap!.targetId,a.room!.you);
 }finally{a.ws.terminate();b.ws.terminate();await server.close();}
});

test('Who’s Most Likely To keeps simultaneous ballots private, reveals ties and supports host skip/recap without UNO changes',async()=>{
 const {server,url}=await launch();const a=await player(url,'Likely Host'),b=await player(url,'Likely Friend'),c=await player(url,'Third Friend');
 try{
  await a.send('create',{name:'Friend group',handSize:7});await b.send('join',{code:a.room!.code});await c.send('join',{code:a.room!.code});await delay();
  await assert.rejects(b.send('game-mode',{game:'likely',questions:[]}),/host/i);
  await a.send('game-mode',{game:'likely',questions:['Who is always late?']});await delay();
  for(const person of [a,b,c]){await person.send('ready',{ready:true});await delay();}await a.send('start');await delay();
  assert.equal(a.room!.round,null);const game=a.room!.party!;assert.equal(game.question,'Who is always late?');assert.equal(game.total,10);assert.equal(game.phase,'vote');
  await a.send('slap',{targetId:b.room!.you});await delay();assert.equal(b.room!.message!.slap!.targetId,b.room!.you);assert.deepEqual(a.room!.party,game);
  await b.send('message',{text:'This is going to be funny',effect:'echo'});await delay();assert.equal(a.room!.message!.effect,'echo');
  await c.send('voice',{audio:'data:audio/mp4;base64,YWJj',duration:2});await delay();assert.equal(a.room!.message!.voice!.duration,2);assert.equal(a.room!.round,null);
  await a.send('likely-vote',{questionId:game.questionId,targetId:b.room!.you});await delay();
  assert.equal(a.room!.party!.yourVote,b.room!.you);assert.equal(b.room!.party!.yourVote,undefined);assert.deepEqual(b.room!.party!.results,{});assert(!('votes' in b.room!.party!));assert(!('questions' in b.room!.party!));
  await assert.rejects(a.send('likely-vote',{questionId:game.questionId,targetId:a.room!.you}),/locked/i);
  await Promise.all([b.send('likely-vote',{questionId:game.questionId,targetId:a.room!.you}),c.send('likely-vote',{questionId:game.questionId,targetId:null})]);await delay();
  assert.equal(a.room!.party!.phase,'reveal');assert.equal(a.room!.party!.results[a.room!.you],1);assert.equal(a.room!.party!.results[b.room!.you],1);assert.equal(a.room!.party!.totals[a.room!.you],1);assert.equal(a.room!.party!.totals[b.room!.you],1);
  await assert.rejects(b.send('likely-next',{questionId:game.questionId}),/host/i);
  await a.send('likely-next',{questionId:game.questionId});await delay();assert.equal(a.room!.party!.number,2);assert.deepEqual(a.room!.party!.results,{});
  await assert.rejects(c.send('likely-vote',{questionId:game.questionId,targetId:a.room!.you}),/moved on/i);
  const q2=a.room!.party!.questionId;await a.send('likely-skip',{questionId:q2});await delay();assert.equal(a.room!.party!.skipped,true);assert.equal(a.room!.party!.totals[a.room!.you],1);
  await a.send('likely-next',{questionId:q2});await delay();
  while(String(a.room!.party!.phase)!=='finished'){
   await delay(100); // Pace a full ten-question game below the request throttle.
   const q=a.room!.party!.questionId;
   await Promise.all([a,b,c].map(person=>person.send('likely-vote',{questionId:q,targetId:null})));await delay();assert.equal(a.room!.party!.phase,'reveal');
   await a.send('likely-next',{questionId:q});await delay();
  }
  assert.deepEqual(a.room!.wins,{});assert.equal(a.room!.party!.number,10);
  await a.send('likely-lobby');await delay();assert.equal(a.room!.party,null);assert(a.room!.seats.every(s=>!s.ready));
  await a.send('game-mode',{game:'uno',questions:[]});await delay();for(const person of [a,b,c]){await person.send('ready',{ready:true});await delay();}await a.send('start');await delay();assert(a.room!.round);assert.equal(a.room!.round!.hand.length,7);assert.equal(a.room!.party,null);
 }finally{a.ws.terminate();b.ws.terminate();c.ws.terminate();await server.close();}
});

test('likely ballots survive reconnect/restart and explicitly leaving removes invalid choices and transfers host',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'uno-likely-')),db=join(dir,'rooms.sqlite');let runtime=await launch(db);
 let a=await player(runtime.url,'Host'),b=await player(runtime.url,'Friend'),c=await player(runtime.url,'Third');
 try{
  await a.send('create',{name:'Saved party',handSize:7});await b.send('join',{code:a.room!.code});await c.send('join',{code:a.room!.code});await delay();await a.send('game-mode',{game:'likely',questions:[]});await delay();
  for(const person of [a,b,c]){await person.send('ready',{ready:true});await delay();}await a.send('start');await delay();
  const q=a.room!.party!.questionId;await a.send('likely-vote',{questionId:q,targetId:c.room!.you});await delay();
  const tokens=[a.token,b.token,c.token],id=a.room!.party!.id;a.ws.terminate();b.ws.terminate();c.ws.terminate();await runtime.server.close();runtime=await launch(db);
  a=await player(runtime.url,'Host',tokens[0]);b=await player(runtime.url,'Friend',tokens[1]);c=await player(runtime.url,'Third',tokens[2]);await delay();
  assert.equal(a.room!.party!.id,id);assert.equal(a.room!.party!.questionId,q);assert.equal(a.room!.party!.yourVote,c.room!.you);assert.deepEqual(b.room!.party!.results,{});
  const outsider=await player(runtime.url,'Late friend');await assert.rejects(outsider.send('join',{code:a.room!.code}),/started/i);outsider.ws.terminate();
  await c.send('leave');await delay();assert.equal(a.room!.party!.yourVote,undefined);assert.equal(a.room!.party!.submitted.length,0);
  await a.send('leave');await delay();assert.equal(b.room!.hostId,b.room!.you);assert.equal(b.room!.party!.phase,'finished');await b.send('likely-lobby');await delay();assert.equal(b.room!.party,null);
 }finally{a.ws.terminate();b.ws.terminate();c.ws.terminate();await runtime.server.close();rmSync(dir,{recursive:true,force:true});}
});

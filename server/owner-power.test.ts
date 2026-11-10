import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WebSocket} from 'ws';
import {Store} from './store';
import {tokenHash} from './accounts';
import {bindOwner,transformOwnerCard} from './owner-power';
import {createGameServer} from './game-server';
import {newRound} from '../src/utils/round';
import type {RoomView} from '../src/online/protocol';

const origin='http://test';
const pause=(ms=30)=>new Promise(r=>setTimeout(r,ms));
function seed(store:Store,name:string){
 const id=randomUUID(),token=randomBytes(32).toString('base64url');
 store.db.prepare('INSERT INTO accounts(id,name,name_key,email,salt,password_key,recovery_hash) VALUES(?,?,?,?,?,?,?)').run(id,name,name.toLowerCase(),id+'@example.invalid','salt','key','hash');
 store.db.prepare('INSERT INTO account_sessions VALUES(?,?,?)').run(tokenHash(token),id,Date.now()+600000);
 return {id,token};
}
async function connect(url:string,token:string,dev=false){
 const auth=dev?{ticket:token}:await (await fetch(url+'/auth/ticket',{method:'POST',headers:{origin,cookie:'uno_session_v2='+token},body:'{}'})).json();
 const ws=new WebSocket(url.replace('http','ws'),{origin});await once(ws,'open');
 let room:RoomView|null=null;
 const pending=new Map<string,{resolve:()=>void;reject:(e:Error)=>void}>();
 ws.on('message',bytes=>{const m=JSON.parse(bytes.toString());if(m.type==='room')room=m.room;if(m.type==='reply'){const cb=pending.get(m.id);pending.delete(m.id);if(cb)m.ok?cb.resolve():cb.reject(Error(m.error));}});
 const send=(type:string,payload:unknown={},revision=room?.revision)=>new Promise<void>((resolve,reject)=>{const id=randomUUID();pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,type,payload,revision}));});
 await send('auth',{token:auth.ticket});
 return {ws,send,get room(){return room;}};
}

test('owner binding uses a permanent existing account ID and survives renaming',()=>{
 const store=new Store(':memory:');try{
  assert.equal(bindOwner(store,'TheBaddest'),undefined);
  const owner=seed(store,'TheBaddest');assert.equal(bindOwner(store,'TheBaddest'),owner.id);
  store.db.prepare('UPDATE accounts SET name=?,name_key=? WHERE id=?').run('Renamed','renamed',owner.id);
  seed(store,'TheBaddest');assert.equal(bindOwner(store,'TheBaddest'),owner.id);
  assert.equal(bindOwner(store),undefined);
 }finally{store.close();}
});

test('transformation preserves card identity and round state and rejects unavailable cards',()=>{
 const r=newRound(['owner','friend'].map(id=>({id,name:id,avatar:'',title:'',type:'human' as const,hand:[],hasCalledGlam:false,score:0})));
 const before=structuredClone(r),id=r.players[0].hand[0].id;
 const changed=transformOwnerCard(r,'owner',id);
 assert.deepEqual(r,before);
 assert.deepEqual(changed.players[0].hand[0],{id,color:'wild',value:'wild4',score:50});
 assert.deepEqual({...changed,players:r.players},r);
 assert.deepEqual(changed.players[1],r.players[1]);
 assert.deepEqual(transformOwnerCard(changed,'owner',id),changed);
 for(const cardId of [undefined,{},'missing',r.players[1].hand[0].id])assert.throws(()=>transformOwnerCard(r,'owner',cardId),/your hand/);
 assert.throws(()=>transformOwnerCard(null,'owner',id),/not running/);
 assert.throws(()=>transformOwnerCard({...r,winner:'owner'},'owner',id),/not running/);
});

test('only the verified owner can transform real saved cards; private action survives restart and plays as +4',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'uno-owner-')),path=join(dir,'game.sqlite');
 const store=new Store(path),owner=seed(store,'TheBaddest'),friend=seed(store,'Friend');
 // Even a development token with the same ID is not a verified account session.
 store.saveSession(tokenHash('dev-owner'),{id:owner.id,name:'TheBaddest',avatar:''});store.close();
 const launch=async()=>{const server=createGameServer({databasePath:path,ownerAccountName:'TheBaddest',allowedOrigins:[origin],allowDevAuth:true,turnDurationMs:60000});server.http.listen(0,'127.0.0.1');await once(server.http,'listening');return {server,url:`http://127.0.0.1:${(server.http.address() as any).port}`};};
 let runtime=await launch();let a:Awaited<ReturnType<typeof connect>>|undefined,b:typeof a,dev:typeof a;
 try{
  a=await connect(runtime.url,owner.token);b=await connect(runtime.url,friend.token);
  await a.send('create',{name:'Private table',handSize:7});await b.send('join',{code:a.room!.code});await pause();
  assert.equal(a.room!.canTransformCards,true);assert(!('canTransformCards' in b.room!));
  await assert.rejects(a.send('transform-card',{cardId:'missing'}),/not running/);
  await a.send('ready',{ready:true});await pause();await b.send('ready',{ready:true});await pause();await a.send('start');await pause();
  const card=a.room!.round!.hand[0],other=b.room!.round!.hand[0];
  await assert.rejects(a.send('transform-card',{cardId:card.id}),/dealt/);await pause(3500);
  await assert.rejects(b.send('transform-card',{cardId:other.id,userId:owner.id,canTransformCards:true}),/not available/);
  await assert.rejects(a.send('transform-card',{cardId:other.id}),/your hand/);
  await assert.rejects(a.send('transform-card',{cardId:card.id},a.room!.revision-1),/changed/);
  dev=await connect(runtime.url,'dev-owner',true);await pause();assert(!('canTransformCards' in dev.room!));
  await assert.rejects(dev.send('transform-card',{cardId:card.id}),/not available/);dev.ws.terminate();
  const before=structuredClone(a.room!),opponentHand=structuredClone(b.room!.round!.hand);
  await a.send('transform-card',{cardId:card.id});await pause();
  assert.deepEqual(a.room!.round!.hand[0],{id:card.id,color:'wild',value:'wild4',score:50});
  assert.deepEqual(b.room!.round!.hand,opponentHand);
  assert.deepEqual(a.room!.event,before.event);assert.deepEqual(a.room!.message,before.message);
  assert.equal(a.room!.round!.turnDeadline,before.round!.turnDeadline);assert.equal(a.room!.round!.activeId,before.round!.activeId);
  assert(!JSON.stringify(b.room).includes(card.id));assert.equal(a.room!.round!.hand.length,7);
  // Unlimited conversions, including while another player has the turn.
  await a.send('transform-card',{cardId:a.room!.round!.hand[1].id});await pause();
  a.ws.terminate();b.ws.terminate();await runtime.server.close();
  const db=new Store(path);db.db.prepare('UPDATE accounts SET name=?,name_key=? WHERE id=?').run('New Owner Name','new owner name',owner.id);seed(db,'TheBaddest');db.close();
  runtime=await launch();a=await connect(runtime.url,owner.token);b=await connect(runtime.url,friend.token);await pause();
  assert.equal(a.room!.canTransformCards,true);assert.equal(a.room!.round!.hand[0].value,'wild4');
  await a.send('move',{move:{type:'play',ids:[card.id],color:'blue'}});await pause();
  assert.equal(b.room!.round!.pending,4);assert.equal(b.room!.round!.discard.at(-1)!.id,card.id);assert.equal(b.room!.round!.color,'blue');
  await a.send('transform-card',{cardId:a.room!.round!.hand[2].id});await pause();
  const count=b.room!.round!.hand.length;await b.send('move',{move:{type:'draw'}});await pause();assert.equal(b.room!.round!.hand.length,count+4);
  // Host status does not confer the power.
  await a.send('leave');await pause();assert.equal(b.room!.hostId,friend.id);
  await assert.rejects(b.send('transform-card',{cardId:other.id}),/not available/);
 }finally{a?.ws.terminate();b?.ws.terminate();dev?.ws.terminate();await runtime.server.close();rmSync(dir,{recursive:true,force:true});}
});

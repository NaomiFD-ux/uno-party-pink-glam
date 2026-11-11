import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from './store';
import {tokenHash} from './accounts';
import {assignSanta} from './santa';
import {createGameServer} from './game-server';
import {newRound} from '../src/utils/round';
const origin='http://test';
function seed(store:Store,name:string){const id=randomUUID(),token=randomBytes(32).toString('base64url');store.db.prepare('INSERT INTO accounts(id,name,name_key,email,salt,password_key,recovery_hash) VALUES(?,?,?,?,?,?,?)').run(id,name,name.toLowerCase(),id+'@example.invalid','salt','key','hash');store.db.prepare('INSERT INTO account_sessions VALUES(?,?,?)').run(tokenHash(token),id,Date.now()+600000);return {id,token,name};}
async function launch(path:string){const server=createGameServer({databasePath:path,allowedOrigins:[origin],secureCookies:false});server.http.listen(0,'127.0.0.1');await once(server.http,'listening');return {server,url:`http://127.0.0.1:${(server.http.address() as any).port}`};}
const client=(url:string,token='')=>async(path:string,body?:unknown,method=body===undefined?'GET':'POST',requestOrigin=origin)=>{const response=await fetch(url+path,{method,headers:{origin:requestOrigin,cookie:token?'uno_session_v2='+token:'','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,data:await response.json(),cache:response.headers.get('cache-control')};};

test('Secret Santa always assigns each person exactly once and never to themselves',()=>{
 for(let n=3;n<=50;n++)for(const pick of [()=>0,(max:number)=>max-1,undefined]){
  const ids=Array.from({length:n},(_,i)=>'person-'+i),before=[...ids],assigned=assignSanta(ids,pick);
  assert.deepEqual(ids,before);assert.deepEqual(Object.keys(assigned),ids);
  assert.deepEqual(Object.values(assigned).sort(),[...ids].sort());ids.forEach(id=>assert.notEqual(assigned[id],id));
 }
 for(const ids of [[],['a','b'],['a','a','b'],Array.from({length:51},(_,i)=>String(i))])assert.throws(()=>assignSanta(ids),/3 and 50/);
});

test('separate account invitations, locked draw, private reveal and persistence do not affect an UNO match',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'uno-santa-')),path=join(dir,'game.sqlite'),store=new Store(path);
 const people=['Host','Angel','Friend','Outsider'].map(name=>seed(store,name));
 const round=newRound(people.slice(0,3).map(p=>({...p,avatar:'',title:'',type:'human',hand:[],hasCalledGlam:false,score:0})));
 const room={code:'SAVED1',name:'Keep my UNO match',hostId:people[0].id,revision:1,handSize:7,seats:people.slice(0,3).map(({id,name})=>({id,name,avatar:'',ready:true})),wins:{[people[0].id]:3},round,roundId:randomUUID(),startedAt:Date.now()-10000,lastActivityAt:Date.now(),turnDeadline:Date.now()+60000,message:null,event:null,played:{}};
 store.save(room);store.close();let runtime=await launch(path);
 try{
  let [host,angel,friend,outsider]=people.map(p=>client(runtime.url,p.token));const anon=client(runtime.url);
  assert.equal((await anon('/santa')).status,401);
  assert.equal((await host('/santa',{name:'Bad origin'},'POST','http://evil')).status,403);
  assert.equal((await host('/santa',{name:'',date:'2026-12-25'})).status,400);
  assert.equal((await host('/santa',{name:'Christmas',date:'2026-02-30'})).status,400);
  assert.equal((await host('/santa',[])).status,400);
  let result=await host('/santa',{name:'Christmas with friends',budget:'$30',date:'2026-12-25',ownerId:people[3].id});assert.equal(result.status,200);assert.match(result.cache!,/no-store/);
  let ex=result.data.exchange;const id=ex.id,token=ex.inviteToken;assert.equal(token.length,43);assert.equal(ex.ownerId,people[0].id);assert.equal(ex.members.length,1);
  assert.equal((await host(`/santa/${id}/draw`,{revision:ex.revision})).status,400);
  assert.equal((await angel(`/santa/${id}`)).status,404);assert.equal((await angel('/santa')).data.exchanges.length,0);
  const preview=(await angel('/santa/invite/'+token)).data;assert.equal(preview.count,1);assert.equal(preview.organizer,'Host');assert(!('members' in preview));assert(!('assignments' in preview));
  assert.equal((await anon('/santa/invite/'+token)).status,401);
  assert.equal((await angel('/santa/join',{token:'bad'})).status,404);
  ex=(await angel('/santa/join',{token,userId:people[3].id})).data.exchange;assert(ex.members.some(p=>p.id===people[1].id));assert(!ex.members.some(p=>p.id===people[3].id));assert.equal(ex.inviteToken,token);
  const oldRevision=ex.revision;ex=(await friend('/santa/join',{token})).data.exchange;assert.equal(ex.count,3);
  assert.equal((await angel('/santa/join',{token})).data.exchange.count,3,'joining twice must not duplicate a participant');
  assert.equal((await host(`/santa/${id}/draw`,{revision:oldRevision})).status,409);
  assert.equal((await angel(`/santa/${id}/draw`,{revision:ex.revision})).status,403);
  assert.equal((await angel(`/santa/${id}/remove`,{revision:ex.revision,memberId:people[2].id})).status,403);
  assert.equal((await host(`/santa/${id}/reveal`,{})).status,409);
  ex=(await host(`/santa/${id}/draw`,{revision:ex.revision})).data.exchange;assert.equal(ex.drawn,true);assert(!('recipient' in ex));assert(!('assignments' in ex));assert(!('inviteToken' in ex));
  assert.equal((await host(`/santa/${id}/draw`,{revision:ex.revision})).status,409);
  assert.equal((await angel(`/santa/${id}/leave`,{revision:ex.revision})).status,409);
  assert.equal((await outsider('/santa/join',{token})).status,409);assert.equal((await outsider(`/santa/${id}/reveal`,{})).status,404);
  const recipients:string[]=[];
  for(const [index,request] of [host,angel,friend].entries()){
   const before=(await request(`/santa/${id}`)).data.exchange;assert(!('recipient' in before));
   const revealed=(await request(`/santa/${id}/reveal`,{userId:people[(index+1)%3].id})).data.exchange;
   assert(revealed.recipient);assert.notEqual(revealed.recipient.id,people[index].id);recipients.push(revealed.recipient.id);
   assert(!JSON.stringify(revealed).includes('assignments'));assert(!JSON.stringify(revealed).includes('password'));
  }
  assert.equal(new Set(recipients).size,3);
  const savedRecipient=(await angel(`/santa/${id}`)).data.exchange.recipient;
  await runtime.server.close();runtime=await launch(path);[host,angel,friend,outsider]=people.map(p=>client(runtime.url,p.token));
  assert.deepEqual((await angel(`/santa/${id}`)).data.exchange.recipient,savedRecipient);
  assert.equal((await host('/santa')).data.exchanges.length,1);
  assert.equal((await outsider('/santa')).data.exchanges.length,0);
  assert.equal((await angel('/santa/invite/'+token)).data.exchangeId,id);
  const verify=new Store(path);try{assert.deepEqual(verify.rooms()[0],room);}finally{verify.close();}
 }finally{await runtime.server.close();rmSync(dir,{recursive:true,force:true});}
});

test('participants commit when joining; host removal and revoked sessions are enforced',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'uno-santa-roster-')),path=join(dir,'game.sqlite'),store=new Store(path);
 const people=['Organizer','Second','Third','Fourth'].map(name=>seed(store,name));store.close();const runtime=await launch(path);
 try{
  const [host,second,third,fourth]=people.map(p=>client(runtime.url,p.token));let ex=(await host('/santa',{name:'Roster test'})).data.exchange;const id=ex.id,token=ex.inviteToken;
  assert.equal((await host(`/santa/${id}/leave`,{revision:ex.revision})).status,409);
  ex=(await second('/santa/join',{token})).data.exchange;ex=(await third('/santa/join',{token})).data.exchange;
  const stale=ex.revision;assert.equal((await second(`/santa/${id}/leave`,{revision:ex.revision})).status,409);assert.equal((await host(`/santa/${id}/remove`,{revision:ex.revision,memberId:people[1].id})).status,200);
  assert.equal((await host(`/santa/${id}/draw`,{revision:stale})).status,409);
  assert.equal((await second(`/santa/${id}`)).status,404);
  ex=(await host(`/santa/${id}`)).data.exchange;ex=(await host(`/santa/${id}/remove`,{revision:ex.revision,memberId:people[2].id})).data.exchange;assert.equal(ex.count,1);
  await second('/santa/join',{token});ex=(await fourth('/santa/join',{token})).data.exchange;
  assert.equal((await host(`/santa/${id}/draw`,{revision:ex.revision})).status,200);
  assert.equal((await second('/auth/logout',{})).status,200);
  assert.equal((await second(`/santa/${id}/reveal`,{})).status,401);
 }finally{await runtime.server.close();rmSync(dir,{recursive:true,force:true});}
});

test('wishlists stay private to their author and assigned giver, including edits after drawing',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'uno-santa-wishes-')),path=join(dir,'game.sqlite'),store=new Store(path);
 const people=['Host','Second','Third'].map(name=>seed(store,name));store.close();let runtime=await launch(path);
 try{
  let clients=people.map(p=>client(runtime.url,p.token));let ex=(await clients[0]('/santa',{name:'Wishlists'})).data.exchange;const id=ex.id,token=ex.inviteToken;
  await clients[1]('/santa/join',{token});ex=(await clients[2]('/santa/join',{token})).data.exchange;
  const wishes=Object.fromEntries(people.map((p,i)=>[p.id,`Only my giver may see gift idea ${i}`]));
  for(const [i,request] of clients.entries()){
   const saved=(await request(`/santa/${id}/wishlist`,{text:wishes[people[i].id],userId:people[(i+1)%3].id})).data.exchange;
   assert.equal(saved.yourWishlist,wishes[people[i].id]);assert.equal(saved.revision,ex.revision);assert(!('wishes' in saved));
  }
  const preview=JSON.stringify((await clients[1]('/santa/invite/'+token)).data);Object.values(wishes).forEach(w=>assert(!preview.includes(w)));
  assert.equal((await clients[0](`/santa/${id}/wishlist`,{text:'x'.repeat(601)})).status,400);
  ex=(await clients[0](`/santa/${id}/draw`,{revision:ex.revision})).data.exchange;
  for(const [i,request] of clients.entries()){
   const before=(await request(`/santa/${id}`)).data.exchange;assert(!before.recipient);assert.equal(before.yourWishlist,wishes[people[i].id]);
   const revealed=(await request(`/santa/${id}/reveal`,{})).data.exchange;
   assert.equal(revealed.recipient.wishlist,wishes[revealed.recipient.id]);
   for(const p of people)if(p.id!==people[i].id&&p.id!==revealed.recipient.id)assert(!JSON.stringify(revealed).includes(wishes[p.id]));
  }
  await clients[1](`/santa/${id}/wishlist`,{text:'Updated after the draw'});
  for(const request of clients){const own=(await request(`/santa/${id}`)).data.exchange;if(own.recipient.id===people[1].id)assert.equal(own.recipient.wishlist,'Updated after the draw');}
  await runtime.server.close();runtime=await launch(path);clients=people.map(p=>client(runtime.url,p.token));
  assert.equal((await clients[1](`/santa/${id}`)).data.exchange.yourWishlist,'Updated after the draw');
 }finally{await runtime.server.close();rmSync(dir,{recursive:true,force:true});}
});

test('multiple groups, shared member invites, settings, and isolated private product lists',async()=>{
 const {createServer}=await import('node:http'),{createSanta}=await import('./santa');
 const dir=mkdtempSync(join(tmpdir(),'uno-santa-items-')),path=join(dir,'game.sqlite'),store=new Store(path);
 const people=['Host','Second','Third','Other'].map(name=>seed(store,name));
 const santa=createSanta(store,{session:(req:any)=>{const person=people.find(p=>req.headers.cookie==='uno_session_v2='+p.token);return person?{user:{id:person.id}}:null;}} as any,[origin],async url=>({product:{url,title:'Pink gift',price:'25',currency:'USD',image:'https://images.example/pink.jpg',store:'Gift Store'}}));
 const http=createServer((req,res)=>void santa.route(req,res));http.listen(0,'127.0.0.1');await once(http,'listening');const url=`http://127.0.0.1:${(http.address() as any).port}`;
 try{
  const [host,second,third,other]=people.map(p=>client(url,p.token));
  let a=(await host('/santa',{name:'Family',wishlistEnabled:true,remindersEnabled:false})).data.exchange;
  const b=(await other('/santa',{name:'Friends'})).data.exchange;
  a=(await second('/santa/join',{token:a.inviteToken})).data.exchange;assert(a.inviteToken,'members can share the invite');
  a=(await third('/santa/join',{token:a.inviteToken})).data.exchange;
  await second('/santa/join',{token:b.inviteToken});assert.equal((await second('/santa')).data.exchanges.length,2);
  assert.equal((await other(`/santa/${a.id}/preview-item`,{url:'https://store.example/pink'})).status,404);
  const draft=(await second(`/santa/${a.id}/preview-item`,{url:'https://store.example/pink'})).data;
  assert.equal((await third(`/santa/${a.id}/wishlist`,{operation:'add',previewId:draft.previewId})).status,409);
  assert.equal((await second(`/santa/${b.id}/wishlist`,{operation:'add',previewId:draft.previewId})).status,409);
  const saved=(await second(`/santa/${a.id}/wishlist`,{operation:'add',previewId:draft.previewId,note:'Size small',title:'Spoofed',userId:people[2].id})).data.exchange;
  assert.equal(saved.yourItems.length,1);assert.equal(saved.yourItems[0].title,'Pink gift');assert.equal(saved.yourItems[0].note,'Size small');
  assert.equal((await second(`/santa/${a.id}/wishlist`,{operation:'add',previewId:draft.previewId})).status,409,'preview cannot be reused');
  const manualPath=`/santa/${b.id}/wishlist`;
  assert.equal((await other(manualPath,{operation:'add-manual',url:'javascript:alert(1)',details:{title:'Bad link'}})).status,400);
  const manual=(await other(manualPath,{operation:'add-manual',details:{title:'Cozy blanket',price:'25.00',variant:'Pink'},note:'Machine washable'})).data.exchange.yourItems[0];
  assert.deepEqual({title:manual.title,url:manual.url,price:manual.price,currency:manual.currency,variant:manual.variant},{title:'Cozy blanket',url:'',price:'25.00',currency:'USD',variant:'Pink'});
  const partial=(await other(`/santa/${b.id}/preview-item`,{url:'https://store.example/pink'})).data;
  const edited=(await other(manualPath,{operation:'add',previewId:partial.previewId,details:{title:'Custom title',price:'30'}})).data.exchange.yourItems[1];
  assert.equal(edited.title,'Custom title');
  assert.equal(edited.price,'30');
  assert.equal(edited.image,'https://images.example/pink.jpg');
  assert.equal((await second(`/santa/${b.id}`)).data.exchange.yourItems.length,0,'per-group wishlist isolation');
  const hostView=(await host(`/santa/${a.id}`)).data.exchange;assert.equal(hostView.yourItems.length,0);assert(hostView.members.find((p:any)=>p.id===people[1].id).wishlistUpdated);assert(!JSON.stringify(hostView).includes('Pink gift'));
  assert.equal((await third(`/santa/${a.id}/wishlist`,{operation:'delete',itemId:saved.yourItems[0].id})).status,404);
  assert.equal((await third(`/santa/${a.id}/settings`,{revision:a.revision,wishlistEnabled:false})).status,403);
  a=(await host(`/santa/${a.id}/settings`,{revision:a.revision,wishlistEnabled:false,remindersEnabled:true})).data.exchange;
  assert.equal((await second(`/santa/${a.id}/preview-item`,{url:'https://store.example/pink'})).status,409);
  a=(await host(`/santa/${a.id}/settings`,{revision:a.revision,wishlistEnabled:true,remindersEnabled:true})).data.exchange;
  a=(await host(`/santa/${a.id}/draw`,{revision:a.revision})).data.exchange;assert.equal(a.drawn,true,'host may draw with empty wishlists');
  assert.equal((await host(`/santa/${a.id}/settings`,{revision:a.revision})).status,409);
  let giver:any;
  for(const request of [host,second,third]){const reveal=(await request(`/santa/${a.id}/reveal`,{})).data.exchange;if(reveal.recipient.id===people[1].id){assert.equal(reveal.recipient.items.length,1);giver=request;}else assert.equal(reveal.recipient.items.length,0);}
  await second(`/santa/${a.id}/wishlist`,{operation:'note',itemId:saved.yourItems[0].id,note:'Updated hint'});
  assert.equal((await giver(`/santa/${a.id}`)).data.exchange.recipient.items[0].note,'Updated hint');
  const giftId=saved.yourItems[0].id;
  const purchasePath=`/santa/${a.id}/purchase`;
  assert.equal((await second(purchasePath,{itemIds:[giftId],purchased:true})).status,404);
  assert.equal((await giver(purchasePath,{itemIds:[giftId],purchased:true})).status,200);
  assert.deepEqual((await giver(`/santa/${a.id}`)).data.exchange.recipient.purchasedIds,[giftId]);
  assert.deepEqual((await second(`/santa/${a.id}`)).data.exchange.recipient.purchasedIds,[]);
  assert.equal((await giver(purchasePath,{itemIds:[giftId],purchased:false})).status,200);
  assert.deepEqual((await giver(`/santa/${a.id}`)).data.exchange.recipient.purchasedIds,[]);
  const persisted=JSON.parse((store.db.prepare('SELECT body FROM gift_exchanges WHERE id=?').get(a.id) as any).body);assert.equal(persisted.items[people[1].id][0].note,'Updated hint');
  await second(`/santa/${a.id}/wishlist`,{operation:'delete',itemId:saved.yourItems[0].id});assert.equal((await giver(`/santa/${a.id}`)).data.exchange.recipient.items.length,0);
 }finally{await new Promise<void>(resolve=>http.close(()=>resolve()));store.close();rmSync(dir,{recursive:true,force:true});}
});

test('group covers are host-owned, member-only and persistent; completion is reversible without changing assignments',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'uno-santa-covers-')),path=join(dir,'game.sqlite'),store=new Store(path);
 const people=['Host','Second','Third','Outside'].map(name=>seed(store,name));store.close();let runtime=await launch(path);
 try{
  let [host,second,third,outside]=people.map(p=>client(runtime.url,p.token));let ex=(await host('/santa',{name:'Covers'})).data.exchange;const id=ex.id,token=ex.inviteToken;
  const fallback=ex.cover;assert.match(fallback,/santa-cover-[0-2]\.webp$/);assert.equal(ex.completed,false);assert.equal(ex.yourWishlistUpdated,false);
  await second('/santa/join',{token});ex=(await third('/santa/join',{token})).data.exchange;
  assert.equal((await host(`/santa/${id}/complete`,{revision:ex.revision,completed:true})).status,409);
  const image='data:image/jpeg;base64,/9j/2Q==';
  assert.equal((await second(`/santa/${id}/cover`,{image})).status,403);
  assert.equal((await outside(`/santa/${id}/cover`,{image})).status,404);
  for(const bad of ['https://images.example/picture.jpg','data:image/svg+xml;base64,PHN2Zz4=','data:image/jpeg;base64,bm90YWpwZw==','data:image/jpeg;base64,'+'A'.repeat(140000)])assert.equal((await host(`/santa/${id}/cover`,{image:bad})).status,400);
  ex=(await host(`/santa/${id}/cover`,{image})).data.exchange;assert.match(ex.cover,/\/api\/game\/santa\/.*\/cover\?v=/);
  const getCover=async(token:string)=>fetch(runtime.url+`/santa/${id}/cover`,{headers:{cookie:token?'uno_session_v2='+token:''}});
  assert.equal((await getCover('')).status,401);assert.equal((await getCover(people[3].token)).status,404);
  const picture=await getCover(people[1].token);assert.equal(picture.status,200);assert.equal(picture.headers.get('content-type'),'image/jpeg');assert.match(picture.headers.get('cache-control')!,/no-store/);assert.deepEqual(Buffer.from(await picture.arrayBuffer()),Buffer.from('/9j/2Q==','base64'));
  const coverURL=ex.cover;await runtime.server.close();runtime=await launch(path);[host,second,third,outside]=people.map(p=>client(runtime.url,p.token));assert.equal((await host(`/santa/${id}`)).data.exchange.cover,coverURL);
  ex=(await host(`/santa/${id}/draw`,{revision:ex.revision})).data.exchange;
  const before=(await second(`/santa/${id}/reveal`,{})).data.exchange.recipient;await second(`/santa/${id}/reveal-viewed`,{});const hostView=(await host('/santa')).data.exchanges[0];assert(!hostView.recipientName,'another person revealing does not reveal the host assignment');assert.equal((await second('/santa')).data.exchanges[0].recipientName,before.name);
  assert.equal((await second(`/santa/${id}/complete`,{revision:ex.revision,completed:true})).status,403);
  ex=(await host(`/santa/${id}/complete`,{revision:ex.revision,completed:true})).data.exchange;assert.equal(ex.completed,true);assert.equal((await second('/santa')).data.exchanges[0].completed,true);
  assert.deepEqual((await second(`/santa/${id}`)).data.exchange.recipient,before);
  ex=(await host(`/santa/${id}/complete`,{revision:ex.revision,completed:false})).data.exchange;assert.equal(ex.completed,false);
  ex=(await host(`/santa/${id}/cover`,{image:''})).data.exchange;assert.equal(ex.cover,fallback);assert.equal((await getCover(people[1].token)).status,404);
 }finally{await runtime.server.close();rmSync(dir,{recursive:true,force:true});}
});

test('names-ready prompt is member-specific until their private reveal is acknowledged and persists across restarts',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'uno-santa-viewed-')),path=join(dir,'game.sqlite'),store=new Store(path);const people=['Host','Second','Third','Outside'].map(name=>seed(store,name));store.close();let runtime=await launch(path);
 try{
  let [host,second,third,outside]=people.map(p=>client(runtime.url,p.token));let ex=(await host('/santa',{name:'Private reveal progress'})).data.exchange;const id=ex.id,token=ex.inviteToken;
  await second('/santa/join',{token});ex=(await third('/santa/join',{token})).data.exchange;
  assert.equal((await host(`/santa/${id}/reveal-viewed`,{})).status,409);
  ex=(await host(`/santa/${id}/draw`,{revision:ex.revision})).data.exchange;
  assert.equal(ex.revealViewed,false);assert(!ex.recipientName);assert(!ex.recipient);
  const first=(await host(`/santa/${id}/reveal`,{})).data.exchange;assert(first.recipient);assert.equal(first.revealViewed,false);assert(!first.recipientName,'opening early does not dismiss names-ready');
  await runtime.server.close();runtime=await launch(path);[host,second,third,outside]=people.map(p=>client(runtime.url,p.token));
  assert.equal((await host(`/santa/${id}`)).data.exchange.revealViewed,false);
  assert.equal((await second(`/santa/${id}/reveal-viewed`,{userId:people[0].id})).status,409);
  assert.equal((await outside(`/santa/${id}/reveal-viewed`,{})).status,404);
  const seen=(await host(`/santa/${id}/reveal-viewed`,{userId:people[1].id})).data.exchange;assert.equal(seen.revealViewed,true);assert.equal(seen.recipientName,first.recipient.name);assert.deepEqual(seen.recipient,first.recipient);
  assert.equal((await second(`/santa/${id}`)).data.exchange.revealViewed,false);assert.equal((await third(`/santa/${id}`)).data.exchange.revealViewed,false);
  assert.equal((await host(`/santa/${id}/reveal-viewed`,{})).data.exchange.revision,seen.revision,'acknowledgement is idempotent and does not change the roster');
  await runtime.server.close();runtime=await launch(path);[host,second,third,outside]=people.map(p=>client(runtime.url,p.token));
  assert.equal((await host('/santa')).data.exchanges[0].revealViewed,true);assert.equal((await second('/santa')).data.exchanges[0].revealViewed,false);
  assert.deepEqual((await host(`/santa/${id}`)).data.exchange.recipient,first.recipient);
 }finally{await runtime.server.close();rmSync(dir,{recursive:true,force:true});}
});

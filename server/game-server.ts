import {createServer} from 'node:http';
import {randomBytes,randomInt,createHash,randomUUID} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {createAccounts} from './accounts';
import {Store} from './store';
import {newRound,moveRound,mustTakeDrawStack,type Round,type Move} from '../src/utils/round';
import type {RoomView,RoomMessage} from '../src/online/protocol';

type User={id:string;name:string;avatar:string};
type Room={code:string;name:string;hostId:string;revision:number;handSize:number;seats:(User&{ready:boolean})[];wins:Record<string,number>;round:Round|null;roundId:string;startedAt:number;message:RoomMessage|null;event:RoomView['event'];played:Record<string,number>};
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const validText=(x:unknown,max:number)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
function avatar(x:unknown){return typeof x==='string'&&x.length<=150000&&(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(x)||/^https:\/\//.test(x))?x:'';}
export function createGameServer(options:{databasePath:string;allowDevAuth?:boolean;allowedOrigins:string[];secureCookies?:boolean}){
 if(process.env.NODE_ENV==='production'&&options.allowDevAuth)throw new Error('Development sign-in cannot run in production.');
 const store=new Store(options.databasePath),rooms=new Map<string,Room>(store.rooms().map((r:Room)=>[r.code,r]));
 const users=new Map<WebSocket,User>(),members=new Map<WebSocket,string>(),timers=new Map<string,ReturnType<typeof setTimeout>>();
 const accountSessions=new Map<WebSocket,string>();
 const send=(ws:WebSocket,x:unknown)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(x));};
 const online=(id:string)=>[...users.values()].some(u=>u.id===id);
 function view(r:Room,id:string):RoomView{const seats=r.seats.map(s=>({...s,connected:online(s.id)}));return {code:r.code,name:r.name,hostId:r.hostId,you:id,revision:r.revision,handSize:r.handSize,seats,wins:r.wins,message:r.message,event:r.event,round:r.round?{id:r.roundId,players:r.round.players.map(p=>({...seats.find(s=>s.id===p.id)!,count:p.hand.length,uno:p.hasCalledGlam})),hand:r.round.players.find(p=>p.id===id)?.hand||[],discard:r.round.discard.slice(-2),color:r.round.color,direction:r.round.direction,activeId:r.round.players[r.round.active].id,pending:r.round.pending,pendingType:r.round.pendingType,winner:r.round.winner,turns:r.round.turns,drawnCardId:r.round.players[r.round.active].id===id?r.round.drawnCardId||null:null,startedAt:r.startedAt}:null};}
 function broadcast(r:Room){for(const [ws,code]of members)if(code===r.code){const u=users.get(ws);if(u)send(ws,{type:'room',room:view(r,u.id)});}}
 function commit(r:Room,result?:any){r.revision++;if(result)store.saveResult(r,r.roundId,result);else store.save(r);broadcast(r);}
 const accounts=createAccounts(store,{secure:options.secureCookies??process.env.NODE_ENV==='production',origins:options.allowedOrigins,onLogout:(id,sessionHash)=>{for(const [ws,u]of users)if(u.id===id&&(!sessionHash||accountSessions.get(ws)===sessionHash))ws.close(1008,'Please sign in again.');},onProfile:user=>{for(const [ws,u]of users)if(u.id===user.id)users.set(ws,user);for(const r of rooms.values()){const seat=r.seats.find(s=>s.id===user.id);if(seat){Object.assign(seat,user);const p=r.round?.players.find(p=>p.id===user.id);if(p)Object.assign(p,{name:user.name,avatar:user.avatar});commit(r);}}}});
 function apply(r:Room,actorId:string,move:Move){const before=r.round!,next=moveRound(before,move);if(next===before)throw new Error('That move is not available.');r.round=next;const count=next.players[before.active].hand.length-before.players[before.active].hand.length;r.event={id:randomUUID(),actorId,kind:move.type,count:Math.max(0,count),value:move.type==='play'?next.discard.at(-1)!.value:undefined};if(move.type==='play')r.played[actorId]=(r.played[actorId]||0)+move.ids.length;let result:any;if(next.winner){r.wins[next.winner]=(r.wins[next.winner]||0)+1;result={id:r.roundId,room_code:r.code,table_name:r.name,winner_id:next.winner,finished_at:new Date().toISOString(),players:r.seats.map(p=>({user_id:p.id,cards_played:r.played[p.id]||0,turns:next.turns}))};}commit(r,result);if(result)for(const [ws,user]of users)if(result.players.some((p:any)=>p.user_id===user.id))send(ws,{type:'profile-updated'});schedule(r);}
 function schedule(r:Room){clearTimeout(timers.get(r.code));timers.delete(r.code);if(!r.round||!mustTakeDrawStack(r.round))return;timers.set(r.code,setTimeout(()=>{timers.delete(r.code);apply(r,r.round!.players[r.round!.active].id,{type:'draw'});},450));}
 const http=createServer(async(req,res)=>{
  const origin=req.headers.origin;if(origin&&options.allowedOrigins.includes(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
  if(req.method==='OPTIONS'){res.writeHead(origin&&options.allowedOrigins.includes(origin)?204:403);res.end();return;}
  if(req.url==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,auth:'server-accounts'}));return;}
  if(await accounts.route(req,res))return;
  if(req.url!=='/dev/session'||req.method!=='POST'||!options.allowDevAuth||!origin||!options.allowedOrigins.includes(origin)){res.writeHead(404);res.end();return;}
  let text='';try{for await(const chunk of req){text+=chunk;if(text.length>160000)throw Error();}const input=JSON.parse(text);if(!validText(input.name,24))throw Error();const token=randomBytes(32).toString('base64url'),user={id:randomUUID(),name:input.name.trim(),avatar:avatar(input.avatar)};store.saveSession(hash(token),user);res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({token,user}));}catch{res.writeHead(400);res.end();}
 });
 const wss=new WebSocketServer({server:http,maxPayload:16384,verifyClient:(info:{origin:string})=>options.allowedOrigins.includes(info.origin)});
 wss.on('connection',ws=>{
  (ws as WebSocket&{alive?:boolean}).alive=true;ws.on('pong',()=>{(ws as WebSocket&{alive?:boolean}).alive=true;});
  let count=0,last=Date.now(),working=false;const deadline=setTimeout(()=>ws.close(1008,'Sign in first'),10000);
  ws.on('message',async bytes=>{let input:any;try{
   if(Date.now()-last>1000){count=0;last=Date.now();}if(++count>30)throw Error('Please slow down.');if(working)throw Error('Please wait for the previous request.');working=true;
   input=JSON.parse(bytes.toString());if(!validText(input.id,80))throw Error('Invalid request.');
   let user=users.get(ws);
   if(input.type==='auth'){
    if(user)throw Error('Already signed in.');const token=input.payload?.token;if(!validText(token,12000))throw Error('Please sign in.');
    const ticket=accounts.consume(token);if(ticket){user=ticket.user;accountSessions.set(ws,ticket.hash);}else if(options.allowDevAuth)user=store.session(hash(token));
    if(!user)throw Error('Please sign in again.');users.set(ws,user);clearTimeout(deadline);
    const room=[...rooms.values()].find(r=>r.seats.some(s=>s.id===user!.id));if(room){members.set(ws,room.code);broadcast(room);}send(ws,{type:'reply',id:input.id,ok:true});return;
   }
   if(!user)throw Error('Please sign in.');if(accountSessions.has(ws)&&!accounts.lookup(accountSessions.get(ws)!)){ws.close(1008,'Please sign in again.');throw Error('Please sign in again.');}const p=input.payload||{};
   if(input.type==='create'){
    if([...rooms.values()].some(r=>r.seats.some(s=>s.id===user!.id)))throw Error('Leave your current room first.');
    if(!validText(p.name,40)||![5,7,9].includes(p.handSize))throw Error('Check the room settings.');
    let code='';do{code=Array.from({length:6},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');}while(rooms.has(code));
    const room:Room={code,name:p.name.trim(),hostId:user.id,handSize:p.handSize,revision:0,seats:[{...user,ready:false}],wins:{},round:null,roundId:'',startedAt:0,message:null,event:null,played:{}};rooms.set(code,room);members.set(ws,code);commit(room);
   }else if(input.type==='join'){
    if(typeof p.code!=='string'||!/^[A-Z0-9]{6}$/.test(p.code))throw Error('Enter a six-character code.');const r=rooms.get(p.code);if(!r)throw Error('That room code was not found.');
    if([...rooms.values()].some(o=>o.code!==r.code&&o.seats.some(s=>s.id===user!.id)))throw Error('Leave your current room first.');
    if(!r.seats.some(s=>s.id===user!.id)){if(r.round)throw Error('This round has started. Ask the host to return to the waiting room.');if(r.seats.length>=10)throw Error('This room is full.');r.seats.push({...user,ready:false});}members.set(ws,r.code);commit(r);
   }else{
    const r=rooms.get(members.get(ws)||'');if(!r||!r.seats.some(s=>s.id===user!.id))throw Error('Join a room first.');
    if(input.type==='message'){
     if(!validText(p.text,120)||!['normal','slam','echo'].includes(p.effect))throw Error('Check your message.');r.message={id:randomUUID(),senderId:user.id,text:p.text.trim(),effect:p.effect,at:Date.now()};store.save(r);broadcast(r);
    }else{
     if(input.revision!==r.revision)throw Error('The table changed. Try again.');
     if(input.type==='ready'){if(r.round)throw Error('The round has already started.');if(typeof p.ready!=='boolean')throw Error('Invalid ready status.');r.seats.find(s=>s.id===user!.id)!.ready=p.ready;commit(r);}
     else if(input.type==='start'){
      if(r.hostId!==user.id)throw Error('Only the host can deal.');if(r.round&&!r.round.winner)throw Error('Finish the current round first.');if(r.seats.length<2||r.seats.some(s=>!s.ready||!online(s.id)))throw Error('At least two connected, ready players are needed.');
      r.round=newRound(r.seats.map(s=>({...s,title:'',type:'human',hand:[],hasCalledGlam:false,score:0})),r.handSize);r.roundId=randomUUID();r.startedAt=Date.now();r.played={};r.event={id:randomUUID(),actorId:user.id,kind:'start'};r.message=null;commit(r);
     }else if(input.type==='move'){
      if(!r.round||r.round.winner||r.round.players[r.round.active].id!==user.id)throw Error('Wait for your turn.');if(Date.now()<r.startedAt+3500)throw Error('The cards are still being dealt.');
      const m=p.move;if(!m||!['play','draw','skip'].includes(m.type))throw Error('Invalid move.');
      if(m.type==='play'&&(!Array.isArray(m.ids)||m.ids.length>108||m.ids.some((id:unknown)=>typeof id!=='string')||(m.color!==undefined&&!['red','blue','green','yellow'].includes(m.color))))throw Error('Invalid cards or color.');
      apply(r,user.id,m);
     }else if(input.type==='leave'){
      if(r.round&&!r.round.winner)throw Error('Your seat is saved during this round. You can close the page and return.');
      r.seats=r.seats.filter(s=>s.id!==user!.id);if(r.hostId===user.id)r.hostId=r.seats[0]?.id||'';r.round=null;clearTimeout(timers.get(r.code));for(const [socket,id]of users)if(id.id===user.id){members.delete(socket);send(socket,{type:'room',room:null});}commit(r);
     }else throw Error('Unknown request.');
    }
   }
   send(ws,{type:'reply',id:input.id,ok:true});
  }catch(e){send(ws,{type:'reply',id:input?.id,ok:false,error:e instanceof Error?e.message:'Could not complete that action.'});}finally{working=false;}});
  ws.on('close',()=>{clearTimeout(deadline);const code=members.get(ws);users.delete(ws);members.delete(ws);accountSessions.delete(ws);const r=rooms.get(code||'');if(r)broadcast(r);});
 });
 for(const r of rooms.values())schedule(r);
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(accountSessions.has(ws)&&!accounts.lookup(accountSessions.get(ws)!)){ws.close(1008,'Please sign in again.');continue;}const live=ws as WebSocket&{alive?:boolean};if(live.alive===false){ws.terminate();continue;}live.alive=false;ws.ping();}},20000);heartbeat.unref();
 return {http,wss,async close(){accounts.close();clearInterval(heartbeat);for(const t of timers.values())clearTimeout(t);for(const ws of wss.clients)ws.terminate();await new Promise<void>(resolve=>wss.close(()=>resolve()));await new Promise<void>(resolve=>http.close(()=>resolve()));store.close();}};
}

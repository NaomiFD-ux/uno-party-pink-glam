import {createServer} from 'node:http';
import {randomBytes,randomInt,createHash,randomUUID} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {createAccounts} from './accounts';
import {Store} from './store';
import {newRound,moveRound,mustTakeDrawStack,leaveRound,automaticMove,type Round,type Move} from '../src/utils/round';
import type {RoomView,RoomMessage,WinningPlay,ChatMessage} from '../src/online/protocol';

type User={id:string;name:string;avatar:string};
type Room={code:string;name:string;hostId:string;revision:number;handSize:number;seats:(User&{ready:boolean})[];wins:Record<string,number>;round:Round|null;roundId:string;startedAt:number;turnDeadline?:number;winningPlay?:WinningPlay;lastWinnerId?:string;message:RoomMessage|null;messages?:ChatMessage[];event:RoomView['event'];played:Record<string,number>};
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const validText=(x:unknown,max:number)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
function avatar(x:unknown){return typeof x==='string'&&x.length<=150000&&(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(x)||/^https:\/\//.test(x))?x:'';}
export function createGameServer(options:{databasePath:string;allowDevAuth?:boolean;allowedOrigins:string[];secureCookies?:boolean;turnDurationMs?:number}){
 if(process.env.NODE_ENV==='production'&&options.allowDevAuth)throw new Error('Development sign-in cannot run in production.');
 const store=new Store(options.databasePath),rooms=new Map<string,Room>(store.rooms().map((r:Room)=>[r.code,r]));
 const users=new Map<WebSocket,User>(),members=new Map<WebSocket,string>(),timers=new Map<string,ReturnType<typeof setTimeout>>();
 const turnDuration=options.turnDurationMs??15000;
 const accountSessions=new Map<WebSocket,string>();
 const send=(ws:WebSocket,x:unknown)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(x));};
 const online=(id:string)=>[...users.values()].some(u=>u.id===id);
 function view(r:Room,id:string):RoomView{const seats=r.seats.map(s=>({...s,connected:online(s.id)}));return {code:r.code,name:r.name,hostId:r.hostId,you:id,revision:r.revision,handSize:r.handSize,seats,wins:r.wins,message:r.message,messages:r.messages||(r.message?[{...r.message,senderName:r.seats.find(p=>p.id===r.message!.senderId)?.name||'Player'}]:[]),event:r.event,round:r.round?{id:r.roundId,players:r.round.players.map(p=>({...seats.find(s=>s.id===p.id)!,count:p.hand.length,uno:p.hasCalledGlam})),hand:r.round.players.find(p=>p.id===id)?.hand||[],discard:r.round.discard.slice(-2),color:r.round.color,direction:r.round.direction,activeId:r.round.players[r.round.active].id,pending:r.round.pending,pendingType:r.round.pendingType,winner:r.round.winner,turns:r.round.turns,drawnCardId:r.round.players[r.round.active].id===id?r.round.drawnCardId||null:null,startedAt:r.startedAt,turnDeadline:r.turnDeadline,winningPlay:r.winningPlay}:null};}
 function broadcast(r:Room){for(const [ws,code]of members)if(code===r.code){const u=users.get(ws);if(u)send(ws,{type:'room',room:view(r,u.id)});}}
 function commit(r:Room,result?:any){r.revision++;if(result)store.saveResult(r,r.roundId,result);else store.save(r);broadcast(r);}
 const accounts=createAccounts(store,{secure:options.secureCookies??process.env.NODE_ENV==='production',origins:options.allowedOrigins,onLogout:(id,sessionHash)=>{for(const [ws,u]of users)if(u.id===id&&(!sessionHash||accountSessions.get(ws)===sessionHash))ws.close(1008,'Please sign in again.');},onProfile:user=>{for(const [ws,u]of users)if(u.id===user.id)users.set(ws,user);for(const r of rooms.values()){const seat=r.seats.find(s=>s.id===user.id);if(seat){Object.assign(seat,user);const p=r.round?.players.find(p=>p.id===user.id);if(p)Object.assign(p,{name:user.name,avatar:user.avatar});commit(r);}}}});
 function apply(r:Room,actorId:string,move:Move){const before=r.round!,next=moveRound(before,move);if(next===before)throw new Error('That move is not available.');r.round=next;if(next.turns!==before.turns||next.active!==before.active)r.turnDeadline=Date.now()+turnDuration;const count=next.players[before.active].hand.length-before.players[before.active].hand.length;r.event={id:randomUUID(),actorId,kind:move.type,count:Math.max(0,count),value:move.type==='play'?next.discard.at(-1)!.value:undefined};if(move.type==='play')r.played[actorId]=(r.played[actorId]||0)+move.ids.length;let result:any;if(next.winner){r.lastWinnerId=next.winner;if(move.type==='play')r.winningPlay={actorId,name:before.players[before.active].name,cards:move.ids.map(id=>before.players[before.active].hand.find(card=>card.id===id)!),color:next.color,at:Date.now()};r.wins[next.winner]=(r.wins[next.winner]||0)+1;result={id:r.roundId,room_code:r.code,table_name:r.name,winner_id:next.winner,finished_at:new Date().toISOString(),players:r.seats.map(p=>({user_id:p.id,cards_played:r.played[p.id]||0,turns:next.turns}))};}commit(r,result);if(result)for(const [ws,user]of users)if(result.players.some((p:any)=>p.user_id===user.id))send(ws,{type:'profile-updated'});schedule(r);}
 function schedule(r:Room){
  clearTimeout(timers.get(r.code));timers.delete(r.code);if(!r.round||r.round.winner)return;
  if(!r.turnDeadline){r.turnDeadline=Math.max(Date.now(),r.startedAt+3500)+turnDuration;store.save(r);}
  const forced=mustTakeDrawStack(r.round),wait=forced?450:Math.max(0,r.turnDeadline-Date.now());
  timers.set(r.code,setTimeout(()=>{timers.delete(r.code);if(!r.round||r.round.winner)return;apply(r,r.round.players[r.round.active].id,forced?{type:'draw'}:automaticMove(r.round));},wait));
 }
 const http=createServer(async(req,res)=>{
  const origin=req.headers.origin;if(origin&&options.allowedOrigins.includes(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
  if(req.method==='OPTIONS'){res.writeHead(origin&&options.allowedOrigins.includes(origin)?204:403);res.end();return;}
  if(req.url==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,auth:'server-accounts'}));return;}
  if(await accounts.route(req,res))return;
  const path=req.url?.split('?')[0]||'';
  const voicePath=path.match(/^\/voice\/([a-f0-9-]{36})$/);
  if(voicePath){
   const clip=store.db.prepare('SELECT code,mime,audio FROM voice_messages WHERE id=?').get(voicePath[1]) as {code:string;mime:string;audio:Uint8Array}|undefined;
   const current=accounts.session(req);
   if(req.method!=='GET'||!current||!clip||!rooms.get(clip.code)?.seats.some(s=>s.id===current.user.id)){res.writeHead(404);res.end();return;}
   res.setHeader('Content-Type',clip.mime);res.setHeader('Accept-Ranges','bytes');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
   const audio=Buffer.from(clip.audio),range=req.headers.range;
   if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);let start=match?.[1]?Number(match[1]):0,end=match?.[2]?Number(match[2]):audio.length-1;if(match&&!match[1]&&match[2]){start=Math.max(0,audio.length-Number(match[2]));end=audio.length-1;}end=Math.min(end,audio.length-1);if(!match||(!match[1]&&!match[2])||start>end||start>=audio.length){res.writeHead(416,{'Content-Range':`bytes */${audio.length}`});res.end();return;}res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${audio.length}`);res.setHeader('Content-Length',end-start+1);res.end(audio.subarray(start,end+1));return;}
   res.setHeader('Content-Length',audio.length);res.end(audio);return;
  }
  const createInvite=path.match(/^\/rooms\/([A-Z0-9]{6})\/invite$/);
  const readInvite=path.match(/^\/invites\/([A-Za-z0-9_-]{43})$/);
  if(createInvite||readInvite){
   res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
   const fail=(status:number,error:string)=>{res.statusCode=status;res.end(JSON.stringify({error}));};
   if(createInvite){
    if(req.method!=='POST'){fail(405,'Use the Copy Link button to create an invitation.');return;}
    if(!origin||!options.allowedOrigins.includes(origin)){fail(403,'This request is not allowed.');return;}
    const current=accounts.session(req);if(!current){fail(401,'Log in to invite your friends.');return;}
    const room=rooms.get(createInvite[1]);if(!room?.seats.some(p=>p.id===current.user.id)){fail(403,'Join this room before inviting someone.');return;}
    let invite=store.db.prepare('SELECT token FROM room_invites WHERE code=? AND inviter_id=?').get(room.code,current.user.id) as {token:string}|undefined;
    if(!invite){invite={token:randomBytes(32).toString('base64url')};store.db.prepare('INSERT INTO room_invites VALUES(?,?,?)').run(invite.token,room.code,current.user.id);}
    res.end(JSON.stringify({token:invite.token}));return;
   }
   if(req.method!=='GET'){fail(405,'Open the invitation to preview this room.');return;}
   const invite=store.db.prepare('SELECT code,inviter_id FROM room_invites WHERE token=?').get(readInvite![1]) as {code:string;inviter_id:string}|undefined;
   const room=invite?rooms.get(invite.code):undefined,inviter=room?.seats.find(p=>p.id===invite!.inviter_id);
   if(!room||!inviter){fail(410,'This invitation is no longer available. Ask your friend for a new link.');return;}
   const current=accounts.session(req),member=room.seats.some(p=>p.id===current?.user.id);
   res.end(JSON.stringify({code:room.code,name:room.name,inviter:{name:inviter.name,avatar:inviter.avatar||'/default-avatar.svg'},players:room.seats.map(p=>({name:p.name,avatar:p.avatar||'/default-avatar.svg',connected:online(p.id)})),status:room.round?'playing':room.seats.length>=10?'full':'waiting',canJoin:member||(!room.round&&room.seats.length<10)}));return;
  }
  if(req.url!=='/dev/session'||req.method!=='POST'||!options.allowDevAuth||!origin||!options.allowedOrigins.includes(origin)){res.writeHead(404);res.end();return;}
  let text='';try{for await(const chunk of req){text+=chunk;if(text.length>160000)throw Error();}const input=JSON.parse(text);if(!validText(input.name,24))throw Error();const token=randomBytes(32).toString('base64url'),user={id:randomUUID(),name:input.name.trim(),avatar:avatar(input.avatar)};store.saveSession(hash(token),user);res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({token,user}));}catch{res.writeHead(400);res.end();}
 });
 const wss=new WebSocketServer({server:http,maxPayload:600000,verifyClient:(info:{origin:string})=>options.allowedOrigins.includes(info.origin)});
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
    if(input.type==='voice'){
     if(typeof p.audio!=='string'||p.audio.length>550000||!/^data:audio\/(webm|mp4|ogg);base64,[A-Za-z0-9+/]+={0,2}$/.test(p.audio)||!Number.isFinite(p.duration)||p.duration<0.1||p.duration>30.5)throw Error('Record a voice message up to 30 seconds.');
     const id=randomUUID(),mime=p.audio.slice(5,p.audio.indexOf(';')),audio=Buffer.from(p.audio.split(',')[1],'base64');
     if(!audio.length||audio.length>400000)throw Error('That recording is too large. Try a shorter message.');
     const history=r.messages||[];if(history.some(m=>m.senderId===user.id&&Date.now()-m.at<1500))throw Error('Please wait a moment before sending another recording.');
     store.db.prepare('INSERT INTO voice_messages VALUES(?,?,?,?)').run(id,r.code,mime,audio);
     r.message={id,senderId:user.id,text:'Voice message',effect:'normal',at:Date.now(),voice:{url:`/api/game/voice/${id}`,duration:p.duration}};
     r.messages=[...history,{...r.message,senderName:user.name}].slice(-200);
     const keep=new Set(r.messages.filter(m=>m.voice).map(m=>m.id));for(const old of store.db.prepare('SELECT id FROM voice_messages WHERE code=?').all(r.code) as {id:string}[])if(!keep.has(old.id))store.db.prepare('DELETE FROM voice_messages WHERE id=?').run(old.id);
     store.save(r);broadcast(r);
    }else if(input.type==='message'){
     if(!validText(p.text,120)||!['normal','slam','echo'].includes(p.effect))throw Error('Check your message.');const history=r.messages||(r.message?[{...r.message,senderName:r.seats.find(s=>s.id===r.message!.senderId)?.name||'Player'}]:[]);r.message={id:randomUUID(),senderId:user.id,text:p.text.trim(),effect:p.effect,at:Date.now()};r.messages=[...history,{...r.message,senderName:user.name}].slice(-200);store.save(r);broadcast(r);
    }else{
     if(input.revision!==r.revision)throw Error('The table changed. Try again.');
     if(input.type==='ready'){if(r.round)throw Error('The round has already started.');if(typeof p.ready!=='boolean')throw Error('Invalid ready status.');r.seats.find(s=>s.id===user!.id)!.ready=p.ready;commit(r);}
     else if(input.type==='open-seats'){
      if(r.hostId!==user.id)throw Error('Only the host can invite players between rounds.');
      if(!r.round?.winner)throw Error('Finish the current round before adding players.');
      r.lastWinnerId=r.round.winner;r.round=null;r.winningPlay=undefined;r.event=null;r.message=null;r.seats=r.seats.map(seat=>({...seat,ready:false}));
      clearTimeout(timers.get(r.code));timers.delete(r.code);commit(r);
     }
     else if(input.type==='start'){
      if(r.hostId!==user.id)throw Error('Only the host can deal.');if(r.round&&!r.round.winner)throw Error('Finish the current round first.');if(r.seats.length<2||r.seats.some(s=>!s.ready||!online(s.id)))throw Error('At least two connected, ready players are needed.');
      r.round=newRound(r.seats.map(s=>({...s,title:'',type:'human',hand:[],hasCalledGlam:false,score:0})),r.handSize,r.lastWinnerId||r.round?.winner||undefined);r.roundId=randomUUID();r.winningPlay=undefined;r.startedAt=Date.now();r.turnDeadline=r.startedAt+3500+turnDuration;r.played={};r.event={id:randomUUID(),actorId:user.id,kind:'start'};r.message=null;commit(r);schedule(r);
     }else if(input.type==='move'){
      if(!r.round||r.round.winner||r.round.players[r.round.active].id!==user.id)throw Error('Wait for your turn.');if(Date.now()<r.startedAt+3500)throw Error('The cards are still being dealt.');
      const m=p.move;if(!m||!['play','draw','skip'].includes(m.type))throw Error('Invalid move.');
      if(m.type==='play'&&(!Array.isArray(m.ids)||m.ids.length>108||m.ids.some((id:unknown)=>typeof id!=='string')||(m.color!==undefined&&!['red','blue','green','yellow'].includes(m.color))))throw Error('Invalid cards or color.');
      apply(r,user.id,m);
     }else if(input.type==='leave'){
      const participants=[...r.seats];let result:any;
      if(r.round&&!r.round.winner){
       const activeId=r.round.players[r.round.active].id;r.round=leaveRound(r.round,user.id);if(activeId===user.id)r.turnDeadline=Date.now()+turnDuration;
       r.event=null;
       if(r.round.winner){
        const winner=r.round.winner;r.lastWinnerId=winner;r.wins[winner]=(r.wins[winner]||0)+1;
        result={id:r.roundId,room_code:r.code,table_name:r.name,winner_id:winner,finished_at:new Date().toISOString(),players:participants.map(p=>({user_id:p.id,cards_played:r.played[p.id]||0,turns:r.round!.turns}))};
       }
      }else r.round=null;
      r.seats=r.seats.filter(s=>s.id!==user!.id);if(r.hostId===user.id)r.hostId=r.seats[0]?.id||'';
      if(!r.seats.length)r.round=null;
      for(const [socket,id]of users)if(id.id===user.id){members.delete(socket);send(socket,{type:'room',room:null});}
      commit(r,result);schedule(r);
      if(result)for(const [ws,u]of users)if(participants.some(p=>p.id===u.id))send(ws,{type:'profile-updated'});
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

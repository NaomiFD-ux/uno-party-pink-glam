import {accountRequest} from './api';
import type {RoomView} from './protocol';
export type OnlineStatus='connecting'|'connected'|'reconnecting'|'offline';
export class GameConnection {
 socket:WebSocket|null=null;room:RoomView|null=null;status:OnlineStatus='connecting';error='';profileVersion=0;
 private listeners=new Set<()=>void>();private pending=new Map<string,{resolve:()=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();private retry:ReturnType<typeof setTimeout>|null=null;private stopped=false;private heartbeat:ReturnType<typeof setInterval>|null=null;
 constructor(private identity:{id:string;name:string;avatar:string}){window.addEventListener('online',this.foreground);document.addEventListener('visibilitychange',this.foreground);void this.connect();}
 private foreground=()=>{if(document.visibilityState==='visible'&&!this.stopped){if(this.retry)clearTimeout(this.retry);if(this.socket?.readyState===WebSocket.OPEN)this.socket.close();else if(this.socket?.readyState!==WebSocket.CONNECTING)void this.connect();}};
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private notify(){this.listeners.forEach(fn=>fn());}
 private failPending(){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Connection lost. Reconnecting to your table…'));}this.pending.clear();}
 private async connect(){try{
  this.status=this.room?'reconnecting':'connecting';this.notify();
  const url=process.env.NEXT_PUBLIC_GAME_SERVER_URL||'ws://127.0.0.1:3030';
  const {ticket:token}=await accountRequest('/auth/ticket',{});if(this.stopped)return;
  const ws=new WebSocket(url);this.socket=ws;
  ws.onopen=async()=>{try{await this.send('auth',{token},false);this.status='connected';this.error='';this.notify();}catch(e){this.error=(e as Error).message;ws.close();}};
  ws.onmessage=e=>{try{const data=JSON.parse(e.data);if(data.type==='profile-updated'){this.profileVersion++;this.notify();}if(data.type==='room'){this.room=data.room;this.notify();}if(data.type==='reply'){const p=this.pending.get(data.id);if(p){clearTimeout(p.timer);this.pending.delete(data.id);data.ok?p.resolve():p.reject(Error(data.error));}}}catch{}};
  ws.onclose=()=>{this.failPending();if(this.stopped)return;this.status=this.room?'reconnecting':'offline';this.notify();this.retry=setTimeout(()=>void this.connect(),1800);};ws.onerror=()=>ws.close();
 }catch(e:any){if(this.stopped)return;if(e.status===401){this.stopped=true;window.dispatchEvent(new Event('uno-session-expired'));return;}this.error=(e as Error).message;this.status='offline';this.notify();this.retry=setTimeout(()=>void this.connect(),3000);}}
 send(type:string,payload:unknown={},needsReady=true):Promise<void>{if(!this.socket||this.socket.readyState!==WebSocket.OPEN||(needsReady&&this.status!=='connected'))return Promise.reject(Error('Connecting to the table. Please try again in a moment.'));const id=crypto.randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('The server did not respond. Please try again.'));},10000);this.pending.set(id,{resolve,reject,timer});this.socket!.send(JSON.stringify({id,type,payload,revision:this.room?.revision}));});}
 reconnect=()=>{if(this.socket?.readyState===WebSocket.OPEN)this.socket.close();};
 close(){this.stopped=true;if(this.retry)clearTimeout(this.retry);window.removeEventListener('online',this.foreground);document.removeEventListener('visibilitychange',this.foreground);this.socket?.close();this.failPending();}
}

import {useEffect,useLayoutEffect,useRef} from 'react';
import {Clock,MessageCircle,X} from 'lucide-react';
import type {ChatMessage,Seat} from '../online/protocol';
export function ChatHistory({messages,seats,selfId,onClose}:{messages:ChatMessage[];seats:Pick<Seat,'id'|'avatar'>[];selfId:string;onClose:()=>void}){
 const closeAction=useRef(onClose);closeAction.current=onClose;
 const panel=useRef<HTMLElement>(null),scroll=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null),stick=useRef(true);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;close.current?.focus({preventScroll:true});const outside=(event:PointerEvent)=>{if(!panel.current?.contains(event.target as Node))closeAction.current();};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')closeAction.current();};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);previous?.focus({preventScroll:true});};},[]);
 useLayoutEffect(()=>{if(scroll.current&&stick.current)scroll.current.scrollTop=scroll.current.scrollHeight;},[messages.length,messages.at(-1)?.id]);
 const date=(at:number)=>new Date(at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
 return <div className="chat-history-backdrop" onPointerDown={event=>{if(event.target===event.currentTarget)onClose();}}><section ref={panel} className="chat-history-panel" role="dialog" aria-modal="false" aria-labelledby="chat-history-title" onKeyDown={event=>{if(event.key==='Escape')onClose();}}>
  <header><div><MessageCircle size={19}/><h2 id="chat-history-title">Table chat</h2></div><button ref={close} type="button" aria-label="Close chat history" onClick={onClose}><X size={20}/></button></header>
  <div ref={scroll} className="chat-history-scroll" tabIndex={0} aria-label="Chat messages" onScroll={event=>{const el=event.currentTarget;stick.current=el.scrollHeight-el.scrollTop-el.clientHeight<60;}}>
   {!messages.length?<div className="chat-history-empty"><Clock size={25}/><p>No messages yet.</p><span>Your table’s messages will appear here.</span></div>:messages.map((message,index)=><div key={message.id}>
    {(index===0||date(messages[index-1].at)!==date(message.at))&&<p className="chat-history-date">{date(message.at)}</p>}
    <article className={`chat-history-message ${message.senderId===selfId?'is-yours':''}`}><img src={seats.find(p=>p.id===message.senderId)?.avatar||'/default-avatar.svg'} alt=""/><div><div className="chat-history-meta"><strong>{message.senderId===selfId?'You':message.senderName}</strong><time dateTime={new Date(message.at).toISOString()} title={new Date(message.at).toLocaleString()}>{new Date(message.at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</time></div><p>{message.text}</p>{message.effect!=='normal'&&<small>{message.effect==='slam'?'💥 Slam':'✨ Echo'}</small>}</div></article>
   </div>)}
  </div>
 </section></div>;
}

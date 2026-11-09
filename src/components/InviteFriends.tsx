import {roomInviteText} from '../utils/roomCode';
import {useEffect,useRef,useState} from 'react';
import {Check,Copy,MessageCircle,UserPlus} from 'lucide-react';

export function InviteFriends({code,name}:{code:string;name:string}) {
 const [open,setOpen]=useState(false),[copied,setCopied]=useState(false),[fallback,setFallback]=useState('');
 const root=useRef<HTMLDivElement>(null);
 const url=typeof location==='undefined'?'':`${location.origin}/?room=${encodeURIComponent(code)}`;
 const text=roomInviteText(code,name,url);
 const apple=typeof navigator!=='undefined'&&(/iPad|iPhone|iPod|Mac/.test(navigator.userAgent));
 const messageHref=`sms:${apple?'&':'?'}body=${encodeURIComponent(text)}`;
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);root.current?.querySelector('button')?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[open]);
 async function copy(){
  try{await navigator.clipboard.writeText(url);setCopied(true);setFallback('');}
  catch{setFallback(url);}
 }
 return <div className="invite-friends" ref={root}>
  <button type="button" className="text-button" aria-expanded={open} aria-label="Invite Friends" onClick={()=>{setOpen(value=>!value);setCopied(false);setFallback('');}}><UserPlus size={19}/> Invite Friends</button>
  {open&&<div className="invite-bubbles" role="group" aria-label="Invite options">
   <a className="invite-bubble invite-message" href={messageHref}><span><MessageCircle size={23}/></span><strong>Message</strong></a>
   <button type="button" className="invite-bubble invite-copy" onClick={()=>void copy()}><span>{copied?<Check size={23}/>:<Copy size={23}/>}</span><strong>{copied?'Copied!':'Copy Link'}</strong></button>
   <span className="sr-only" role="status">{copied?'Invite link copied':''}</span>
   {fallback&&<label className="invite-copy-fallback">Copy this link<input readOnly value={fallback} onFocus={event=>event.target.select()}/></label>}
  </div>}
 </div>;
}

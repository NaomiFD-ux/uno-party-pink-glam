import {useEffect,useRef,useState} from 'react';

export function AngelGiftNotice({enabled,accountId}:{enabled:boolean;accountId:string}) {
 const [open,setOpen]=useState(false);
 const key=`uno_angel_gift_v1_${accountId}`;
 useEffect(()=>{
  let seen=false;try{seen=localStorage.getItem(key)==='seen';}catch{}
  setOpen(enabled&&!seen);
 },[enabled,key]);
 if(!enabled||!open)return null;
 return <aside className="angel-love-note" role="status" aria-live="polite">
  <span aria-hidden="true" className="angel-love-heart">💌</span>
  <div><strong>Angel, I love you! 💗</strong>
   <p>This little cheat code is just for you! Double-tap the velvet right below the DRAW deck to turn one of your cards into a +4.</p>
   <small>Love, TheBaddest 💕</small>
   <button type="button" onClick={()=>{try{localStorage.setItem(key,'seen');}catch{}setOpen(false);}}>Got it, love you! 💗</button>
  </div>
 </aside>;
}

/** A separate hit area below DRAW: tapping the deck still only draws a card. */
export function AngelGiftZone({disabled,onGift}:{disabled:boolean;onGift:()=>void}) {
 const down=useRef<{id:number;x:number;y:number}|null>(null);
 const last=useRef<{at:number;x:number;y:number}|null>(null);
 const cancel=()=>{down.current=null;last.current=null;};
 useEffect(cancel,[disabled]);
 return <button type="button" className="angel-gift-zone" disabled={disabled}
  aria-label="Angel’s gift: double-tap the velvet below the draw deck"
  onPointerDown={event=>{if(disabled||!event.isPrimary||event.button!==0)return;down.current={id:event.pointerId,x:event.clientX,y:event.clientY};}}
  onPointerMove={event=>{const p=down.current;if(p&&Math.hypot(event.clientX-p.x,event.clientY-p.y)>12)cancel();}}
  onPointerLeave={cancel} onPointerCancel={cancel}
  onPointerUp={event=>{
   const p=down.current;down.current=null;
   if(disabled||!p||p.id!==event.pointerId)return;
   const now=performance.now(),prior=last.current;
   if(prior&&now-prior.at<=400&&Math.hypot(event.clientX-prior.x,event.clientY-prior.y)<=28){last.current=null;onGift();}
   else last.current={at:now,x:event.clientX,y:event.clientY};
  }}
  onKeyDown={event=>{if(!disabled&&!event.repeat&&(event.key==='Enter'||event.key===' ')){event.preventDefault();onGift();}}}
 />;
}

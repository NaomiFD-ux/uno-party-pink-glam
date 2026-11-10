import React,{useEffect,useRef} from 'react';

/** A hold opens the private action without also selecting or playing the card. */
export function OwnerCardAction({onHold,children,...props}:React.HTMLAttributes<HTMLDivElement>&{onHold?:()=>void}) {
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const held=useRef(false),start=useRef({x:0,y:0});
 const cancel=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;};
 useEffect(()=>cancel,[]);
 useEffect(()=>{cancel();},[!!onHold]);
 return <div {...props}
  onPointerDown={event=>{
   cancel();held.current=false;
   if(!onHold||!event.isPrimary||event.button!==0)return;
   start.current={x:event.clientX,y:event.clientY};
   timer.current=setTimeout(()=>{timer.current=null;held.current=true;onHold();},600);
  }}
  onPointerMove={event=>{if(Math.hypot(event.clientX-start.current.x,event.clientY-start.current.y)>10)cancel();}}
  onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}
  onClickCapture={event=>{if(held.current){held.current=false;event.preventDefault();event.stopPropagation();}}}
  onContextMenu={event=>{if(onHold){event.preventDefault();cancel();held.current=true;onHold();}}}
  onKeyDownCapture={event=>{if(onHold&&(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10')){event.preventDefault();cancel();onHold();}}}
 >{children}</div>;
}

import {useEffect,useRef} from 'react';
import {MessageCircle} from 'lucide-react';
export function ChatButton({expanded,onCompose,onHistory}:{expanded:boolean;onCompose:()=>void;onHistory:()=>void}){
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),held=useRef(false),start=useRef({x:0,y:0});
 const cancel=()=>{clearTimeout(timer.current);timer.current=undefined;};
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 return <button type="button" className="game-chat-button p-2 rounded-full bg-white/90 hover:bg-white text-pink-600 border border-pink-200 shadow-xs cursor-pointer"
  title="Tap to message · Hold for chat history" aria-label="Open chat" aria-description="Hold to view chat history. Shift+H also opens history." aria-expanded={expanded}
  onPointerDown={event=>{if(event.button!==0)return;cancel();held.current=false;start.current={x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);timer.current=setTimeout(()=>{held.current=true;onHistory();},500);}}
  onPointerMove={event=>{if(Math.hypot(event.clientX-start.current.x,event.clientY-start.current.y)>12)cancel();}}
  onPointerUp={cancel} onPointerCancel={()=>{cancel();held.current=false;}} onLostPointerCapture={cancel}
  onContextMenu={event=>event.preventDefault()}
  onKeyDown={event=>{if(event.shiftKey&&event.key.toLowerCase()==='h'){event.preventDefault();onHistory();}}}
  onClick={()=>{if(held.current){held.current=false;return;}onCompose();}}><MessageCircle size={16}/></button>;
}

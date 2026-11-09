import {normalizeRoomCode,readRoomCode} from '../utils/roomCode';
import { useEffect, useRef, useState, FormEvent, ClipboardEvent } from 'react';
import { ArrowRight, KeyRound, Plus, X, Clipboard, Link } from 'lucide-react';
export function JoinGameModal({onClose,onHost,onJoin}:{onClose:()=>void;onHost:()=>void;onJoin?:(code:string)=>Promise<void>}) {
  const [code,setCode] = useState('');
  const [focused,setFocused]=useState(false);
  const [error,setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(()=>{
    const previous = document.activeElement as HTMLElement|null;
    input.current?.focus();
    function key(e:KeyboardEvent) {
      if(e.key==='Escape') {e.preventDefault();closeRef.current();}
      if(e.key==='Tab') {
        const items = [...(dialog.current?.querySelectorAll<HTMLElement>('button,input')||[])].filter(el=>!el.hasAttribute('disabled'));
        const first=items[0],last=items[items.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    }
    document.addEventListener('keydown',key);
    return ()=>{document.removeEventListener('keydown',key);previous?.focus();};
  },[]);
  function paste(e:ClipboardEvent<HTMLInputElement>) {e.preventDefault();setCode(readRoomCode(e.clipboardData.getData('text')));setError('');input.current?.focus();}
  const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent) {e.preventDefault();if(code.length!==6){setError('Enter all 6 letters or numbers from your host’s room code.');return;}setBusy(true);try{await onJoin?.(code);onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="clean-modal-backdrop join-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={dialog} className="join-room-modal" role="dialog" aria-modal="true" aria-labelledby="join-title" aria-describedby="join-description"><button className="modal-close" aria-label="Close join game" onClick={onClose}><X size={19}/></button><header className="join-glam-header"><span>GAME NIGHT</span><div className="join-icon"><KeyRound size={29}/></div><h2 id="join-title">Join the game.</h2><p>Your crew is waiting.</p></header><p id="join-description">Enter the 6-character code from your host.</p><form onSubmit={submit} noValidate><div className="join-code-label"><strong>Room code</strong><button type="button" onClick={async()=>{try{const value=readRoomCode(await navigator.clipboard.readText());setCode(value);setError('');input.current?.focus();}catch{setError('Tap the code boxes and use your keyboard’s Paste option.');}}}><Clipboard size={16}/> Paste Code</button></div><div className={`room-code-autofill ${focused?'is-focused':''}`}><div className="room-code-inputs" aria-hidden="true">{Array.from({length:6},(_,index)=><span key={index} className={focused&&index===Math.min(code.length,5)?'active-code-box':''}>{code[index]||''}</span>)}</div><input ref={input} aria-label="6-character room code" name="room-code" type="text" value={code} inputMode="text" autoCapitalize="characters" autoComplete="one-time-code" spellCheck={false} maxLength={6} pattern="[A-Za-z0-9]{6}" onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onPaste={paste} onChange={event=>{setCode(normalizeRoomCode(event.target.value));setError('');}}/></div><p className="join-code-hint">Letters and numbers · Not case-sensitive</p><button className="uno-primary join-room-submit" type="submit" disabled={busy}>{busy?'Joining…':'Join Room'} <ArrowRight size={17}/></button>{error&&<p className="join-feedback" role="alert">{error}</p>}</form><div className="join-help"><Link size={17}/><p>Have an invite link? Open it to join directly.</p></div><p className="join-start-own">Starting your own game?</p><button className="uno-secondary join-host" onClick={onHost}><Plus size={16}/> Create a Room</button></section></div>;
}

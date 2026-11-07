import { useEffect, useRef, useState, FormEvent, ClipboardEvent } from 'react';
import { ArrowRight, KeyRound, Plus, X, Info } from 'lucide-react';
export function JoinGameModal({onClose,onHost,onJoin}:{onClose:()=>void;onHost:()=>void;onJoin?:(code:string)=>Promise<void>}) {
  const [code,setCode] = useState<string[]>(Array(6).fill(''));
  const [error,setError] = useState('');
  const inputs = useRef<Array<HTMLInputElement|null>>([]);
  const dialog = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(()=>{
    const previous = document.activeElement as HTMLElement|null;
    inputs.current[0]?.focus();
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
  function paste(e:ClipboardEvent<HTMLInputElement>,index:number) {
    e.preventDefault(); const text=e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
    if(!text)return;
    const start=text.length===6?0:index;
    setCode(old=>{const next=[...old];for(let i=0;i<text.length&&start+i<6;i++)next[start+i]=text[i];return next;});
    setError(''); inputs.current[Math.min(5,start+text.length)]?.focus();
  }
  const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent) {e.preventDefault();if(!code.every(Boolean)){setError('Enter all 6 letters or numbers from your host’s room code.');return;}setBusy(true);try{await onJoin?.(code.join(''));onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="clean-modal-backdrop join-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={dialog} className="join-room-modal" role="dialog" aria-modal="true" aria-labelledby="join-title" aria-describedby="join-description"><button className="modal-close" aria-label="Close join game" onClick={onClose}><X size={19}/></button><div className="join-icon"><KeyRound size={19}/></div><h2 id="join-title">Join a Card Table <span>✨</span></h2><p id="join-description">Enter the 6-character room code shared by your host.</p><form onSubmit={submit} noValidate><div className="room-code-inputs" role="group" aria-label="Room code">{code.map((letter,index)=><input key={index} ref={el=>{inputs.current[index]=el;}} aria-label={`Room code character ${index+1}`} value={letter} inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={1} onPaste={e=>paste(e,index)} onChange={e=>{const value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(-1);setCode(old=>old.map((c,i)=>i===index?value:c));setError('');if(value&&index<5)inputs.current[index+1]?.focus();}} onKeyDown={e=>{if(e.key==='Backspace'&&!letter&&index>0){e.preventDefault();setCode(old=>old.map((c,i)=>i===index-1?'':c));inputs.current[index-1]?.focus();}if(e.key==='ArrowLeft'&&index>0){e.preventDefault();inputs.current[index-1]?.focus();}if(e.key==='ArrowRight'&&index<5){e.preventDefault();inputs.current[index+1]?.focus();}}}/>)}</div><button className="uno-primary join-room-submit" type="submit" disabled={busy}>{busy?'Joining…':'Join Room'} <ArrowRight size={17}/></button>{error&&<p className="join-feedback" role="alert">{error}</p>}</form><div className="join-help"><Info size={15}/><p>Ask your host for the room code, or use the link they shared.</p></div><div className="join-separator"><span>OR</span></div><button className="uno-secondary join-host" onClick={onHost}><Plus size={16}/> Host Your Own Room</button></section></div>;
}

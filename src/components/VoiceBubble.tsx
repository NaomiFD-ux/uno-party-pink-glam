import {useEffect,useRef,useState} from 'react';
import {Volume2} from 'lucide-react';
import {soundFX} from '../utils/audio';
/** Transient table indicator; permanent replay controls live in chat history. */
export function VoiceBubble({url,duration,name,onDone}:{url:string;duration:number;name:string;onDone:()=>void}){
 const done=useRef(onDone);done.current=onDone;
 const [status,setStatus]=useState<'loading'|'playing'|'blocked'>('loading'),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  setStatus('loading');let disposed=false;
  const fallback=setTimeout(()=>{if(!disposed)done.current();},Math.min(30,duration)*1000+10000);
  const cancel=soundFX.playVoice(url,()=>{if(!disposed)setStatus('playing');},()=>{if(!disposed)done.current();},()=>{if(!disposed)setStatus('blocked');});
  return()=>{disposed=true;clearTimeout(fallback);cancel();};
 },[url,duration,attempt]);
 // Even blocked/failed playback fades away instead of leaving a permanent player.
 useEffect(()=>{if(status!=='blocked')return;const timer=setTimeout(()=>done.current(),6000);return()=>clearTimeout(timer);},[status]);
 return <button type="button" className={`live-voice-note ${status}`} aria-label={`${name}: ${status==='playing'?'Playing voice message':status==='blocked'?'Tap to hear voice message':'Loading voice message'}`} onClick={()=>{if(status==='blocked'){soundFX.unlockVoiceAudio();setAttempt(n=>n+1);}}}>
  <Volume2 size={18}/><span className="voice-wave" aria-hidden="true">{[0,1,2,3,4,5,6].map(i=><i key={i} style={{animationDelay:`${i*-.11}s`}}/>)}</span><small>{status==='blocked'?'Tap to hear':status==='loading'?'…':`${Math.ceil(duration)}s`}</small>
 </button>;
}

import {useEffect,useRef,useState} from 'react';
import {Mic,Send,Trash2} from 'lucide-react';
export function VoiceRecorder({onSend}:{onSend:(audio:string,duration:number)=>Promise<void>}){
 const [state,setState]=useState<'idle'|'recording'|'preview'|'sending'>('idle'),[clip,setClip]=useState(''),[seconds,setSeconds]=useState(0),[error,setError]=useState('');
 const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),started=useRef(0),held=useRef(false),alive=useRef(true),busy=useRef(false);
 const cleanup=()=>{if(timer.current)clearInterval(timer.current);timer.current=null;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;};
 const stop=()=>{held.current=false;if(recorder.current?.state==='recording')recorder.current.stop();};
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;held.current=false;stop();cleanup();};},[]);
 async function start(){
  if(busy.current||state!=='idle')return;busy.current=true;held.current=true;setError('');
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw Error('Voice recording is not supported in this browser. Try Safari over HTTPS.');
   const input=await navigator.mediaDevices.getUserMedia({audio:true});stream.current=input;
   if(!alive.current||!held.current){cleanup();return;}
   const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
   const rec=new MediaRecorder(input,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:32000});recorder.current=rec;const parts:BlobPart[]=[];
   rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};
   rec.onstop=()=>{const duration=Math.min(30,(Date.now()-started.current)/1000);cleanup();if(!alive.current)return;if(duration<0.2){setState('idle');return;}const blob=new Blob(parts,{type:rec.mimeType.split(';')[0]});if(blob.size>400000){setError('That recording is too large. Try a shorter message.');setState('idle');return;}const reader=new FileReader();reader.onload=()=>{if(alive.current){setClip(String(reader.result));setSeconds(duration);setState('preview');}};reader.onerror=()=>{if(alive.current){setError('Could not read that recording. Try again.');setState('idle');}};reader.readAsDataURL(blob);};
   rec.onerror=()=>{cleanup();if(alive.current){setError('Recording stopped. Please try again.');setState('idle');}};
   rec.start();started.current=Date.now();setSeconds(0);setState('recording');timer.current=setInterval(()=>{const elapsed=(Date.now()-started.current)/1000;setSeconds(Math.min(30,elapsed));if(elapsed>=30)stop();},100);
  }catch(e){cleanup();if(alive.current){setState('idle');setError(e instanceof Error&&e.name==='NotAllowedError'?'Allow microphone access to record a voice message.':e instanceof Error?e.message:'Could not start the microphone.');}}finally{busy.current=false;}
 }
 return <>
  <button type="button" className={`voice-record-button ${state==='recording'?'is-recording':''}`} aria-label={state==='recording'?'Release to preview recording':'Hold to record voice message'} title="Hold to record · 30 seconds max" disabled={state==='preview'||state==='sending'} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);void start();}} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onContextMenu={e=>e.preventDefault()} onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();void start();}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();stop();}}}><Mic size={18}/></button>
  {state==='recording'&&<div className="voice-preview" role="status">🔴 Recording {Math.ceil(seconds)} / 30s · Release to preview</div>}
  {(state==='preview'||state==='sending')&&<div className="voice-preview"><audio controls preload="metadata" src={clip} aria-label="Preview your voice message"/><div><button type="button" aria-label="Delete recording" disabled={state==='sending'} onClick={()=>{setClip('');setState('idle');}}><Trash2 size={16}/> Delete</button><button type="button" disabled={state==='sending'} onClick={async()=>{setState('sending');setError('');try{await onSend(clip,seconds);if(alive.current){setClip('');setState('idle');}}catch(e){if(alive.current){setError(e instanceof Error?e.message:'Could not send recording.');setState('preview');}}}}><Send size={16}/>{state==='sending'?'Sending…':'Send voice'}</button></div></div>}
  {error&&<p className="voice-error" role="alert">{error}</p>}
 </>;
}

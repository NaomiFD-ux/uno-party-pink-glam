import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowRight,Gift,Music2,Pause,Play,VolumeX} from 'lucide-react';
import {SecretSanta} from './SecretSanta';
import {santaApi} from '../online/santa';

// A light Jingle Bells arrangement with music-box melody, soft chords and sleigh bells.
function holidayMusic() {
 const context=new AudioContext(),output=context.createGain();
 output.gain.value=.12;output.connect(context.destination);
 const melody:[[number,number],...[number,number][]]=[[76,1],[76,1],[76,2],[76,1],[76,1],[76,2],[76,1],[79,1],[72,1.5],[74,.5],[76,4],[77,1],[77,1],[77,1.5],[77,.5],[77,1],[76,1],[76,1],[76,.5],[76,.5],[76,1],[74,1],[74,1],[76,1],[74,2],[79,2],[76,1],[76,1],[76,2],[76,1],[76,1],[76,2],[76,1],[79,1],[72,1.5],[74,.5],[76,4],[77,1],[77,1],[77,1],[77,1],[77,1],[76,1],[76,1],[76,.5],[76,.5],[79,1],[79,1],[77,1],[74,1],[72,4]];
 const beat=.29,phrase=melody.reduce((sum,n)=>sum+n[1],0);
 const note=(midi:number,time:number,length:number,level:number,soft=false)=>{
  for(const [multiple,volume] of (soft?[[1,1],[2,.12]]:[[1,1],[2,.3],[3,.09]])){
   const oscillator=context.createOscillator(),gain=context.createGain();
   oscillator.type=soft?'triangle':'sine';oscillator.frequency.value=440*2**((midi-69)/12)*multiple;
   gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level*volume,time+(soft?.04:.008));gain.gain.exponentialRampToValueAtTime(.0001,time+length);
   oscillator.connect(gain);gain.connect(output);oscillator.start(time);oscillator.stop(time+length+.02);
  }
 };
 const noise=context.createBuffer(1,Math.ceil(context.sampleRate*.09),context.sampleRate),data=noise.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(context.sampleRate*.018));
 const jingle=(time:number)=>{const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=noise;filter.type='highpass';filter.frequency.value=6500;gain.gain.value=.1;source.connect(filter);filter.connect(gain);gain.connect(output);source.start(time);};
 let next=context.currentTime+.08,position=0,index=0,rhythm=context.currentTime+.08,rhythmBeat=0;
 const schedule=()=>{
  while(next<context.currentTime+.6){const [pitch,duration]=melody[index];note(pitch,next,Math.min(1.3,duration*beat+.3),.32);next+=duration*beat;position+=duration;index=(index+1)%melody.length;if(position>=phrase)position=0;}
  while(rhythm<context.currentTime+.6){jingle(rhythm);if(rhythmBeat%4===0){const chord=[[48,52,55],[53,57,60],[55,59,62],[48,52,55]][Math.floor(rhythmBeat/8)%4];chord.forEach(pitch=>note(pitch,rhythm,beat*3.8,.055,true));}rhythm+=beat;rhythmBeat++;}
 };
 schedule();const timer=window.setInterval(schedule,150);
 return {start:()=>context.resume(),stop:()=>{clearInterval(timer);void context.close();}};
}

export function SantaExperience({accountId,onLogin,onHome}:{accountId:string;onLogin:()=>void;onHome?:()=>void}) {
 const directInvite=/^[A-Za-z0-9_-]{43}$/.test(new URLSearchParams(location.search).get('santa')||'');
 const [newExchange,setNewExchange]=useState(false),[initialExchangeId,setInitialExchangeId]=useState('');
 const [started,setStarted]=useState(directInvite),[checking,setChecking]=useState(accountId!=='guest'&&!directInvite),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{if(accountId==='guest'||directInvite)return;let alive=true;setChecking(true);setError('');
  santaApi.list().then(groups=>{if(alive){setInitialExchangeId(groups.length===1?groups[0].id:'');setStarted(groups.length>0);}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setChecking(false);});return()=>{alive=false;};
 },[accountId,directInvite,retry]);
 if(checking)return <section className="santa-account-prompt" role="status">Finding your Secret Santa exchanges…</section>;
 if(error)return <section className="santa-account-prompt"><p role="alert">{error}</p><button className="santa-primary" onClick={()=>setRetry(v=>v+1)}>Try again</button></section>;
 if(!started)return <SantaWelcome onBrowse={()=>{setNewExchange(false);setInitialExchangeId('');setStarted(true);window.scrollTo({top:0});}} onStart={()=>{setNewExchange(true);setInitialExchangeId('');setStarted(true);window.scrollTo({top:0});}}/>;
 return <>{accountId==='guest'?<section className="santa-account-prompt"><h1>Join your Secret Santa 🎁</h1><p>Log in or create your own account to keep your gift assignment private.</p><button className="santa-primary" onClick={onLogin}>Log in or sign up</button></section>:<SecretSanta accountId={accountId} initialCreate={newExchange} initialExchangeId={initialExchangeId} onHome={onHome}/>}</>;
}

export function SantaWelcome({onStart,onBrowse}:{onStart:()=>void;onBrowse?:()=>void}) {
 const [music,setMusic]=useState(false),[paused,setPaused]=useState(false);
 const sound=useRef<ReturnType<typeof holidayMusic>|null>(null);
 const toggleMusic=async()=>{
  if(sound.current){sound.current.stop();sound.current=null;setMusic(false);return;}
  try{const player=holidayMusic();sound.current=player;await player.start();setMusic(true);}catch{sound.current?.stop();sound.current=null;setMusic(false);}
 };
 useEffect(()=>()=>{sound.current?.stop();sound.current=null;},[]);
 useEffect(()=>{const hide=()=>{if(document.hidden){sound.current?.stop();sound.current=null;setMusic(false);}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 return <section className={`santa-welcome${paused?' santa-motion-paused':''}`} aria-label="Secret Santa Christmas welcome">
  <img className="santa-welcome-scene" src="/game-night/santa-welcome-scene.webp" width={1024} height={1536} alt="" fetchPriority="high"/>
  <div className="santa-welcome-weather" aria-hidden="true">
   {Array.from({length:42},(_,i)=><i className="santa-snow" key={i} style={{'--x':`${(i*37+11)%100}%`,'--delay':`${-((i*7)%17)}s`,'--duration':`${9+i%9}s`,'--size':`${2+i%4}px`,'--drift':`${(i%2?1:-1)*(12+i%20)}px`} as CSSProperties}/>)}
   {Array.from({length:14},(_,i)=><span className="santa-falling-flake" key={`fall-${i}`} style={{'--x':`${(i*31+5)%100}%`,'--delay':`${-((i*3)%19)}s`,'--duration':`${13+i%8}s`,'--size':`${13+i%4*5}px`,'--drift':`${i%2?45:-35}px`} as CSSProperties}>❄</span>)}
   {[0,1,2,3].map(i=><span key={i} className={`santa-floating-flake flake-${i}`}>❄</span>)}
   <img className="santa-flying-sleigh" src="/game-night/santa-sleigh.webp" alt="" width={900} height={368}/>
  </div>
  <div className="santa-welcome-controls"><button onClick={()=>void toggleMusic()} aria-pressed={music}>{music?<VolumeX size={17}/>:<Music2 size={17}/>}<span>{music?'Music off':'Christmas music'}</span></button><button onClick={()=>setPaused(v=>!v)} aria-pressed={paused} aria-label={paused?'Play Christmas animations':'Pause Christmas animations'}>{paused?<Play size={17}/>:<Pause size={17}/>}</button></div>
  <div className="santa-welcome-copy">
   <h1 className="santa-title-entrance"><img src="/game-night/santa-welcome-title.webp" alt="Secret Santa" width={1100} height={367}/><span className="santa-title-sparkle sparkle-one" aria-hidden="true">✦</span><span className="santa-title-sparkle sparkle-two" aria-hidden="true">✧</span><span className="santa-title-sparkle sparkle-three" aria-hidden="true">✦</span></h1>
   <div className="santa-gold-ribbon"><span aria-hidden="true"><Gift/></span><h2>Gift Exchange</h2><span aria-hidden="true"><Gift/></span></div>
  </div>
  <div className="santa-welcome-start"><button onClick={onStart}><Gift className="santa-bouncing-gift" aria-hidden="true"/><span>Start Secret Santa</span><ArrowRight aria-hidden="true"/></button><small>A little Christmas magic, just for your people.</small>{onBrowse&&<button className="santa-browse-exchanges" onClick={onBrowse}>My Exchanges →</button>}</div>
 </section>;
}

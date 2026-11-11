import {useEffect,useState,type CSSProperties,type RefObject} from 'react';
import {ArrowRight,Gift,Music2,Pause,Play,VolumeX} from 'lucide-react';
import {SecretSanta} from './SecretSanta';
import {santaApi} from '../online/santa';

export function SantaExperience({accountId,onLogin,onHome,introAudio}:{accountId:string;introAudio:RefObject<HTMLAudioElement|null>;onLogin:()=>void;onHome?:()=>void}) {
 const directInvite=/^[A-Za-z0-9_-]{43}$/.test(new URLSearchParams(location.search).get('santa')||'');
 const [newExchange,setNewExchange]=useState(false),[initialExchangeId,setInitialExchangeId]=useState('');
 const [started,setStarted]=useState(directInvite),[checking,setChecking]=useState(accountId!=='guest'&&!directInvite),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{if(accountId==='guest'||directInvite)return;let alive=true;setChecking(true);setError('');
  santaApi.list().then(groups=>{if(alive){setInitialExchangeId(groups.length===1?groups[0].id:'');setStarted(groups.length>0);}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setChecking(false);});return()=>{alive=false;};
 },[accountId,directInvite,retry]);
 useEffect(()=>{
  if(started||error)introAudio.current?.pause();
 },[started,error,introAudio]);
 if(checking)return <section className="santa-account-prompt" role="status">Finding your Secret Santa exchanges…</section>;
 if(error)return <section className="santa-account-prompt"><p role="alert">{error}</p><button className="santa-primary" onClick={()=>setRetry(v=>v+1)}>Try again</button></section>;
 if(!started)return <SantaWelcome introAudio={introAudio} onBrowse={()=>{setNewExchange(false);setInitialExchangeId('');setStarted(true);window.scrollTo({top:0});}} onStart={()=>{setNewExchange(true);setInitialExchangeId('');setStarted(true);window.scrollTo({top:0});}}/>;
 return <>{accountId==='guest'?<section className="santa-account-prompt"><h1>Join your Secret Santa 🎁</h1><p>Log in or create your own account to keep your gift assignment private.</p><button className="santa-primary" onClick={onLogin}>Log in or sign up</button></section>:<SecretSanta accountId={accountId} initialCreate={newExchange} initialExchangeId={initialExchangeId} onHome={onHome}/>}</>;
}

export function SantaWelcome({onStart,onBrowse,introAudio}:{onStart:()=>void;onBrowse?:()=>void;introAudio:RefObject<HTMLAudioElement|null>}) {
 const [music,setMusic]=useState(false),[paused,setPaused]=useState(false);
 const toggleMusic=()=>{
  const player=introAudio.current;
  if(!player)return;
  if(player.paused)void player.play().catch(()=>setMusic(false));
  else player.pause();
 };
 useEffect(()=>{
  const player=introAudio.current;
  if(!player)return;
  const pauseWhenHidden=()=>{if(document.hidden)player.pause();};
  const updateMusic=()=>setMusic(!player.paused&&!player.error);
  const events=['play','pause','error'];
  events.forEach(event=>player.addEventListener(event,updateMusic));
  updateMusic();
  document.addEventListener('visibilitychange',pauseWhenHidden);
  return ()=>{
   player.pause();
   events.forEach(event=>player.removeEventListener(event,updateMusic));
   document.removeEventListener('visibilitychange',pauseWhenHidden);
  };
 },[introAudio]);
 return <section className={`santa-welcome${paused?' santa-motion-paused':''}`} aria-label="Secret Santa Christmas welcome">
  <img className="santa-welcome-scene" src="/game-night/santa-welcome-scene.webp" width={1024} height={1536} alt="" fetchPriority="high"/>
  <div className="santa-welcome-weather" aria-hidden="true">
   {Array.from({length:42},(_,i)=><i className="santa-snow" key={i} style={{'--x':`${(i*37+11)%100}%`,'--delay':`${-((i*7)%17)}s`,'--duration':`${9+i%9}s`,'--size':`${2+i%4}px`,'--drift':`${(i%2?1:-1)*(12+i%20)}px`} as CSSProperties}/>)}
   {Array.from({length:14},(_,i)=><span className="santa-falling-flake" key={`fall-${i}`} style={{'--x':`${(i*31+5)%100}%`,'--delay':`${-((i*3)%19)}s`,'--duration':`${13+i%8}s`,'--size':`${13+i%4*5}px`,'--drift':`${i%2?45:-35}px`} as CSSProperties}>❄</span>)}
   {[0,1,2,3].map(i=><span key={i} className={`santa-floating-flake flake-${i}`}>❄</span>)}
   <img className="santa-flying-sleigh" src="/game-night/santa-sleigh.webp" alt="" width={900} height={368}/>
  </div>
  <div className="santa-welcome-controls"><button onClick={()=>void toggleMusic()} aria-pressed={music}>{music?<VolumeX size={17}/>:<Music2 size={17}/>}<span>{music?'Pause music':'Play Christmas music'}</span></button><button onClick={()=>setPaused(v=>!v)} aria-pressed={paused} aria-label={paused?'Play Christmas animations':'Pause Christmas animations'}>{paused?<Play size={17}/>:<Pause size={17}/>}</button></div>
  <div className="santa-welcome-copy">
   <h1 className="santa-title-entrance"><img src="/game-night/santa-welcome-title.webp" alt="Secret Santa" width={1100} height={367}/><span className="santa-title-sparkle sparkle-one" aria-hidden="true">✦</span><span className="santa-title-sparkle sparkle-two" aria-hidden="true">✧</span><span className="santa-title-sparkle sparkle-three" aria-hidden="true">✦</span></h1>
   <div className="santa-gold-ribbon"><span aria-hidden="true"><Gift/></span><h2>Gift Exchange</h2><span aria-hidden="true"><Gift/></span></div>
  </div>
  <div className="santa-welcome-start"><button onClick={onStart}><Gift className="santa-bouncing-gift" aria-hidden="true"/><span>Start Secret Santa</span><ArrowRight aria-hidden="true"/></button><small>A little Christmas magic, just for your people.</small>{onBrowse&&<button className="santa-browse-exchanges" onClick={onBrowse}>My Exchanges →</button>}</div>
 </section>;
}

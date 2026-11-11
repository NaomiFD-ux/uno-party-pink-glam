import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {santaLettersAt,SANTA_NAME_START_SECONDS} from '../utils/santaReveal';
/** Blank-card video + live name from the authenticated saved /reveal response. Replay never redraws. */
export function SantaNameReveal({name,onWishlist,onKeepSecret,onViewed}:{name:string;onWishlist:()=>void;onKeepSecret:()=>void;onViewed?:()=>void}){
 const [reducedMotion]=useState(()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 const viewedSent=useRef(false);
 const nameBox=useRef<HTMLDivElement>(null),measure=useRef<HTMLSpanElement>(null),[nameFont,setNameFont]=useState(0);
 const dialog=useRef<HTMLDialogElement>(null),video=useRef<HTMLVideoElement>(null);
 const [letters,setLetters]=useState(0),[final,setFinal]=useState(false),[nameVisible,setNameVisible]=useState(false),[replay,setReplay]=useState(0),[muted,setMuted]=useState(false),[needsPlay,setNeedsPlay]=useState(false),[videoError,setVideoError]=useState(false);
 const parts=typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(name),part=>part.segment):Array.from(name);
 useEffect(()=>{dialog.current?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';const poster=new Image();poster.src='/game-night/santa-reveal-video-poster.webp';return()=>{document.body.style.overflow=old;video.current?.pause();};},[]);
 useEffect(()=>{let alive=true;setFinal(false);setNameVisible(false);setLetters(0);setNeedsPlay(false);const element=video.current;
  if(reducedMotion||videoError){element?.pause();setFinal(true);setNameVisible(true);setLetters(parts.length);return;}
  if(element){element.currentTime=0;void document.fonts.load('60px "Santa Script"').catch(()=>{});void element.play().catch(()=>{if(alive)setNeedsPlay(true);});}return()=>{alive=false;};
 },[replay,videoError,name]);
 useEffect(()=>{const element=video.current;if(!element)return;let frame=0,alive=true;
  const sync=(time:number)=>{if(element.seeking||element.currentTime<SANTA_NAME_START_SECONDS)return;const count=santaLettersAt(time,parts.length);if(count){setNameVisible(true);setLetters(count);}};
  const update=()=>sync(element.currentTime);element.addEventListener('timeupdate',update);element.addEventListener('seeked',update);
  const next=(_time:number,metadata:VideoFrameCallbackMetadata)=>{if(!alive)return;sync(metadata.mediaTime);frame=element.requestVideoFrameCallback(next);};
  if(typeof element.requestVideoFrameCallback==='function')frame=element.requestVideoFrameCallback(next);
  return()=>{alive=false;element.removeEventListener('timeupdate',update);element.removeEventListener('seeked',update);if(frame&&typeof element.cancelVideoFrameCallback==='function')element.cancelVideoFrameCallback(frame);};
 },[name,replay]);
 useLayoutEffect(()=>{let alive=true;const box=nameBox.current,probe=measure.current;if(!box||!probe)return;
  const fit=()=>{if(!alive)return;const style=getComputedStyle(box),width=box.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-2,height=box.clientHeight-4,stage=box.parentElement!.clientWidth;if(width<=0||height<=0)return;let size=stage*.13;const minimum=stage*.035;probe.style.width=width+'px';for(;size>minimum;size-=.5){probe.style.fontSize=size+'px';if(probe.scrollWidth<=width+1&&probe.scrollHeight<=height)break;}setNameFont(Math.max(minimum,size));};
  fit();void document.fonts.load('60px "Santa Script"').catch(()=>{}).then(fit);const observer=new ResizeObserver(fit);observer.observe(box);return()=>{alive=false;observer.disconnect();};
 },[name]);
 useEffect(()=>{if(final&&letters>=parts.length&&!viewedSent.current){viewedSent.current=true;onViewed?.();}},[final,letters,name,onViewed]);
 const finish=()=>{video.current?.pause();setFinal(true);setNameVisible(true);setLetters(parts.length);setNeedsPlay(false);};
 const play=()=>{void video.current?.play().then(()=>setNeedsPlay(false)).catch(()=>setNeedsPlay(true));};
 return <dialog ref={dialog} className="santa-name-dialog santa-video-dialog" aria-label="Your private Secret Santa assignment" onCancel={event=>{event.preventDefault();onKeepSecret();}}><div className="santa-name-stage santa-video-stage">
  <video ref={video} src="/game-night/santa-reveal.mp4" poster="/game-night/santa-reveal-video-poster.webp" preload="auto" autoPlay={!reducedMotion} muted={muted} playsInline disablePictureInPicture controlsList="nodownload noremoteplayback" onEnded={finish} onError={()=>{setVideoError(true);finish();}} aria-label="Christmas gift opening animation"/>
  {final&&<img className="santa-video-final-frame" src="/game-night/santa-reveal-video-poster.webp" alt="" width={720} height={1280}/>}
  <div ref={nameBox} className="santa-live-name santa-video-name" style={{fontSize:nameFont?`${nameFont}px`:'13cqw',visibility:nameVisible?'visible':'hidden'}} aria-hidden={!nameVisible}><span className="santa-typed-name" aria-hidden="true">{parts.slice(0,letters).join('')}</span><span ref={measure} className="santa-name-fit-probe" aria-hidden="true">{name}</span>{nameVisible&&<h2 className="gift-accessible-title">You’re shopping for {name}</h2>}</div>

  {nameVisible&&<><button className="santa-art-button santa-video-wishlist" aria-label="View their wishlist" onClick={onWishlist}/><button className="santa-art-button santa-video-secret" aria-label="Keep it a secret" onClick={onKeepSecret}/></>}
  <span className="santa-video-corner-badge" aria-hidden="true">Game Night ♡</span>
  <p className="gift-accessible-title" role="status">{nameVisible&&letters>=parts.length?`Your secret recipient is ${name}.`:nameVisible?'Revealing your saved recipient':'Your Christmas gift is opening.'}</p>
  {needsPlay&&!final&&<button className="santa-reveal-play" onClick={play}>Play reveal with sound</button>}
  <div className="santa-video-controls"><button className="santa-art-replay" onClick={()=>setReplay(v=>v+1)}>Replay full reveal</button>{!final&&<button className="santa-video-skip" onClick={finish}>Skip</button>}<button className="santa-video-sound" aria-pressed={!muted} onClick={()=>setMuted(value=>!value)}>{muted?'Sound on':'Mute'}</button></div><button className="santa-art-close" aria-label="Close private assignment" onClick={onKeepSecret}>×</button>
 </div></dialog>;
}

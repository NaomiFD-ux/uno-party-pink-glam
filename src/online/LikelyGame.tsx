import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {LogOut,Settings,Send,Volume2,VolumeX,X} from 'lucide-react';
import type {RoomMessage,RoomView} from './protocol';
import {ChatButton} from '../components/ChatButton';
import {ChatHistory} from '../components/ChatHistory';
import {VoiceRecorder} from '../components/VoiceRecorder';
import {VoiceBubble} from '../components/VoiceBubble';
import {EchoEffect} from '../components/EchoEffect';
import {animateProfileSlap} from '../utils/slap';
import {soundFX} from '../utils/audio';
export function LikelyGame({room,send,onSettings,connected}:{room:RoomView;send:(type:string,payload?:unknown)=>Promise<void>;onSettings:()=>void;connected:boolean}){
 const game=room.party!,host=room.hostId===room.you,root=useRef<HTMLElement>(null),last=useRef('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[leaving,setLeaving]=useState(false),[muted,setMuted]=useState(soundFX.getMuted());
 const [composer,setComposer]=useState(false),[history,setHistory]=useState(false),[draft,setDraft]=useState(''),[effect,setEffect]=useState<'normal'|'slam'|'echo'>('normal');
 const [bubble,setBubble]=useState<RoomMessage|null>(null),[voices,setVoices]=useState<RoomMessage[]>([]),[echo,setEcho]=useState<RoomMessage|null>(null);
 const [viewport,setViewport]=useState({top:0,height:window.innerHeight});
 const voice=voices[0];
 useLayoutEffect(()=>{if(!composer)return;const update=()=>setViewport({top:window.visualViewport?.offsetTop||0,height:window.visualViewport?.height||window.innerHeight});update();window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update);return()=>{window.visualViewport?.removeEventListener('resize',update);window.visualViewport?.removeEventListener('scroll',update);};},[composer]);
 useEffect(()=>{const message=room.message;if(!message||last.current===message.id||Date.now()-message.at>5000)return;last.current=message.id;
  if(message.slap&&root.current){return animateProfileSlap(root.current,message.slap.targetId);}
  if(message.voice){setVoices(old=>[...old,message].slice(0,10));return;}
  setBubble(message);soundFX.playTap();if(message.effect==='echo')setEcho(message);
  if(message.effect==='slam'&&root.current&&!matchMedia('(prefers-reduced-motion:reduce)').matches){root.current.animate([{translate:'0 0'},{translate:'-7px 4px'},{translate:'7px -4px'},{translate:'-4px 2px'},{translate:'0 0'}],{duration:500});}
 },[room.message?.id]);
 useEffect(()=>{if(!bubble)return;const timer=setTimeout(()=>setBubble(null),5000);return()=>clearTimeout(timer);},[bubble?.id]);
 useEffect(()=>{if(!echo)return;const timer=setTimeout(()=>setEcho(null),5100);return()=>clearTimeout(timer);},[echo?.id]);
 useEffect(()=>{setVoices(old=>old.filter(m=>room.seats.some(s=>s.id===m.senderId)));},[room.seats.map(s=>s.id).join(',')]);
 async function action(type:string,payload:Record<string,unknown>={}){setBusy(true);setError('');try{await send(type,{questionId:game.questionId,...payload});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function message(text:string){if(!text.trim())return;try{await send('message',{text:text.trim().slice(0,120),effect});setDraft('');setEffect('normal');setComposer(false);}catch(e){setError((e as Error).message);}}
 const submitted=game.submitted.includes(room.you),counts=Object.values(game.results),highest=Math.max(0,...counts),winners=room.seats.filter(s=>highest>0&&game.results[s.id]===highest);
 const sorted=[...room.seats].sort((a,b)=>(game.totals[b.id]||0)-(game.totals[a.id]||0));
 return <section ref={root} className="likely-game" onPointerDownCapture={()=>soundFX.unlockVoiceAudio()}>
  <header className="likely-toolbar"><button aria-label="Leave game" title="Leave game" onClick={()=>setLeaving(true)}><LogOut size={20}/></button><span>👀 Who’s Most Likely To…</span><div><button aria-label={muted?'Unmute sound':'Mute sound'} onClick={()=>setMuted(soundFX.toggleMute())}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button><button aria-label="Settings" onClick={onSettings}><Settings size={20}/></button></div></header>
  {!connected&&<p className="likely-notice" role="status">Reconnecting… your vote is saved.</p>}
  <div className="likely-round"><span>{game.phase==='finished'?'THAT’S A WRAP ✨':`QUESTION ${game.number} OF ${game.total}`}</span><div aria-label={`Question ${game.number} of ${game.total}`}>{Array.from({length:game.total},(_,i)=><i key={i} className={i<game.number?'filled':''}/>)}</div></div>
  <div className="likely-question" key={game.questionId+game.phase}><span className="likely-kicker">{game.phase==='finished'?'THE GROUP HAS SPOKEN':game.phase==='vote'?'NO PEEKING 👀':game.skipped?'ON TO THE NEXT ONE':'THE GROUP CHAT VERDICT'}</span><h1>{game.phase==='finished'?'Your night in the spotlight':game.question}</h1><p>{game.phase==='vote'?submitted?'Your vote is locked in. Waiting for the group…':'Pick your person. Your vote stays secret until the reveal.':game.phase==='finished'?'Questions answered. Friendships hopefully intact. 😂':game.skipped?'Question skipped. Nobody gets a spotlight.':winners.length?`${winners.map(s=>s.name).join(' & ')} ${winners.length>1?'share the spotlight!':'takes the spotlight!'}`:'Everyone passed this one.'}</p></div>
  {game.phase==='vote'&&<p className="likely-vote-progress" role="status">{game.submitted.filter(id=>room.seats.some(s=>s.id===id)).length} / {room.seats.length} votes locked in <span>🔒 Secret ballot</span></p>}
  <div className="likely-players">{(game.phase==='finished'?sorted:room.seats).map((person,index)=>{
   const chosen=game.yourVote===person.id,reveal=game.phase==='reveal'&&!game.skipped,spotlight=reveal&&highest>0&&game.results[person.id]===highest;
   return <article key={person.id} data-player-id={person.id} className={`likely-player ${chosen&&game.phase==='vote'?'your-choice':''} ${spotlight?'in-spotlight':''}`} style={{animationDelay:`${index*60}ms`}}>
    {voice?.senderId===person.id&&voice.voice?<div className="likely-player-bubble voice-bubble"><VoiceBubble key={voice.id} url={voice.voice.url} duration={voice.voice.duration} name={person.name} onDone={()=>setVoices(old=>old.filter(m=>m.id!==voice.id))}/></div>:bubble?.senderId===person.id?<div className="likely-player-bubble">{bubble.text}</div>:null}
    <button data-slap-avatar className="likely-avatar" aria-label={person.id===room.you?'Your profile':`Slap ${person.name}'s profile`} title={person.id===room.you?'You':`Tap to slap ${person.name} 👋`} disabled={person.id===room.you||game.phase==='finished'} onClick={()=>void send('slap',{targetId:person.id}).catch(e=>setError((e as Error).message))}><img src={person.avatar||'/default-avatar.svg'} alt=""/>{spotlight&&<span>👑</span>}</button>
    <strong>{person.name}{person.id===room.you&&<small> (You)</small>}</strong>
    {game.phase==='vote'?<><span className="likely-vote-status">{game.submitted.includes(person.id)?'✓ Vote in':person.connected?'Thinking…':'Reconnecting…'}</span><button className="likely-vote-button" disabled={submitted||busy||!connected} onClick={()=>action('likely-vote',{targetId:person.id})}>{submitted?chosen?'Your pick ✓':'Vote locked':`Vote for ${person.name}`}</button></>:<div className="likely-tally"><b>{game.phase==='finished'?game.totals[person.id]||0:game.results[person.id]||0}</b><span>{game.phase==='finished'?'spotlights':'votes'}</span></div>}
   </article>;
  })}</div>
  {error&&<p className="likely-notice" role="alert">{error}<button aria-label="Dismiss message" onClick={()=>setError('')}>×</button></p>}
  <footer className="likely-actions"><div className="likely-chat-control"><ChatButton expanded={composer||history} onCompose={()=>setComposer(!composer)} onHistory={()=>{setComposer(false);setHistory(true);}}/><span>Tap to chat · Hold for history</span></div>
   {game.phase==='vote'&&!submitted&&<button className="likely-pass" disabled={busy||!connected} onClick={()=>action('likely-vote',{targetId:null})}>Pass this question</button>}
   {host?<div className="likely-host-actions">{game.phase==='vote'?<><button className="uno-secondary" disabled={busy||!connected} onClick={()=>action('likely-skip')}>Skip question</button><button className="uno-primary" disabled={busy||!connected||game.submitted.length===0} onClick={()=>action('likely-reveal')}>Reveal votes</button></>:game.phase==='reveal'?<button className="uno-primary" disabled={busy||!connected} onClick={()=>action('likely-next')}>{game.number===game.total?'See the recap ✨':'Next question →'}</button>:<button className="uno-primary" disabled={busy||!connected} onClick={()=>action('likely-lobby')}>Back to game night</button>}{game.phase!=='finished'&&<button className="text-button" disabled={busy||!connected} onClick={()=>action('likely-end')}>Finish game</button>}</div>:<p className="likely-waiting-host">{game.phase==='vote'?'The reveal happens when everyone votes.':'Waiting for the host…'}</p>}
  </footer>
  {history&&createPortal(<ChatHistory messages={room.messages||[]} seats={room.seats} selfId={room.you} onClose={()=>setHistory(false)}/>,document.body)}
  {composer&&createPortal(<div className="chat-compose-overlay" style={{top:viewport.top,height:viewport.height}} onPointerDown={e=>{if(e.target===e.currentTarget)setComposer(false);}}><section className="game-chat-composer" role="dialog" aria-modal="true" aria-label="Say something" onKeyDown={e=>{if(e.key==='Escape')setComposer(false);}}><div className="chat-composer-heading"><strong>Say something</strong><button onClick={()=>{setComposer(false);setHistory(true);}}>History</button><button aria-label="Close chat" onClick={()=>setComposer(false)}><X size={18}/></button></div><div className="chat-emoji-options">{['😂','😭','👀','🔥','💅','❤️','😡','🖕'].map(emoji=><button key={emoji} onClick={()=>message(emoji)}>{emoji}</button>)}</div><div className="send-effect-options">{(['normal','slam','echo'] as const).map(value=><button key={value} aria-pressed={effect===value} onClick={()=>setEffect(value)}>{value==='normal'?'Normal':value==='slam'?'💥 Slam':'✨ Echo'}</button>)}</div><form onSubmit={e=>{e.preventDefault();void message(draft);}}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={120} aria-label="Your message" placeholder="Message or any emoji…" autoComplete="off" enterKeyHint="send"/><VoiceRecorder onSend={async(audio,duration)=>{await send('voice',{audio,duration});setComposer(false);}}/><button type="submit" disabled={!draft.trim()} aria-label="Send message"><Send size={18}/></button></form></section></div>,document.body)}
  {leaving&&createPortal(<div className="chat-compose-overlay" style={{inset:0}}><section className="game-chat-composer" role="dialog" aria-modal="true" aria-label="Leave game"><h2>Heading out?</h2><p>Your friends can keep playing.</p><div className="likely-host-actions"><button className="uno-secondary" onClick={()=>setLeaving(false)}>Stay</button><button className="uno-primary" onClick={()=>action('leave')}>Leave game</button></div></section></div>,document.body)}
  {echo&&<EchoEffect key={echo.id} text={echo.text}/>}
 </section>;
}

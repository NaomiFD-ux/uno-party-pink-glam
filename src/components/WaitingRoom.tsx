import { useState } from 'react';
import { ArrowLeft, Copy, Check, Play, UserPlus } from 'lucide-react';
import { BOT_PERSONALITIES } from '../utils/deck';
import { UserProfile } from '../types/game';
export function WaitingRoom({profile,tableName,onStart,onLeave}:{profile:UserProfile;tableName:string;onStart:()=>void;onLeave:()=>void}) {
  const [ready,setReady] = useState(false); const [copied,setCopied] = useState(false);
  const [notice,setNotice] = useState('');
  const [code] = useState(()=>crypto.randomUUID().replaceAll('-','').slice(0,6).toUpperCase());
  async function copy(link = false) {
    const value = link ? `${location.origin}/?room=${code}` : code;
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(()=>setCopied(false),2500);
      if(link) setNotice('Preview link copied. Online room joining is not connected yet.');
    } catch {setNotice(value);}
  }
  return <section className="waiting-room">
    <button className="text-button back-link" onClick={onLeave}><ArrowLeft size={18}/> Back to lounge</button>
    <div className="room-summary table-banner"><div className="table-banner-info"><span className="room-count">● {BOT_PERSONALITIES.length+1} / {BOT_PERSONALITIES.length+1} Players</span><h1>✨ {tableName}</h1><p>Host: <strong>{profile.username}</strong></p></div><div className="room-code"><div><span className="room-code-label">ROOM CODE</span><b>{code}</b></div><div className="room-copy-actions"><button onClick={()=>copy()}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copied':'Copy Code'}</button><button className="copy-room-link" onClick={()=>copy(true)}>Copy Link</button></div></div></div>
    <div className="players-heading"><h2>Table Seats <small>{BOT_PERSONALITIES.length+1}/{BOT_PERSONALITIES.length+1}</small></h2><button className="text-button" onClick={()=>setNotice('This table is a local practice room with four bots. Friend invitations will be available when online multiplayer is connected.')}><UserPlus size={19}/> Invite Friends</button></div>
    <div className="waiting-players">{[{name:profile.username,avatar:profile.avatar,host:true},...BOT_PERSONALITIES.map(b=>({...b,host:false}))].map((p,index)=>{
      const isReady = !p.host || ready;
      const content = <><span className="seat-number">#{index+1}</span>{p.host && <span className="seat-host-badge">♛ HOST</span>}<div className="waiting-avatar"><img src={p.avatar} alt=""/>{isReady && <span className="avatar-ready-check" aria-label="Ready"><Check size={14} strokeWidth={3}/></span>}</div><span className="waiting-player-name">{p.name}{p.host?' (You)':''}</span>{!p.host && <small className="bot-label">Bot</small>}<span className={`ready-pill ${isReady?'is-ready':'not-ready'}`}>{isReady?'✓ Ready':'◷ Not Ready'}</span></>;
      return <article key={index} className={`${isReady?'player-ready':''} ${p.host?'your-player-box':''}`}>{p.host?<button type="button" className="player-ready-toggle" aria-label={`Your status: ${ready?'Ready':'Not Ready'}`} aria-pressed={ready} onClick={()=>setReady(value=>!value)}>{content}</button>:content}</article>;
    })}</div>
    {notice && <p className="room-notice" role="status">{notice}</p>}
    <p className="ready-status">● {ready?'Everyone’s ready. Let’s deal!':'Waiting for you to get ready…'}</p>
    <button disabled={!ready} className="uno-primary" onClick={onStart}><Play size={20}/> Start Game</button>
    <button className="leave-room" onClick={onLeave}>Leave Room</button>
    <p className="local-account-note">Practice room · you + 4 bots · no online players</p>
  </section>;
}

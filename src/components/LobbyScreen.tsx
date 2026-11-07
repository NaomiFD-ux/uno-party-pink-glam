import { Dashboard } from './Dashboard';
import { JoinGameModal } from './JoinGameModal';
import { useState, FormEvent } from 'react';
import { Plus, KeyRound, X } from 'lucide-react';
import { GameSettings, UserProfile } from '../types/game';
interface Props { profile:UserProfile;onProfile:()=>void; settings:GameSettings;onUpdateSettings:(s:Partial<GameSettings>)=>void;onJoinTable:(name:string,practice?:boolean,hand?:number)=>void;onJoinCode?:(code:string)=>Promise<void>; }
export function LobbyScreen({profile,onProfile,settings,onUpdateSettings,onJoinTable,onJoinCode}:Props) {
  const [practice,setPractice]=useState(false);
  const [creating,setCreating] = useState(false); const [joining,setJoining] = useState(false);
  const [name,setName] = useState('Game Night'); const [timer,setTimer] = useState(settings.turnTimeoutSeconds);
  const [hand,setHand] = useState(settings.initialHandSize); const [notice,setNotice] = useState('');
  function create(e:FormEvent) {e.preventDefault();onUpdateSettings({turnTimeoutSeconds:timer,initialHandSize:hand});setCreating(false);onJoinTable(name.trim()||'Game Night',practice,hand);}
  return <section className="home-games dashboard-page"><section className="dashboard-hero"><div className="dashboard-identity"><button className="dashboard-avatar" aria-label="View your profile" onClick={onProfile}><img src={profile.avatar} alt=""/></button><div><h1>Welcome back, {profile.username}! <span>✨</span></h1><p>Ready for your next game night?</p></div></div><div className="dashboard-room-actions"><button className="uno-primary" onClick={()=>setCreating(true)}><Plus size={18}/> Create Room</button><button className="uno-secondary" onClick={()=>{setJoining(true);setNotice('');}}><KeyRound size={17}/> Join with Code</button></div></section><Dashboard profile={profile} onProfile={onProfile}/>

    {creating && <div className="clean-modal-backdrop"><section className="clean-modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><button className="modal-close" aria-label="Close create game" onClick={()=>setCreating(false)}><X/></button><h2 id="create-title">Create Game</h2><form onSubmit={create}><label>Game name<input required maxLength={40} value={name} onChange={e=>setName(e.target.value)}/></label><label>Starting hand<select value={hand} onChange={e=>setHand(Number(e.target.value))}><option value={5}>5 cards</option><option value={7}>7 cards</option><option value={9}>9 cards</option></select></label><label>Play with<select value={practice?'bots':'friends'} onChange={e=>setPractice(e.target.value==='bots')}><option value="friends">Friends · room code</option><option value="bots">Practice · 4 bots</option></select></label><button className="uno-primary">Create Game</button></form></section></div>}
    {joining && <JoinGameModal onJoin={onJoinCode} onClose={()=>setJoining(false)} onHost={()=>{setJoining(false);setCreating(true);}}/>}
  </section>;
}

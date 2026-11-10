import {CreateRoomModal} from './CreateRoomModal';
import {JoinGameModal} from './JoinGameModal';
import {useState,type FormEvent} from 'react';
import {Plus,KeyRound,Gamepad2,ArrowRight,Users,History,Sparkles} from 'lucide-react';
import type {GameSettings,UserProfile} from '../types/game';
import {historyDate} from '../utils/history';
type GameMode='uno'|'likely'|'pool';
interface Props {onSanta:()=>void;profile:UserProfile;onProfile:()=>void;onHistory:()=>void;onGames:()=>void;view?:'home'|'games';settings:GameSettings;onUpdateSettings:(s:Partial<GameSettings>)=>void;onJoinTable:(name:string,practice?:boolean,hand?:number,game?:GameMode)=>void;onJoinCode?:(code:string)=>Promise<void>;}
const games=[
 {id:'uno',name:'UNO',image:'uno',tone:'rose',players:'2–10',live:true},
 {id:'likely',name:'Who’s Most Likely To…',image:'likely',tone:'lilac',players:'2–10',live:true},
 {id:'pool',name:'Pool ♡',image:'pool',tone:'rose',players:'3',live:true},
 {id:'spades',name:'Spades',image:'spades',tone:'lilac',players:'2–4',live:false},
 {id:'dominoes',name:'Dominoes',image:'dominoes',tone:'peach',players:'2–4',live:false},
 {id:'ludo',name:'Ludo',image:'ludo',tone:'rose',players:'2–4',live:false},
 {id:'trivia',name:'Friend Group Trivia',image:'trivia',tone:'peach',players:'2–10',live:false},
];
export function LobbyScreen({onSanta,profile,onProfile,onHistory,onGames,view='home',settings,onUpdateSettings,onJoinTable,onJoinCode}:Props){
 const [practice,setPractice]=useState(false),[creating,setCreating]=useState(false),[joining,setJoining]=useState(false),[selected,setSelected]=useState<GameMode>('uno');
 const [name,setName]=useState('Game Night'),[hand,setHand]=useState(settings.initialHandSize);
 const latest=profile.matchHistory[0];
 function openCreate(game:GameMode='uno'){setSelected(game);if(game==='likely')setPractice(false);setCreating(true);}
 function create(event:FormEvent){event.preventDefault();onUpdateSettings({initialHandSize:hand});setCreating(false);onJoinTable(name.trim()||'Game Night',selected!=='likely'&&practice,hand,selected);}
 return <section className="night-dashboard">
  {view==='home'&&<><h1 className="night-greeting">Hey, {profile.username}!</h1><button className="santa-dashboard-hero" onClick={onSanta} aria-label="Open Secret Santa gift exchange"><img src="/game-night/secret-santa-banner.webp" width={2172} height={724} alt="Secret Santa · Gift Exchange" fetchPriority="high"/></button></>}
  <section className="night-catalog" aria-label="Games"><div className="night-section-heading"><h2><Gamepad2/>{view==='home'?'Pick your game':'Your game night lineup'}</h2>{view==='home'&&<button onClick={onGames}>View all <ArrowRight size={20}/></button>}</div><div className="night-game-grid">{games.map(game=><article key={game.id} className={`night-game-card ${game.tone}`}><img className="night-game-art" src={`/game-night/${game.image}.webp`} alt=""/><h3>{game.name}</h3><p><Users size={14}/> Multiplayer · {game.players} players</p>{game.live?<button className="night-play" onClick={()=>openCreate(game.id as GameMode)}>Play now</button>:<span className="night-coming">Coming soon</span>}</article>)}</div></section>
  {view==='home'&&<><section className="night-stats" aria-label="Your UNO round statistics"><h2>Your stats <Sparkles size={18}/></h2>{[{value:profile.gamesPlayed,label:'Played'},{value:profile.wins,label:'Wins'},{value:profile.bestStreak,label:'Best streak'}].map(stat=><div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</section><section className="night-recent"><div className="night-section-heading"><h2><History/>Recently played</h2></div>{latest?<button className="night-recent-row" onClick={onHistory}><span className="night-recent-art"><img src="/game-night/uno.webp" alt="UNO"/></span><span className="night-recent-info"><strong>{latest.tableName}</strong><small>Last played {historyDate(latest.date)}</small></span><span className="night-recent-view">View <ArrowRight size={20}/></span></button>:<div className="night-recent-empty"><span>Your first game night is waiting.</span><button onClick={onGames}>Pick a game <ArrowRight size={18}/></button></div>}</section></>}
  {view==='home'&&<section className="night-hero night-hero-bottom" aria-label="Your next game night"><div className="night-hero-copy"><h2>Good friends.<br/>Great games.<span aria-hidden="true">✦</span></h2><p>Your next game night starts here.</p></div><div className="night-hero-actions"><button onClick={()=>openCreate()}><Plus size={23}/>Create Room</button><button onClick={()=>setJoining(true)}><KeyRound size={23}/>Join with Code</button></div></section>}
  {creating&&<CreateRoomModal game={selected} onGame={setSelected} name={name} onName={setName} hand={hand} onHand={setHand} practice={practice} onPractice={setPractice} onClose={()=>setCreating(false)} onCreate={create}/>}
  {joining&&<JoinGameModal onJoin={onJoinCode} onClose={()=>setJoining(false)} onHost={()=>{setJoining(false);openCreate();}}/>}
 </section>;
}


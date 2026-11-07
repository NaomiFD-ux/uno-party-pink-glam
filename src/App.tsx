import { useState, useEffect, useRef } from 'react';
import { UserProfile, GameSettings } from './types/game';
import { Header, AppTab } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { GameTable } from './components/GameTable';
import { LobbyScreen } from './components/LobbyScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AuthScreen } from './components/AuthScreen';
import { WaitingRoom } from './components/WaitingRoom';
import {GameConnection} from './online/client';
import {OnlineWaitingRoom} from './online/OnlineWaitingRoom';
import {remoteProfile,saveRemoteProfile,restoreAccount} from './online/api';
import { readSession, saveSession, clearSession,signOut } from './utils/accounts';
const DEFAULT_PROFILE: UserProfile = {
  id:'guest', username:'Guest', bio:'',
  avatar:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  gamesPlayed:0,wins:0,winStreak:0,bestStreak:0,totalWilds:0,matchHistory:[],
};
const DEFAULT_SETTINGS:GameSettings = {tableFelt:'berry',cardBack:'pink_star',stackDraws:false,jumpIn:false,turnTimeoutSeconds:15,initialHandSize:7};
function loadProfile(id:string,name:string) {try {const saved=JSON.parse(localStorage.getItem(`uno_profile_${id}`)||'null');return saved?{...DEFAULT_PROFILE,...saved}:{...DEFAULT_PROFILE,id,username:name};} catch {return {...DEFAULT_PROFILE,id,username:name};}}
export default function App() {
  const [session,setSession] = useState(readSession);
  const [connection,setConnection]=useState<GameConnection|null>(null),[,redraw]=useState(0),[onlineError,setOnlineError]=useState('');
  const previousRoom=useRef(''),previousRound=useRef(''),inviteAttempt=useRef('');

  const [profile,setProfile] = useState<UserProfile>(()=>{const user=readSession();return loadProfile(user?.id||'guest',user?.name||'Guest');});
  const [settings,setSettings] = useState<GameSettings>(()=>{try {return {...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem('glam_game_settings')||'{}')};}catch{return DEFAULT_SETTINGS;}});
  const [currentTab,setCurrentTab] = useState<AppTab>('lobby');
  const [previousTab,setPreviousTab] = useState<AppTab>('lobby');
  const [roomOpen,setRoomOpen] = useState(false); const [matchActive,setMatchActive] = useState(false); const [matchKey,setMatchKey] = useState(0);
  const [matchSettings,setMatchSettings] = useState(settings);
  const [tableName,setTableName] = useState('Game Night');
  useEffect(()=>{if(session)localStorage.setItem(`uno_profile_${session.id}`,JSON.stringify(profile));},[profile,session]);
  useEffect(()=>{localStorage.setItem('glam_game_settings',JSON.stringify(settings));},[settings]);
  useEffect(()=>{if(!session||session.id==='guest'){setConnection(null);return;}const c=new GameConnection({id:session.id,name:profile.username,avatar:profile.avatar});setConnection(c);const unsubscribe=c.subscribe(()=>{redraw(n=>n+1);const r=c.room;
    if(r){if(r.round&&previousRound.current!==r.round.id){previousRound.current=r.round.id;setCurrentTab('table');setRoomOpen(false);}else if(!r.round&&previousRoom.current!==r.code){setCurrentTab('lobby');setRoomOpen(false);}previousRoom.current=r.code;}
    else if(previousRoom.current){previousRoom.current='';previousRound.current='';setCurrentTab('lobby');}
    const code=new URLSearchParams(location.search).get('room')?.toUpperCase();if(c.status==='connected'&&!r&&code&&inviteAttempt.current!==code){inviteAttempt.current=code;void c.send('join',{code}).then(()=>history.replaceState({},'',location.pathname)).catch(e=>setOnlineError(e.message));}
  });return()=>{unsubscribe();c.close();previousRoom.current='';previousRound.current='';inviteAttempt.current='';};},[session?.id]);
  useEffect(()=>{if(!session||session.id==='guest')return;let cancelled=false;remoteProfile(session.id).then(p=>{if(p&&!cancelled)setProfile(prev=>({...prev,...p,avatar:p.avatar||prev.avatar}));}).catch(e=>setOnlineError(e.message));return()=>{cancelled=true;};},[session?.id,connection?.room?.round?.winner,connection?.profileVersion]);
  useEffect(()=>{let cancelled=false;restoreAccount().then(user=>{if(cancelled)return;if(user){saveSession(user,true);setSession(old=>old?.id===user.id?old:user);setProfile(prev=>prev.id===user.id?prev:{...loadProfile(user.id,user.name),...(user.avatar?{avatar:user.avatar}:{})});}else if(readSession()?.id!=='guest'){clearSession();setSession(null);}}).catch(e=>setOnlineError(e.message));const expired=()=>{clearSession();setSession(null);setOnlineError('Your session ended. Log in to return to your saved game.');};window.addEventListener('uno-session-expired',expired);return()=>{cancelled=true;window.removeEventListener('uno-session-expired',expired);};},[]);
  const sendOnline=async(type:string,payload?:unknown)=>{try{if(session?.id==='guest')throw Error('Create an account or log in to play with friends.');if(!connection)throw Error('Connecting to the table…');await connection.send(type,payload);setOnlineError('');}catch(e){setOnlineError((e as Error).message);throw e;}};
  const onlineRoom=connection?.room||null;
  const updateSettings=(s:Partial<GameSettings>)=>setSettings(prev=>({...prev,...s}));
  const openSettings=()=>{if(currentTab!=='settings')setPreviousTab(currentTab);setCurrentTab('settings');};
  const navigate=(tab:AppTab)=>{if(tab==='settings'){openSettings();return;} if(tab==='table'&&onlineRoom){setCurrentTab(onlineRoom.round?'table':'lobby');return;} if(tab==='table'&&!matchActive){setRoomOpen(true);setCurrentTab('lobby');return;} setRoomOpen(false);setCurrentTab(tab);};
  const logout=()=>{void signOut().then(()=>{setSession(null);setMatchActive(false);setRoomOpen(false);}).catch(e=>setOnlineError(e.message));};
  if(!session)return <AuthScreen onEnter={(user,remember)=>{saveSession(user,remember);setProfile({...loadProfile(user.id,user.name),...(user.avatar?{avatar:user.avatar}:{})});setSession(user);setCurrentTab('lobby');}}/>;
  return <div data-screen={currentTab} className="app-shell min-h-screen flex flex-col pb-20 md:pb-6">
    <Header currentTab={currentTab} onSelectTab={navigate} userAvatar={profile.avatar} userName={profile.username}/>
    <main className="flex-1 w-full flex flex-col">
      {onlineError&&<div className="online-notice" role="alert">{onlineError}<button aria-label="Dismiss message" onClick={()=>setOnlineError('')}>×</button></div>}
      {onlineRoom&&connection?.status!=='connected'&&<p className="online-notice" role="status">Reconnecting… your seat and cards are saved.</p>}
      {session.id==='guest'&&<p className="local-account-note online-test-note">Guest preview · create an account to play with friends</p>}
      {currentTab==='lobby'&&onlineRoom?.round&&<div className="resume-table-actions"><button className="uno-secondary resume-table" onClick={()=>setCurrentTab('table')}>Return to {onlineRoom.name}</button>{onlineRoom.round.winner&&<button className="text-button" onClick={()=>void sendOnline('leave').catch(()=>{})}>Leave Room</button>}</div>}
      {currentTab==='lobby'&&onlineRoom&&!onlineRoom.round&&<OnlineWaitingRoom room={onlineRoom} send={sendOnline} onLeave={()=>{void sendOnline('leave').catch(()=>{});}}/>}
      {onlineRoom?.round&&<div style={{display:currentTab==='table'?'contents':'none'}}><GameTable key={`online-${onlineRoom.code}`} online={{room:onlineRoom,send:sendOnline}} paused={currentTab!=='table'||connection?.status!=='connected'} tableName={onlineRoom.name} settings={{...settings,initialHandSize:onlineRoom.handSize}} userAvatar={onlineRoom.seats.find(p=>p.id===onlineRoom.you)?.avatar||profile.avatar} userName={onlineRoom.seats.find(p=>p.id===onlineRoom.you)?.name||profile.username} onMatchComplete={()=>{}} onBackToLobby={()=>setCurrentTab('lobby')} onOpenSettings={openSettings}/></div>}
      {currentTab==='lobby'&&!roomOpen&&!onlineRoom&&<LobbyScreen profile={profile} onProfile={()=>navigate('profile')} settings={settings} onUpdateSettings={updateSettings} onJoinCode={code=>sendOnline('join',{code})} onJoinTable={(name,practice,hand)=>{if(practice){setTableName(name);setRoomOpen(true);}else void sendOnline('create',{name,handSize:hand||settings.initialHandSize}).catch(()=>{});}}/>}
      {currentTab==='lobby'&&roomOpen&&<WaitingRoom profile={profile} tableName={tableName} onLeave={()=>setRoomOpen(false)} onStart={()=>{setRoomOpen(false);setMatchSettings({...settings});setMatchKey(k=>k+1);setMatchActive(true);setCurrentTab('table');}}/>}
      {matchActive&&<div style={{display:currentTab==='table'?'contents':'none'}}><GameTable key={matchKey} paused={currentTab!=='table'} tableName={tableName} settings={matchSettings} userAvatar={profile.avatar} userName={profile.username} onMatchComplete={record=>{if(session.id!=='guest')return;setProfile(prev=>{const won=record.placement===1;const streak=won?prev.winStreak+1:0;return {...prev,gamesPlayed:prev.gamesPlayed+1,wins:prev.wins+(won?1:0),winStreak:streak,bestStreak:Math.max(prev.bestStreak,streak),matchHistory:[{...record,id:`match_${Date.now()}`,date:new Date().toISOString(),tableName},...prev.matchHistory].slice(0,20)};});}} onBackToLobby={()=>{setMatchActive(false);setCurrentTab('lobby');}} onOpenSettings={openSettings}/></div>}
      {currentTab==='profile'&&<ProfileScreen profile={profile} onUpdateProfile={updates=>{if(session.id!=='guest'){void saveRemoteProfile(session.id,updates).then(()=>remoteProfile(session.id)).then(p=>p&&setProfile(prev=>({...prev,...p,avatar:p.avatar||prev.avatar}))).catch(e=>setOnlineError(e.message));}else setProfile(prev=>({...prev,...updates}));}} onLogout={logout}/>}
      {currentTab==='settings'&&<SettingsScreen onLogout={logout} settings={settings} onUpdate={updateSettings} onBack={()=>setCurrentTab(previousTab==='settings'?'lobby':previousTab)}/>}
    </main><BottomNav currentTab={currentTab} onSelectTab={navigate}/>
  </div>;
}

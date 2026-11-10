import {AngelGiftNotice} from './components/AngelGift';
import {PoolGame} from './components/PoolGame';
import {PoolWaitingRoom} from './components/PoolWaitingRoom';
import {HistoryScreen} from './components/HistoryScreen';
import {LikelyGame} from './online/LikelyGame';
import {InvitationScreen} from './components/InvitationScreen';
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
  const [invitation,setInvitation]=useState(()=>new URLSearchParams(location.search).get('invite')||'');
  const [inviteAuth,setInviteAuth]=useState(false);
  const [connection,setConnection]=useState<GameConnection|null>(null),[,redraw]=useState(0),[onlineError,setOnlineError]=useState('');
  const previousRoom=useRef(''),previousRound=useRef(''),inviteAttempt=useRef('');

  const [profile,setProfile] = useState<UserProfile>(()=>{const user=readSession();return loadProfile(user?.id||'guest',user?.name||'Guest');});
  const [settings,setSettings] = useState<GameSettings>(()=>{try {return {...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem('glam_game_settings')||'{}')};}catch{return DEFAULT_SETTINGS;}});
  const [roundFelt,setRoundFelt]=useState(settings.tableFelt);
  const [currentTab,setCurrentTab] = useState<AppTab>('lobby');
  const [previousTab,setPreviousTab] = useState<AppTab>('lobby');
  const [roomOpen,setRoomOpen] = useState(false); const [matchActive,setMatchActive] = useState(false); const [matchKey,setMatchKey] = useState(0);
  const [practiceGame,setPracticeGame]=useState<'uno'|'pool'>('uno');
  const [matchSettings,setMatchSettings] = useState(settings);
  const [tableName,setTableName] = useState('Game Night');
  useEffect(()=>{if(session)localStorage.setItem(`uno_profile_${session.id}`,JSON.stringify(profile));},[profile,session]);
  useEffect(()=>{localStorage.setItem('glam_game_settings',JSON.stringify(settings));},[settings]);
  useEffect(()=>{if(!session||session.id==='guest'){setConnection(null);return;}const c=new GameConnection({id:session.id,name:profile.username,avatar:profile.avatar});setConnection(c);const unsubscribe=c.subscribe(()=>{redraw(n=>n+1);const r=c.room;
    if(r){const activeId=r.round?.id||r.party?.id||r.pool?.id||'';if(activeId&&previousRound.current!==activeId){previousRound.current=activeId;setCurrentTab('table');setRoomOpen(false);}else if(!r.round&&!r.party&&!r.pool&&(previousRoom.current!==r.code||previousRound.current)){previousRound.current='';setCurrentTab('lobby');setRoomOpen(false);}previousRoom.current=r.code;}
    else if(previousRoom.current){previousRoom.current='';previousRound.current='';setCurrentTab('lobby');}
    const code=new URLSearchParams(location.search).get('room')?.toUpperCase();if(c.status==='connected'&&!r&&code&&!new URLSearchParams(location.search).has('invite')&&inviteAttempt.current!==code){inviteAttempt.current=code;void c.send('join',{code}).then(()=>history.replaceState({},'',location.pathname)).catch(e=>setOnlineError(e.message));}
  });return()=>{unsubscribe();c.close();previousRoom.current='';previousRound.current='';inviteAttempt.current='';};},[session?.id]);
  useEffect(()=>{if(!session||session.id==='guest')return;let cancelled=false;remoteProfile(session.id).then(p=>{if(p&&!cancelled)setProfile(prev=>({...prev,...p,avatar:p.avatar||prev.avatar}));}).catch(e=>setOnlineError(e.message));return()=>{cancelled=true;};},[session?.id,connection?.room?.round?.winner,connection?.profileVersion]);
  useEffect(()=>{let cancelled=false;restoreAccount().then(user=>{if(cancelled)return;if(user){saveSession(user,true);setSession(old=>old?.id===user.id?old:user);setProfile(prev=>prev.id===user.id?prev:{...loadProfile(user.id,user.name),...(user.avatar?{avatar:user.avatar}:{})});}else if(readSession()?.id!=='guest'){clearSession();setSession(null);}}).catch(e=>setOnlineError(e.message));const expired=()=>{clearSession();setSession(null);setOnlineError('Your session ended. Log in to return to your saved game.');};window.addEventListener('uno-session-expired',expired);return()=>{cancelled=true;window.removeEventListener('uno-session-expired',expired);};},[]);
  const sendOnline=async(type:string,payload?:unknown)=>{try{if(session?.id==='guest')throw Error('Create an account or log in to play with friends.');if(!connection)throw Error('Connecting to the table…');await connection.send(type,payload);setOnlineError('');}catch(e){setOnlineError((e as Error).message);throw e;}};
  const onlineRoom=connection?.room||null;
  useEffect(()=>{if(onlineRoom?.round?.id)setRoundFelt(settings.tableFelt);},[onlineRoom?.round?.id]);
  const updateSettings=(s:Partial<GameSettings>)=>setSettings(prev=>({...prev,...s}));
  const openSettings=()=>{if(currentTab!=='settings')setPreviousTab(currentTab);setCurrentTab('settings');};
  const navigate=(tab:AppTab)=>{if(tab==='settings'){openSettings();return;} if(tab==='table'&&onlineRoom){setCurrentTab(onlineRoom.round||onlineRoom.party||onlineRoom.pool?'table':'lobby');return;} if(tab==='table'&&!matchActive){setRoomOpen(true);setCurrentTab('lobby');return;} setRoomOpen(false);setCurrentTab(tab);};
  const updateProfile=async(updates:Partial<UserProfile>)=>{if(session&&session.id!=='guest'){await saveRemoteProfile(session.id,updates);const saved=await remoteProfile(session.id);if(saved)setProfile(prev=>({...prev,...saved,avatar:saved.avatar||prev.avatar}));}else setProfile(prev=>({...prev,...updates}));};
  const logout=()=>{void signOut().then(()=>{setSession(null);setMatchActive(false);setRoomOpen(false);}).catch(e=>setOnlineError(e.message));};
  const enterAccount=(user:{id:string;name:string;avatar?:string},remember:boolean)=>{saveSession(user,remember);setProfile({...loadProfile(user.id,user.name),...(user.avatar?{avatar:user.avatar}:{})});setSession(user);setCurrentTab('lobby');setInviteAuth(false);};
  if(invitation&&!inviteAuth)return <InvitationScreen token={invitation} signedIn={!!session&&session.id!=='guest'} connected={connection?.status==='connected'} onLogin={()=>setInviteAuth(true)} onJoin={async code=>{await sendOnline('join',{code});history.replaceState({},'',location.pathname);setInvitation('');setCurrentTab(connection?.room?.round||connection?.room?.party||connection?.room?.pool?'table':'lobby');}} onDismiss={()=>{history.replaceState({},'',location.pathname);setInvitation('');setInviteAuth(false);}}/>;
  if(inviteAuth)return <AuthScreen initialMode="login" onBack={()=>setInviteAuth(false)} onEnter={enterAccount}/>;
  if(!session)return <AuthScreen onEnter={enterAccount}/>;
  return <div data-screen={currentTab} className="app-shell min-h-screen flex flex-col pb-20 md:pb-6">
    <AngelGiftNotice enabled={connection?.angelGift===true} accountId={session.id}/>
    <Header currentTab={currentTab} onSelectTab={navigate} userAvatar={profile.avatar} userName={profile.username}/>
    <main className="flex-1 w-full flex flex-col">
      {onlineError&&<div className="online-notice" role="alert">{onlineError}<button aria-label="Dismiss message" onClick={()=>setOnlineError('')}>×</button></div>}
      {onlineRoom&&connection?.status!=='connected'&&<p className="online-notice" role="status">Reconnecting… {onlineRoom.pool?'your pool table is saved.':onlineRoom.party?'your seat and vote are saved.':'your seat and cards are saved.'}</p>}
      {session.id==='guest'&&<p className="local-account-note online-test-note">Guest preview · create an account to play with friends</p>}
      {currentTab==='lobby'&&(onlineRoom?.round||onlineRoom?.party||onlineRoom?.pool)&&<div className="resume-table-actions"><button className="uno-secondary resume-table" onClick={()=>setCurrentTab('table')}>Return to {onlineRoom.name}</button>{onlineRoom.round?.winner&&<button className="text-button" onClick={()=>void sendOnline('leave').catch(()=>{})}>Leave Room</button>}</div>}
      {currentTab==='lobby'&&onlineRoom&&onlineRoom.game!=='pool'&&!onlineRoom.round&&!onlineRoom.party&&!onlineRoom.pool&&<OnlineWaitingRoom room={onlineRoom} send={sendOnline} onSettings={openSettings} onLeave={()=>{void sendOnline('leave').catch(()=>{});}}/>}
      {currentTab==='lobby'&&onlineRoom?.game==='pool'&&!onlineRoom.pool&&<PoolWaitingRoom room={onlineRoom} send={sendOnline} onSettings={openSettings} onLeave={()=>{void sendOnline('leave').catch(()=>{});}}/>}
      {onlineRoom?.pool&&<div style={{display:currentTab==='table'?'contents':'none'}}><PoolGame paused={currentTab!=='table'} online={{room:onlineRoom,send:sendOnline}} onSettings={openSettings} onBack={()=>setCurrentTab('lobby')}/></div>}
      {onlineRoom?.party&&<div style={{display:currentTab==='table'?'contents':'none'}}><LikelyGame room={onlineRoom} send={sendOnline} onSettings={openSettings} fullChatEffects={settings.fullChatEffects} connected={connection?.status==='connected'}/></div>}
      {onlineRoom?.round&&<div style={{display:currentTab==='table'?'contents':'none'}}><GameTable key={`online-${onlineRoom.code}`} online={{room:onlineRoom,send:sendOnline}} paused={currentTab!=='table'||connection?.status!=='connected'} tableName={onlineRoom.name} settings={{...settings,tableFelt:roundFelt,initialHandSize:onlineRoom.handSize}} userAvatar={onlineRoom.seats.find(p=>p.id===onlineRoom.you)?.avatar||profile.avatar} userName={onlineRoom.seats.find(p=>p.id===onlineRoom.you)?.name||profile.username} onMatchComplete={()=>{}} onBackToLobby={()=>setCurrentTab('lobby')} onOpenSettings={openSettings}/></div>}
      {(currentTab==='lobby'||currentTab==='games')&&!roomOpen&&!onlineRoom&&<LobbyScreen view={currentTab==='games'?'games':'home'} onGames={()=>navigate('games')} onHistory={()=>navigate('history')} profile={profile} onProfile={()=>navigate('profile')} settings={settings} onUpdateSettings={updateSettings} onJoinCode={code=>sendOnline('join',{code})} onJoinTable={(name,practice,hand,game)=>{if(practice){setPracticeGame(game==='pool'?'pool':'uno');setTableName(name);setRoomOpen(true);setCurrentTab('lobby');}else void sendOnline('create',{name,handSize:hand||settings.initialHandSize,game:game||'uno'}).catch(()=>{});}}/>}
      {currentTab==='lobby'&&roomOpen&&practiceGame==='uno'&&<WaitingRoom profile={profile} tableName={tableName} onLeave={()=>setRoomOpen(false)} onStart={()=>{setRoomOpen(false);setMatchSettings({...settings});setMatchKey(k=>k+1);setMatchActive(true);setCurrentTab('table');}}/>}
      {currentTab==='lobby'&&roomOpen&&practiceGame==='pool'&&<PoolWaitingRoom name={profile.username} avatar={profile.avatar} onSettings={openSettings} onLeave={()=>setRoomOpen(false)} onPracticeStart={()=>{setRoomOpen(false);setMatchActive(true);setCurrentTab('table');}}/>}
      {matchActive&&practiceGame==='pool'&&<div style={{display:currentTab==='table'?'contents':'none'}}><PoolGame paused={currentTab!=='table'} userName={profile.username} userAvatar={profile.avatar} onSettings={openSettings} onBack={()=>{setMatchActive(false);setCurrentTab('lobby');}}/></div>}
      {matchActive&&practiceGame==='uno'&&<div style={{display:currentTab==='table'?'contents':'none'}}><GameTable key={matchKey} paused={currentTab!=='table'} tableName={tableName} settings={{...matchSettings,fullChatEffects:settings.fullChatEffects}} userAvatar={profile.avatar} userName={profile.username} onMatchComplete={record=>{if(session.id!=='guest')return;setProfile(prev=>{const won=record.placement===1;const streak=won?prev.winStreak+1:0;return {...prev,gamesPlayed:prev.gamesPlayed+1,wins:prev.wins+(won?1:0),winStreak:streak,bestStreak:Math.max(prev.bestStreak,streak),matchHistory:[{...record,id:`match_${Date.now()}`,date:new Date().toISOString(),tableName},...prev.matchHistory].slice(0,20)};});}} onBackToLobby={()=>{setMatchActive(false);setCurrentTab('lobby');}} onOpenSettings={openSettings}/></div>}
      {currentTab==='games'&&onlineRoom&&<div className="resume-table-actions"><p>You’re already in {onlineRoom.name}.</p><button className="uno-primary" onClick={()=>setCurrentTab(onlineRoom.round||onlineRoom.party||onlineRoom.pool?'table':'lobby')}>Return to your room</button></div>}
      {currentTab==='history'&&<HistoryScreen profile={profile} onGames={()=>navigate('games')}/>}
      {currentTab==='profile'&&<ProfileScreen profile={profile} onUpdateProfile={updates=>{void updateProfile(updates).catch(e=>setOnlineError(e.message));}} onLogout={logout}/>}
      {currentTab==='settings'&&<SettingsScreen game={onlineRoom?.game||'uno'} onEditProfile={()=>setCurrentTab('profile')} avatar={profile.avatar} name={profile.username} onUpdatePhoto={avatar=>updateProfile({avatar})} onLogout={logout} settings={settings} onUpdate={updateSettings} onBack={()=>setCurrentTab(previousTab==='settings'?'lobby':previousTab)}/>}
    </main><BottomNav currentTab={currentTab} onSelectTab={navigate}/>
  </div>;
}


import {useEffect,useState} from 'react';
import {ArrowRight,RefreshCw,Sparkles,Users} from 'lucide-react';
import {getInvitePreview,type InvitePreview} from '../online/api';

export function InvitationScreen({token,signedIn,connected,onLogin,onJoin,onDismiss}:{token:string;signedIn:boolean;connected:boolean;onLogin:()=>void;onJoin:(code:string)=>Promise<void>;onDismiss:()=>void}){
 const [invite,setInvite]=useState<InvitePreview|null>(null),[error,setError]=useState(''),[joining,setJoining]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let cancelled=false;
  const refresh=()=>getInvitePreview(token).then(data=>{if(!cancelled){setInvite(data);setError('');}}).catch(e=>{if(!cancelled){setError(e.message);if(e.status===410)setInvite(null);}});
  void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},10000);
  return()=>{cancelled=true;clearInterval(timer);};
 },[token,signedIn,retry]);
 async function join(){
  if(!invite)return;if(!signedIn){onLogin();return;}
  setJoining(true);setError('');try{await onJoin(invite.code);}catch(e){setError((e as Error).message);}finally{setJoining(false);}
 }
 return <main className="invitation-page"><section className="invitation-card">
  <span className="invitation-eyebrow"><Sparkles size={13}/> YOU’RE INVITED</span>
  {invite?<><div className="inviter-photo"><img src={invite.inviter.avatar} alt={invite.inviter.name}/><span>💌</span></div>
   <h1><span>{invite.inviter.name}</span> invited you<br/>to join their game ✨</h1>
   <div className="invited-room"><h2>{invite.name}</h2><span><Users size={14}/> {invite.players.length}/10 at the table</span></div>
   <h3>Look who’s here</h3><div className="invited-players">{invite.players.map((player,index)=><div key={index}><span><img src={player.avatar} alt=""/>{player.connected&&<i aria-label="Online"/>}</span><strong>{player.name}</strong></div>)}</div>
   {!invite.canJoin&&<p className="invitation-status">{invite.status==='full'?'This table is full.':'This game has already started. Ask your friend to invite you before the next round.'}</p>}
   <button type="button" className="uno-primary invitation-join" disabled={joining||(signedIn&&(!connected||!invite.canJoin))||(!signedIn&&!invite.canJoin)} onClick={()=>void join()}>{joining?'Joining…':!signedIn?'Log In to Join':!connected?'Connecting…':'Join Game'}<ArrowRight size={18}/></button>
  </>:!error?<p role="status">Opening your invitation…</p>:null}
  {error&&<div className="invitation-error"><p role="alert">{error}</p><button className="text-button" onClick={()=>setRetry(n=>n+1)}><RefreshCw size={14}/> Try again</button></div>}
  <button type="button" className="text-button invitation-dismiss" onClick={onDismiss}>Maybe later</button>
 </section></main>;
}

import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, User, Mail, KeyRound, ShieldCheck, Music2, Camera, X } from 'lucide-react';
import {recoverAccount,type AccountUser} from '../online/api';
import { createAccount, logIn } from '../utils/accounts';

type Mode = 'welcome' | 'login' | 'signup' | 'recover';
export function Brand() { return <span className="uno-brand"><b>UNO</b><span>PARTY</span><i>✦</i></span>; }
export function AuthScreen({onEnter,initialMode='welcome',onBack}:{initialMode?:Mode;onBack?:()=>void;onEnter:(user:{id:string;name:string;avatar?:string},remember:boolean)=>void}) {
  const [recovery,setRecovery]=useState(''),[savedCode,setSavedCode]=useState(''),[pendingUser,setPendingUser]=useState<AccountUser|null>(null);
  const [mode,setMode] = useState<Mode>(initialMode);
  const [photo,setPhoto] = useState('');
  const [photoBusy,setPhotoBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const [name,setName] = useState(''); const [email,setEmail] = useState('');
  const [password,setPassword] = useState(''); const [confirm,setConfirm] = useState('');
  const [show,setShow] = useState(false); const [remember,setRemember] = useState(true);
  const [error,setError] = useState(''); const [note,setNote] = useState(''); const [busy,setBusy] = useState(false);
  const switchMode = (next:Mode) => {setMode(next);setError('');setNote('');setPassword('');setConfirm('');};
  async function submit(e:FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if(mode!=='login' && password!==confirm) throw new Error('Your passwords need to match.');
      if(mode==='signup' && password.length<8) throw new Error('Use a password with at least 8 characters.');
      if(mode==='recover'){const data=await recoverAccount(email,recovery,password);setSavedCode(data.recoveryCode);setPendingUser(null);return;}
      const user = mode==='signup' ? await createAccount(name,email,password,photo,remember) : await logIn(email,password,remember);
      if('recoveryCode' in user){setPendingUser({id:user.id,name:user.name,avatar:user.avatar});setSavedCode(String(user.recoveryCode));return;}
      onEnter(user,remember);
    } catch(e) {setError(e instanceof Error ? e.message : 'Could not save your account. Please try again.');} finally {setBusy(false);}
  }
  async function choosePhoto(e:ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if(!file)return;
    setError('');setPhotoBusy(true);
    try {
      if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG or WebP picture.');
      if(file.size>8*1024*1024)throw new Error('Choose a picture smaller than 8 MB.');
      const image = await createImageBitmap(file);
      const canvas = document.createElement('canvas');canvas.width=256;canvas.height=256;
      const context=canvas.getContext('2d');if(!context)throw new Error('Could not read that picture. Try another one.');
      context.fillStyle='#fff0f5';context.fillRect(0,0,256,256);
      const side=Math.min(image.width,image.height);
      context.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,256,256);
      image.close();setPhoto(canvas.toDataURL('image/jpeg',.85));
    }catch(e){setError(e instanceof Error?e.message:'Could not open that picture. Try another one.');}
    finally{setPhotoBusy(false);e.target.value='';}
  }
  if(savedCode)return <div className="auth-page"><main className="auth-content"><Brand/><section className="auth-heading"><h1>Save your recovery code 🔑</h1><p>Keep this somewhere private. You’ll need it if you forget your password. It’s shown only once.</p></section><div className="recovery-code" aria-label="Your recovery code">{savedCode}</div><button className="uno-secondary" onClick={async()=>{try{await navigator.clipboard.writeText(savedCode);setNote('Copied');}catch{setNote('Select the code above and copy it.');}}}>Copy Code</button>{note&&<p role="status">{note}</p>}<button className="uno-primary" onClick={()=>{setSavedCode('');setNote('');if(pendingUser){onEnter(pendingUser,remember);setPendingUser(null);}else{switchMode('login');setPassword('');setConfirm('');setRecovery('');}}}>I saved it · {pendingUser?'Continue':'Log In'}</button></main></div>;
  if(mode==='recover')return <div className="auth-page"><main className="auth-content"><Brand/><section className="auth-heading"><h1>Recover your account</h1><p>Use the recovery code you saved when signing up.</p></section><form className="auth-form" onSubmit={submit}><label>Email or Username<div className="auth-input"><input required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/></div></label><label>Recovery code<div className="auth-input"><input required value={recovery} onChange={e=>setRecovery(e.target.value)} autoComplete="off" spellCheck={false}/></div></label><label>New Password<div className="auth-input"><input type="password" required minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/></div></label><label>Confirm Password<div className="auth-input"><input type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password"/></div></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="uno-primary" disabled={busy}>{busy?'One moment…':'Reset Password'}</button></form><button className="text-button" onClick={()=>switchMode('login')}>Back to Log In</button></main></div>;
  const strength = Math.min(100, password.length*6 + (/[A-Z]/.test(password)?12:0) + (/\d/.test(password)?12:0) + (/[^\w]/.test(password)?12:0));
  return <div className={`auth-page auth-${mode}`}>
    {mode!=='welcome' && <header className="auth-topbar"><button aria-label={onBack?"Back to invitation":"Back to welcome"} onClick={onBack||(()=>switchMode('welcome'))}><ArrowLeft/></button><Brand/><span className="account-icon"><User size={21}/></span></header>}
    <main className="auth-content">
      {mode==='welcome' ? <>
        
        <div className="welcome-brand"><Brand/></div>
        <h1>Cute Cards.<br/>Big Competition.</h1>
        <p className="auth-intro">Elevate your friend group’s game night. Step into plush velvet lounges, bring a little friendly rivalry, and make every card count.</p>
        <div className="hero-cards" aria-hidden="true"><span className="hero-sparkle">✦</span><div className="hero-card hero-red"><small>7</small><b>7</b><small>7</small></div><div className="hero-card hero-purple"><small>⇄</small><b>⇄</b><small>⇄</small></div><div className="hero-card hero-wild"><small>WILD ✦</small><div className="wild-oval"><span>✦</span></div><small>WILD</small></div></div>
        <div className="instant-pill">⚡ Instant Play · No downloads</div>
        <p className="welcome-proof">Your table. Your people. Your game night.</p>
        <div className="auth-actions"><button className="uno-primary" onClick={()=>switchMode('signup')}>Create Account <ArrowRight size={21}/></button><button className="uno-secondary" onClick={()=>switchMode('login')}>Log In</button><button className="text-button" onClick={()=>onEnter({id:'guest',name:'Guest'},false)}>Take a look around as a guest →</button></div>
        <div className="welcome-feature"><span><KeyRound/></span><div><h3>Your own little lounge</h3><p>Set up a table, choose your style, and get ready for game night.</p></div></div>
        <div className="welcome-feature"><span><Music2/></span><div><h3>Sensory Delight</h3><p>Plush card snaps, playful sound effects, and a little sparkle.</p></div></div>
        <footer><ShieldCheck size={17}/> Browser-ready · Pink-glam game night</footer>
      </> : <>
        <section className="auth-heading"><h1>{mode==='login'?<>Welcome Back, Darling <span className="auth-title-sparkle">✨</span></>:<>Join the Glam Squad ✨</>}</h1>{mode==='login' && <p>Ready for tonight’s luxury game table?</p>}</section>
        <form onSubmit={submit} className="auth-form">
          {mode==='signup' && <div className="signup-photo"><div className="signup-photo-preview">{photo?<img src={photo} alt="Your profile picture preview"/>:<User size={32}/>}<span><Camera size={13}/></span></div><div><button className="text-button" type="button" disabled={photoBusy} onClick={()=>photoInput.current?.click()}>{photoBusy?'Preparing picture…':photo?'Change profile picture':'Add a profile picture'}</button><p>JPG, PNG or WebP · up to 8 MB</p>{photo&&<button className="photo-remove" type="button" onClick={()=>setPhoto('')}>Remove</button>}</div><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload profile picture" onChange={choosePhoto} hidden/></div>}
          {mode==='signup' && <label>Username<div className="auth-input"><User size={20}/><input required minLength={2} maxLength={24} autoComplete="username" value={name} onChange={e=>setName(e.target.value)} placeholder="GlamQueen99"/></div></label>}
          <label>{mode==='login'?'Email or Username':'Email Address'}<div className="auth-input"><Mail size={20}/><input required type={mode==='signup'?'email':'text'} autoComplete={mode==='signup'?'email':'username'} value={email} onChange={e=>setEmail(e.target.value)} placeholder={mode==='login'?'Your email or username':'you@example.com'}/></div></label>
          <label>Password<div className="auth-input"><KeyRound size={20}/><input required minLength={mode==='signup'?8:1} type={show?'text':'password'} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff size={21}/>:<Eye size={21}/>}</button></div></label>
          {mode==='signup' && <><div className="password-strength"><div><span style={{width:`${strength}%`}}/></div><small>{password.length ? (strength>75?'Looking strong ✨':'Keep going · 8 characters minimum'):'Make it yours · 8 characters minimum'}</small></div><label>Confirm Password {confirm && confirm===password && <small className="match-label">✓ Passwords match</small>}<div className="auth-input"><ShieldCheck size={20}/><input required type={show?'text':'password'} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="One more time"/></div></label></>}
          {mode==='login' && <div className="auth-options"><label><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Remember me</label>{mode==='login' && <button type="button" className="text-button" onClick={()=>switchMode('recover')}>Forgot Password?</button>}</div>}
          {error && <p className="form-error" role="alert">{error}</p>}{note && <p className="form-note" role="status">{note}</p>}
          <button disabled={busy||photoBusy} className="uno-primary" type="submit">{busy?'One moment…':mode==='login'?'Log In':'Create Account'} {!busy && <ArrowRight size={22}/>}</button>
          
        </form>

        <p className="auth-switch">{mode==='login'?'New to UNO Party?':'Already have an account?'} <button className="text-button" onClick={()=>switchMode(mode==='login'?'signup':'login')}>{mode==='login'?'Create Account':'Log In'} →</button></p>
        {!onBack&&<button className="guest-link text-button" onClick={()=>onEnter({id:'guest',name:'Guest'},false)}>Continue as a guest</button>}
      </>}
    </main>
  </div>;
}

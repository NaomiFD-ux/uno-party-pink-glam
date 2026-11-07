import {randomBytes,scrypt,timingSafeEqual,createHash,randomUUID} from 'node:crypto';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {Store,accountNameKey} from './store';
export const tokenHash=(s:string)=>createHash('sha256').update(s).digest('hex');
const cookieName='uno_session_v2';
export type Identity={id:string;name:string;avatar:string};
const photoURL=(id:string,photo:string)=>photo?.startsWith('data:')?`/api/game/avatar/${id}?v=${tokenHash(photo).slice(0,12)}`:photo;
const identity=(a:any):Identity=>({id:a.id,name:a.name,avatar:photoURL(a.id,a.avatar)});
type Ticket={sessionHash:string;expires:number};
function fail(message:string,status=400):never{throw Object.assign(Error(message),{status});}
function validAvatar(value:unknown){if(value==='')return '';if(typeof value!=='string'||value.length>150000||(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)&&!/^https:\/\//.test(value)))fail('Choose a smaller JPG picture.');return value;}
let hashing=0;
async function passwordKey(password:string,salt:string){if(hashing>=2)fail('Sign-in is busy. Please try again in a moment.',429);hashing++;try{return await new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,32,{N:131072,r:8,p:1,maxmem:256*1024*1024},(e,key)=>e?reject(e):resolve(key)));}finally{hashing--;}}
function validPassword(x:unknown):asserts x is string{if(typeof x!=='string'||x.length<8||x.length>128)fail('Use a password between 8 and 128 characters.');}
function validName(x:unknown):asserts x is string{if(typeof x!=='string'||x.trim().length<2||x.trim().length>24||!/^[-\p{L}\p{N}_. ]+$/u.test(x.trim())||x.includes('@'))fail('Use a username with 2–24 letters, numbers, spaces, dots or underscores.');}
export function createAccounts(store:Store,options:{secure:boolean;origins:string[];onLogout:(id:string,sessionHash?:string)=>void;onProfile:(user:Identity)=>void}){
 const tickets=new Map<string,Ticket>(),limits=new Map<string,{at:number;count:number}>();
 const maintenance=setInterval(()=>{const now=Date.now();for(const [k,t]of tickets)if(t.expires<now)tickets.delete(k);for(const [k,t]of limits)if(now-t.at>900000)limits.delete(k);store.db.prepare('DELETE FROM account_sessions WHERE expires<?').run(now);},60000);maintenance.unref();
 function limited(key:string,max:number){const now=Date.now(),value=limits.get(key);if(!value||now-value.at>900000){limits.set(key,{at:now,count:1});return;}if(++value.count>max)fail('Too many attempts. Try again in 15 minutes.',429);}
 function lookup(sessionHash:string){const s=store.db.prepare('SELECT a.id,a.name,a.avatar FROM account_sessions s JOIN accounts a ON s.user_id=a.id WHERE s.hash=? AND s.expires>?').get(sessionHash,Date.now()) as Identity|undefined;return s?identity(s):undefined;}
 function session(req:IncomingMessage){const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;const hash=tokenHash(token),user=lookup(hash);return user?{user,hash}:null;}
 function cookie(res:ServerResponse,token:string,remember:boolean){res.setHeader('Set-Cookie',`${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/${options.secure?'; Secure':''}${remember?'; Max-Age=2592000':''}`);}
 function issue(req:IncomingMessage,res:ServerResponse,user:Identity,remember:boolean){const previous=session(req);if(previous){store.db.prepare('DELETE FROM account_sessions WHERE hash=?').run(previous.hash);options.onLogout(previous.user.id,previous.hash);}const token=randomBytes(32).toString('base64url');store.db.prepare('INSERT INTO account_sessions VALUES(?,?,?)').run(tokenHash(token),user.id,Date.now()+(remember?30*86400000:12*3600000));cookie(res,token,remember);}
 function consume(ticket:unknown){if(typeof ticket!=='string')return null;const hash=tokenHash(ticket),entry=tickets.get(hash);tickets.delete(hash);if(!entry||entry.expires<Date.now())return null;const user=lookup(entry.sessionHash);return user?{user,hash:entry.sessionHash}:null;}
 function profile(id:string){return store.profile(id);}
 async function route(req:IncomingMessage,res:ServerResponse){const path=req.url?.split('?')[0]||'';if(path.startsWith('/avatar/')&&req.method==='GET'){const id=path.slice(8);if(!/^[a-f0-9-]{36}$/.test(id)){res.writeHead(404);res.end();return true;}const a=store.db.prepare('SELECT avatar FROM accounts WHERE id=?').get(id) as any;if(!a?.avatar?.startsWith('data:image/jpeg;base64,')){res.writeHead(404);res.end();return true;}res.setHeader('Content-Type','image/jpeg');res.setHeader('Cache-Control','public, max-age=3600');res.setHeader('X-Content-Type-Options','nosniff');res.end(Buffer.from(a.avatar.split(',')[1],'base64'));return true;}if(!path.startsWith('/auth/')&&path!=='/profile')return false;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');try{
   if(req.method!=='GET'&&(!req.headers.origin||!options.origins.includes(req.headers.origin)))fail('This request is not allowed.',403);
   let body:any={};if(req.method==='POST'||req.method==='PATCH'){let text='';for await(const chunk of req){text+=chunk;if(text.length>165000)fail('That picture is too large.',413);}try{body=JSON.parse(text||'{}');}catch{fail('Check the form.');}if(!body||typeof body!=='object'||Array.isArray(body))fail('Check the form.');}
   const current=session(req),ip=req.socket.remoteAddress||'unknown';
   if(path==='/auth/signup'&&req.method==='POST'){
    limited('signup:'+ip,12);validName(body.name);validPassword(body.password);if(typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email))fail('Enter a valid email address.');const name=body.name.trim(),email=body.email.trim().toLowerCase();
    if(store.db.prepare('SELECT id FROM accounts WHERE name_key=? OR email=?').get(accountNameKey(name),email))fail('That username or email is already in use. Try logging in.');
    const photo=validAvatar(body.avatar||''),salt=randomBytes(16).toString('hex'),key=(await passwordKey(body.password,salt)).toString('hex'),recoveryCode=randomBytes(24).toString('base64url');const user={id:randomUUID(),name,avatar:photo};
    try{store.db.prepare('INSERT INTO accounts(id,name,email,salt,password_key,recovery_hash,avatar,bio,name_key) VALUES(?,?,?,?,?,?,?,?,?)').run(user.id,name,email,salt,key,tokenHash(recoveryCode),photo,'',accountNameKey(name));}catch{fail('That username or email is already in use. Try logging in.');}const publicUser=identity(user);issue(req,res,publicUser,body.remember!==false);res.end(JSON.stringify({user:publicUser,recoveryCode}));
   }else if(path==='/auth/login'&&req.method==='POST'){
    const handle=typeof body.handle==='string'?body.handle.trim().toLowerCase():'';limited('login-ip:'+ip,60);limited('login-handle:'+tokenHash(handle),12);validPassword(body.password);const account=store.db.prepare('SELECT * FROM accounts WHERE email=? OR name_key=?').get(handle,accountNameKey(handle)) as any;
    const key=await passwordKey(body.password,account?.salt||'00000000000000000000000000000000');if(!account||!timingSafeEqual(key,Buffer.from(account.password_key,'hex')))fail('Email, username or password doesn’t match.',401);const user=identity(account);issue(req,res,user,body.remember!==false);res.end(JSON.stringify({user}));
   }else if(path==='/auth/recover'&&req.method==='POST'){
    const handle=typeof body.handle==='string'?body.handle.trim().toLowerCase():'';limited('recover-ip:'+ip,12);limited('recover-handle:'+tokenHash(handle),6);validPassword(body.password);const account=store.db.prepare('SELECT * FROM accounts WHERE email=? OR name_key=?').get(handle,accountNameKey(handle)) as any;
    const recoveryHash=tokenHash(typeof body.code==='string'?body.code.trim():'');if(!account||!timingSafeEqual(Buffer.from(recoveryHash,'hex'),Buffer.from(account.recovery_hash,'hex')))fail('The account or recovery code doesn’t match.',401);
    const salt=randomBytes(16).toString('hex'),key=(await passwordKey(body.password,salt)).toString('hex'),recoveryCode=randomBytes(24).toString('base64url');store.db.exec('BEGIN IMMEDIATE');try{const changed=store.db.prepare('UPDATE accounts SET salt=?,password_key=?,recovery_hash=? WHERE id=? AND recovery_hash=?').run(salt,key,tokenHash(recoveryCode),account.id,recoveryHash);if(!changed.changes)fail('That recovery code has already been used.',401);store.db.prepare('DELETE FROM account_sessions WHERE user_id=?').run(account.id);store.db.exec('COMMIT');}catch(e){store.db.exec('ROLLBACK');throw e;}options.onLogout(account.id);res.setHeader('Set-Cookie',`${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${options.secure?'; Secure':''}`);res.end(JSON.stringify({recoveryCode}));
   }else if(path==='/auth/logout'&&req.method==='POST'){
    if(current){store.db.prepare('DELETE FROM account_sessions WHERE hash=?').run(current.hash);options.onLogout(current.user.id,current.hash);}res.setHeader('Set-Cookie',`${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${options.secure?'; Secure':''}`);res.end('{}');
   }else if(path==='/auth/me'&&req.method==='GET'){
    if(!current)fail('Please sign in.',401);res.end(JSON.stringify({user:current.user}));
   }else if(path==='/auth/ticket'&&req.method==='POST'){
    if(!current)fail('Please sign in.',401);limited('ticket:'+current.hash,180);const ticket=randomBytes(32).toString('base64url');tickets.set(tokenHash(ticket),{sessionHash:current.hash,expires:Date.now()+30000});res.end(JSON.stringify({ticket}));
   }else if(path==='/profile'&&req.method==='GET'){
    if(!current)fail('Please sign in.',401);res.end(JSON.stringify({profile:profile(current.user.id)}));
   }else if(path==='/profile'&&req.method==='PATCH'){
    if(!current)fail('Please sign in.',401);limited('profile:'+current.hash,120);const updated={...current.user};const old=store.db.prepare('SELECT bio,avatar FROM accounts WHERE id=?').get(updated.id) as any;let bio=old.bio;updated.avatar=old.avatar;
    if(body.username!==undefined){validName(body.username);updated.name=body.username.trim();}if(body.avatar!==undefined)updated.avatar=validAvatar(body.avatar);if(body.bio!==undefined){if(typeof body.bio!=='string'||body.bio.length>300)fail('Keep your bio under 300 characters.');bio=body.bio;}
    try{store.db.prepare('UPDATE accounts SET name=?,avatar=?,bio=?,name_key=? WHERE id=?').run(updated.name,updated.avatar,bio,accountNameKey(updated.name),updated.id);}catch{fail('That username is already in use.');}options.onProfile(identity(updated));res.end(JSON.stringify({profile:profile(updated.id)}));
   }else fail('Not found.',404);
  }catch(e:any){res.statusCode=e.status||500;res.end(JSON.stringify({error:e.status?e.message:'Could not complete that request. Please try again.'}));}return true;}
 return {route,session,consume,lookup,close(){clearInterval(maintenance);}};
}

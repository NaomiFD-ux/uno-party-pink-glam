import {randomBytes,randomInt,randomUUID} from 'node:crypto';
import type {IncomingMessage,ServerResponse} from 'node:http';
import type {Store} from './store';
import {tokenHash,type createAccounts} from './accounts';
import type {SantaView,SantaSummary,SantaMember} from '../src/online/santa';
type Exchange={id:string;token:string;ownerId:string;name:string;budget:string;date:string;members:string[];assignments:Record<string,string>|null;revealed:string[];revision:number};
const fail=(message:string,status=400):never=>{throw Object.assign(Error(message),{status});};
const text=(value:unknown,max:number,required=false)=>{if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail('Check the exchange details.');return (value as string).trim();};

/** Sattolo's shuffle: one recipient each, no self assignments, equal chances. */
export function assignSanta(ids:readonly string[],pick:(max:number)=>number=randomInt):Record<string,string> {
 if(ids.length<3||ids.length>50||new Set(ids).size!==ids.length)fail('Invite between 3 and 50 people before drawing names.');
 const recipients=[...ids];
 for(let i=recipients.length-1;i>0;i--){const j=pick(i);[recipients[i],recipients[j]]=[recipients[j],recipients[i]];}
 return Object.fromEntries(ids.map((id,i)=>[id,recipients[i]]));
}

export function createSanta(store:Store,accounts:Pick<ReturnType<typeof createAccounts>,'session'>,origins:string[]) {
 store.db.exec('CREATE TABLE IF NOT EXISTS gift_exchanges(id TEXT PRIMARY KEY,token TEXT NOT NULL UNIQUE,owner_id TEXT NOT NULL,body TEXT NOT NULL)');
 const save=(ex:Exchange)=>store.db.prepare('INSERT INTO gift_exchanges VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(ex.id,ex.token,ex.ownerId,JSON.stringify(ex));
 const all=()=>store.db.prepare('SELECT body FROM gift_exchanges ORDER BY rowid').all().map((row:any)=>JSON.parse(row.body) as Exchange);
 const load=(id:string)=>{const row=store.db.prepare('SELECT body FROM gift_exchanges WHERE id=?').get(id) as {body:string}|undefined;return row?JSON.parse(row.body) as Exchange:undefined;};
 const byToken=(token:unknown)=>{if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))fail('This invitation was not found.',404);const row=store.db.prepare('SELECT body FROM gift_exchanges WHERE token=?').get(token as string) as {body:string}|undefined;if(!row)fail('This invitation was not found.',404);return JSON.parse(row.body) as Exchange;};
 const member=(id:string):SantaMember=>{const row=store.db.prepare('SELECT id,name,avatar FROM accounts WHERE id=?').get(id) as SantaMember|undefined;if(!row)fail('A participant account is unavailable.');return {...row,avatar:row.avatar?.startsWith('data:')?`/api/game/avatar/${id}?v=${tokenHash(row.avatar).slice(0,12)}`:row.avatar||'/default-avatar.svg'};};
 const summary=(ex:Exchange):SantaSummary=>({id:ex.id,name:ex.name,budget:ex.budget,date:ex.date,ownerId:ex.ownerId,count:ex.members.length,drawn:!!ex.assignments,revision:ex.revision});
 const view=(ex:Exchange,you:string):SantaView=>({...summary(ex),you,members:ex.members.map(member),...(ex.ownerId===you&&!ex.assignments?{inviteToken:ex.token}:{}),...(ex.assignments&&ex.revealed.includes(you)?{recipient:member(ex.assignments[you])}:{})});
 async function route(req:IncomingMessage,res:ServerResponse) {
  const path=req.url?.split('?')[0]||'';if(path!=='/santa'&&!path.startsWith('/santa/'))return false;
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   if(req.method!=='GET'&&(!req.headers.origin||!origins.includes(req.headers.origin)))fail('This request is not allowed.',403);
   const current=accounts.session(req);if(!current)fail('Log in to join Secret Santa.',401);const you=current.user.id;
   if(!['GET','POST'].includes(req.method||''))fail('That action is not available.',405);
   let input:any={};if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4000)fail('Those details are too long.',413);}try{input=JSON.parse(raw||'{}');}catch{fail('Check the exchange details.');}if(!input||typeof input!=='object'||Array.isArray(input))fail('Check the exchange details.');}
   if(accounts.session(req)?.user.id!==you)fail('Log in to join Secret Santa.',401);
   let response:unknown;
   if(path==='/santa'&&req.method==='GET')response={exchanges:all().filter(ex=>ex.members.includes(you)).reverse().map(summary)};
   else if(path==='/santa'&&req.method==='POST'){
    if(all().filter(ex=>ex.ownerId===you&&!ex.assignments).length>=10)fail('Finish one of your open exchanges before creating another.');
    const name=text(input.name,60,true),budget=text(input.budget??'',60),date=text(input.date??'',10);
    if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))fail('Choose a valid exchange date.');
    const ex:Exchange={id:randomUUID(),token:randomBytes(32).toString('base64url'),ownerId:you,name,budget,date,members:[you],assignments:null,revealed:[],revision:1};save(ex);response={exchange:view(ex,you)};
   }else if(path.startsWith('/santa/invite/')&&req.method==='GET'){
    const ex=byToken(path.slice('/santa/invite/'.length));response={name:ex.name,budget:ex.budget,date:ex.date,count:ex.members.length,drawn:!!ex.assignments,organizer:member(ex.ownerId).name,...(ex.members.includes(you)?{exchangeId:ex.id}:{})};
   }else if(path==='/santa/join'&&req.method==='POST'){
    const ex=byToken(input.token);
    if(!ex.members.includes(you)){if(ex.assignments)fail('Names have already been drawn. This exchange is closed.',409);if(ex.members.length>=50)fail('This exchange is full.',409);ex.members.push(you);ex.revision++;save(ex);}
    response={exchange:view(ex,you)};
   }else{
    const match=/^\/santa\/([a-f0-9-]{36})(?:\/(draw|reveal|leave|remove))?$/.exec(path),ex=match?load(match[1]):undefined;
    if(!match||!ex||!ex.members.includes(you))fail('This exchange was not found.',404);
    const action=match[2];
    if(req.method==='GET'&&!action)response={exchange:view(ex,you)};
    else if(req.method==='POST'&&action){
     if(action==='reveal'){
      if(!ex.assignments)fail('The organizer has not drawn names yet.',409);
      if(!ex.revealed.includes(you)){ex.revealed.push(you);save(ex);}response={exchange:view(ex,you)};
     }else{
      if(ex.assignments)fail('Names are already drawn. Participants and assignments are locked.',409);
      if(input.revision!==ex.revision)fail('The group changed. Refresh and review the people before trying again.',409);
      if(action==='draw'){if(ex.ownerId!==you)fail('Only the organizer can draw names.',403);ex.assignments=assignSanta(ex.members);ex.revision++;save(ex);response={exchange:view(ex,you)};}
      else{
       const target=action==='leave'?you:input.memberId;
       if(action==='remove'&&ex.ownerId!==you)fail('Only the organizer can remove a participant.',403);
       if(target===ex.ownerId)fail('The organizer stays in this exchange.');
       if(typeof target!=='string'||!ex.members.includes(target))fail('Choose a participant in this exchange.');
       ex.members=ex.members.filter(id=>id!==target);ex.revision++;save(ex);response=target===you?{}:{exchange:view(ex,you)};
      }
     }
    }else fail('That action is not available.',405);
   }
   res.end(JSON.stringify(response));
  }catch(error:any){res.statusCode=error.status||500;res.end(JSON.stringify({error:error.status?error.message:'Secret Santa is unavailable. Please try again.'}));}
  return true;
 }
 return {route};
}

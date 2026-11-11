import {fetchProduct,productURL} from './product-preview';
import {randomBytes,randomInt,randomUUID} from 'node:crypto';
import type {IncomingMessage,ServerResponse} from 'node:http';
import type {Store} from './store';
import {tokenHash,type createAccounts} from './accounts';
import type {SantaView,SantaSummary,SantaMember,SantaItem,SantaProduct} from '../src/online/santa';
type Exchange={id:string;token:string;ownerId:string;name:string;budget:string;date:string;members:string[];assignments:Record<string,string>|null;revealed:string[];viewed?:string[];wishes?:Record<string,string>;revision:number;items?:Record<string,SantaItem[]>;wishlistEnabled?:boolean;remindersEnabled?:boolean;cover?:string;completed?:boolean;purchases?:Record<string,string[]>};
const fail=(message:string,status=400):never=>{throw Object.assign(Error(message),{status});};
const text=(value:unknown,max:number,required=false)=>{if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail('Check the exchange details.');return (value as string).trim();};

/** Sattolo's shuffle: one recipient each, no self assignments, equal chances. */
export function assignSanta(ids:readonly string[],pick:(max:number)=>number=randomInt):Record<string,string> {
 if(ids.length<3||ids.length>50||new Set(ids).size!==ids.length)fail('Invite between 3 and 50 people before drawing names.');
 const recipients=[...ids];
 for(let i=recipients.length-1;i>0;i--){const j=pick(i);[recipients[i],recipients[j]]=[recipients[j],recipients[i]];}
 return Object.fromEntries(ids.map((id,i)=>[id,recipients[i]]));
}

export function createSanta(store:Store,accounts:Pick<ReturnType<typeof createAccounts>,'session'>,origins:string[],previewProduct:typeof fetchProduct=fetchProduct) {
 store.db.exec('CREATE TABLE IF NOT EXISTS gift_exchanges(id TEXT PRIMARY KEY,token TEXT NOT NULL UNIQUE,owner_id TEXT NOT NULL,body TEXT NOT NULL)');
 const drafts=new Map<string,{you:string;exchangeId:string;product:SantaProduct;expires:number}>(),rate=new Map<string,{count:number;until:number}>();
 const save=(ex:Exchange)=>store.db.prepare('INSERT INTO gift_exchanges VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(ex.id,ex.token,ex.ownerId,JSON.stringify(ex));
 const all=()=>store.db.prepare('SELECT body FROM gift_exchanges ORDER BY rowid').all().map((row:any)=>JSON.parse(row.body) as Exchange);
 const load=(id:string)=>{const row=store.db.prepare('SELECT body FROM gift_exchanges WHERE id=?').get(id) as {body:string}|undefined;return row?JSON.parse(row.body) as Exchange:undefined;};
 const byToken=(token:unknown)=>{if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))fail('This invitation was not found.',404);const row=store.db.prepare('SELECT body FROM gift_exchanges WHERE token=?').get(token as string) as {body:string}|undefined;if(!row)fail('This invitation was not found.',404);return JSON.parse(row.body) as Exchange;};
 const member=(id:string):SantaMember=>{const row=store.db.prepare('SELECT id,name,avatar FROM accounts WHERE id=?').get(id) as unknown as SantaMember|undefined;if(!row)fail('A participant account is unavailable.');return {...row,avatar:row.avatar?.startsWith('data:')?`/api/game/avatar/${id}?v=${tokenHash(row.avatar).slice(0,12)}`:row.avatar||'/default-avatar.svg'};};
 const summary=(ex:Exchange,you:string):SantaSummary=>({id:ex.id,name:ex.name,budget:ex.budget,date:ex.date,ownerId:ex.ownerId,count:ex.members.length,drawn:!!ex.assignments,revision:ex.revision,wishlistEnabled:ex.wishlistEnabled!==false,remindersEnabled:ex.remindersEnabled!==false,cover:ex.cover?`/api/game/santa/${ex.id}/cover?v=${tokenHash(ex.cover).slice(0,12)}`:`/game-night/santa-cover-${parseInt(ex.id.replaceAll('-','').slice(-6),16)%3}.webp`,completed:!!ex.completed,yourWishlistUpdated:!!ex.items?.[you]?.length||!!ex.wishes?.[you],revealViewed:(ex.viewed??ex.revealed).includes(you),...(ex.assignments&&(ex.viewed??ex.revealed).includes(you)?{recipientName:member(ex.assignments[you]).name}:{})});
 const view=(ex:Exchange,you:string):SantaView=>({...summary(ex,you),you,members:ex.members.map(id=>({...member(id),wishlistUpdated:!!ex.items?.[id]?.length||!!ex.wishes?.[id]})),yourWishlist:ex.wishes?.[you]||'',yourItems:ex.items?.[you]||[],...(!ex.assignments?{inviteToken:ex.token}:{}),...(ex.assignments&&ex.revealed.includes(you)?{recipient:{...member(ex.assignments[you]),wishlist:ex.wishes?.[ex.assignments[you]]||'',items:ex.items?.[ex.assignments[you]]||[],purchasedIds:(ex.purchases?.[you]??[]).filter(id=>ex.items?.[ex.assignments![you]]?.some(item=>item.id===id))}}:{})});

 async function route(req:IncomingMessage,res:ServerResponse) {
  const path=req.url?.split('?')[0]||'';if(path!=='/santa'&&!path.startsWith('/santa/'))return false;
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   if(req.method!=='GET'&&(!req.headers.origin||!origins.includes(req.headers.origin)))fail('This request is not allowed.',403);
   const current=accounts.session(req);if(!current)fail('Log in to join Secret Santa.',401);const you=current.user.id;
   if(!['GET','POST'].includes(req.method||''))fail('That action is not available.',405);
   let input:any={};if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>(path.endsWith('/cover')?150000:4000))fail('Those details are too long.',413);}try{input=JSON.parse(raw||'{}');}catch{fail('Check the exchange details.');}if(!input||typeof input!=='object'||Array.isArray(input))fail('Check the exchange details.');}
   if(accounts.session(req)?.user.id!==you)fail('Log in to join Secret Santa.',401);
   let response:unknown;
   if(path==='/santa'&&req.method==='GET')response={exchanges:all().filter(ex=>ex.members.includes(you)).reverse().map(ex=>summary(ex,you))};
   else if(path==='/santa'&&req.method==='POST'){
    if(all().filter(ex=>ex.ownerId===you&&!ex.assignments).length>=10)fail('Finish one of your open exchanges before creating another.');
    const name=text(input.name,60,true),budget=text(input.budget??'',60),date=text(input.date??'',10);
    if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))fail('Choose a valid exchange date.');
    const ex:Exchange={id:randomUUID(),token:randomBytes(32).toString('base64url'),ownerId:you,name,budget,date,members:[you],assignments:null,revealed:[],viewed:[],wishes:{},items:{},wishlistEnabled:input.wishlistEnabled!==false,remindersEnabled:input.remindersEnabled!==false,revision:1};save(ex);response={exchange:view(ex,you)};
   }else if(path.startsWith('/santa/invite/')&&req.method==='GET'){
    const ex=byToken(path.slice('/santa/invite/'.length));response={name:ex.name,budget:ex.budget,date:ex.date,count:ex.members.length,drawn:!!ex.assignments,organizer:member(ex.ownerId).name,...(ex.members.includes(you)?{exchangeId:ex.id}:{})};
   }else if(path==='/santa/join'&&req.method==='POST'){
    const ex=byToken(input.token);
    if(!ex.members.includes(you)){if(ex.assignments)fail('Names have already been drawn. This exchange is closed.',409);if(ex.members.length>=50)fail('This exchange is full.',409);ex.members.push(you);ex.revision++;save(ex);}
    response={exchange:view(ex,you)};
   }else{
    const match=/^\/santa\/([a-f0-9-]{36})(?:\/(draw|reveal|leave|remove|wishlist|settings|preview-item|cover|complete|reveal-viewed|purchase))?$/.exec(path),ex=match?load(match[1]):undefined;
    if(!match||!ex||!ex.members.includes(you))fail('This exchange was not found.',404);
    const action=match[2];
    if(req.method==='GET'&&action==='cover'){if(!ex.cover)fail('This cover was not found.',404);res.setHeader('Content-Type','image/jpeg');res.end(Buffer.from(ex.cover.split(',')[1],'base64'));return true;}
    if(req.method==='GET'&&!action)response={exchange:view(ex,you)};
    else if(req.method==='POST'&&action){
     if(action==='cover'){
      if(ex.ownerId!==you)fail('Only the host can change this group picture.',403);
      if(input.image==='')delete ex.cover;
      else{if(typeof input.image!=='string'||input.image.length>140000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(input.image))fail('Choose a smaller JPG picture.');const bytes=Buffer.from(input.image.split(',')[1],'base64');if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)fail('Choose a JPG picture.');ex.cover=input.image;}
      ex.revision++;save(ex);response={exchange:view(ex,you)};
     }else if(action==='complete'){
      if(ex.ownerId!==you)fail('Only the host can complete an exchange.',403);if(!ex.assignments)fail('Draw names before completing the exchange.',409);
      if(input.revision!==ex.revision)fail('Refresh this exchange before updating it.',409);if(typeof input.completed!=='boolean')fail('Choose an exchange status.');
      ex.completed=input.completed;ex.revision++;save(ex);response={exchange:view(ex,you)};
     }else if(action==='preview-item'){
      if(ex.wishlistEnabled===false)fail('Wishlists are turned off for this exchange.',409);
      for(const [key,value]of drafts)if(value.expires<Date.now())drafts.delete(key);
      for(const [key,value]of rate)if(value.until<Date.now())rate.delete(key);
      const currentRate=rate.get(you)||{count:0,until:Date.now()+60000};if(currentRate.count>=8)fail('Give the stores a moment. Try again in a minute.',429);currentRate.count++;rate.set(you,currentRate);
      const raw=text(input.url,2000,true);let preview:Awaited<ReturnType<typeof fetchProduct>>;try{preview=await previewProduct(raw);}catch(e){fail((e as Error).message);}
      if(accounts.session(req)?.user.id!==you)fail('Log in again to add a gift.',401);
      const fresh=load(ex.id);if(!fresh?.members.includes(you))fail('This exchange was not found.',404);if(fresh.wishlistEnabled===false)fail('Wishlists are turned off for this exchange.',409);
      const previewId=randomBytes(24).toString('base64url');drafts.set(previewId,{you,exchangeId:ex.id,product:preview!.product,expires:Date.now()+600000});response={previewId,...preview!};
     }else if(action==='settings'){
      if(ex.ownerId!==you)fail('Only the organizer can change exchange settings.',403);
      if(ex.assignments)fail('Exchange settings are locked after the draw.',409);
      if(input.revision!==ex.revision)fail('The group changed. Refresh before updating settings.',409);
      ex.wishlistEnabled=input.wishlistEnabled!==false;ex.remindersEnabled=input.remindersEnabled!==false;ex.revision++;save(ex);response={exchange:view(ex,you)};
     }else if(action==='wishlist'){
      if(ex.wishlistEnabled===false)fail('Wishlists are turned off for this exchange.',409);
      if(input.operation==='add'||input.operation==='add-manual'){
       const items=ex.items?.[you]||[];
       if(items.length>=40)fail('You can add up to 40 gifts per exchange.');
       const details=input.details??{};
       const note=text(input.note??'',600),variant=text(details.variant??'',120);
       let product:SantaProduct;
       if(input.operation==='add'){
        const draft=drafts.get(input.previewId);
        if(!draft||draft.you!==you||draft.exchangeId!==ex.id||draft.expires<Date.now())return fail('Preview the link again before saving this gift.',409);
        product={...draft.product};
       }else{
        const raw=text(input.url??'',2000);
        let url:URL|undefined;
        if(raw){
         try{url=productURL(raw);}catch(error){return fail((error as Error).message);}
        }
        product={url:url?.href??'',store:url?.hostname.replace(/^www\./,'')??'',title:'',price:'',currency:'',image:''};
       }
       if(details.title!==undefined)product.title=text(details.title,250,true);
       if(!product.title)fail('Enter an item name.');
       if(details.price!==undefined){
        const price=text(details.price,40);
        if(price!==product.price)product.currency=/^\d+(?:[.,]\d{1,2})?$/.test(price)?product.currency||'USD':'';
        product.price=price;
       }
       ex.items={...ex.items,[you]:[...items,{...product,id:randomUUID(),note,variant,addedAt:Date.now()}]};
       if(input.operation==='add')drafts.delete(input.previewId);
      }else if(input.operation==='delete'){
       const items=ex.items?.[you]||[];if(!items.some(item=>item.id===input.itemId))fail('This wishlist item was not found.',404);ex.items={...ex.items,[you]:items.filter(item=>item.id!==input.itemId)};
      }else if(input.operation==='note'){
       const note=text(input.note??'',600),items=ex.items?.[you]||[];if(!items.some(item=>item.id===input.itemId))fail('This wishlist item was not found.',404);ex.items={...ex.items,[you]:items.map(item=>item.id===input.itemId?{...item,note}:item)};
      }else{ex.wishes={...ex.wishes,[you]:text(input.text,600)};}
      save(ex);response={exchange:view(ex,you)};
     }else if(action==='purchase'){
      if(!ex.assignments||!ex.revealed.includes(you)||ex.wishlistEnabled===false)fail('Open your recipient’s wishlist first.',409);
      const items=ex.items?.[ex.assignments[you]]??[];
      const itemIds:unknown=input.itemIds;
      if(!Array.isArray(itemIds)||!itemIds.length||itemIds.length>40||typeof input.purchased!=='boolean')return fail('Choose gifts to update.');
      if(itemIds.some(id=>!items.some(item=>item.id===id)))fail('This wishlist item was not found.',404);
      const purchased=new Set((ex.purchases?.[you]??[]).filter(id=>items.some(item=>item.id===id)));
      for(const id of itemIds){
       if(input.purchased)purchased.add(id);
       else purchased.delete(id);
      }
      ex.purchases={...ex.purchases,[you]:[...purchased]};
      save(ex);
      response={exchange:view(ex,you)};
     }else if(action==='reveal-viewed'){
      if(!ex.assignments||!ex.revealed.includes(you))fail('Reveal your own person before finishing the reveal.',409);
      const viewed=ex.viewed??ex.revealed;if(!viewed.includes(you)){ex.viewed=[...viewed,you];save(ex);}response={exchange:view(ex,you)};
     }else if(action==='reveal'){
      if(!ex.assignments)fail('The organizer has not drawn names yet.',409);
      if(!ex.revealed.includes(you)){ex.revealed.push(you);save(ex);}response={exchange:view(ex,you)};
     }else{
      if(ex.assignments)fail('Names are already drawn. Participants and assignments are locked.',409);
      if(input.revision!==ex.revision)fail('The group changed. Refresh and review the people before trying again.',409);
      if(action==='draw'){if(ex.ownerId!==you)fail('Only the organizer can draw names.',403);ex.assignments=assignSanta(ex.members);ex.revision++;save(ex);response={exchange:view(ex,you)};}
      else{
       if(action==='leave')fail('You are committed to this exchange. Ask the organizer if you need to be removed.',409);
       const target=input.memberId;
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

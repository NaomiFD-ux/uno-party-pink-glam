import {SantaDrawnHub} from './SantaDrawnHub';
import {SantaNameReveal} from './SantaNameReveal';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {Gift,Link,Lock,Plus,Users,ArrowLeft,ArrowRight,Sparkles,Check,Home,Info,Trash2,ExternalLink,X,Bell,Calendar,Wallet,Copy,Settings,Clock,MoreHorizontal,LayoutGrid,Crown,CheckCircle2,ChevronRight,ShoppingBag,Camera,NotebookPen,MessageCircle,Square,SquareCheck,Menu,Tag} from 'lucide-react';
import {santaApi,type SantaInvite,type SantaSummary,type SantaView,type SantaItem,type SantaPreview} from '../online/santa';
type Tab='hub'|'wishlist'|'details'|'members'|'recipient';
type GroupFilter='all'|'hosting'|'joined'|'completed';
async function coverPhoto(file:File){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8000000)throw Error('Choose a JPG, PNG or WebP picture smaller than 8 MB.');const image=await createImageBitmap(file);try{const canvas=document.createElement('canvas');canvas.width=canvas.height=400;const context=canvas.getContext('2d');if(!context)throw Error('Your browser couldn’t prepare this picture.');context.fillStyle='#440015';context.fillRect(0,0,400,400);const side=Math.min(image.width,image.height);context.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,400,400);for(const quality of [.86,.72,.55,.35]){const result=canvas.toDataURL('image/jpeg',quality);if(result.length<130000)return result;}throw Error('Choose a simpler or smaller picture.');}finally{image.close();}}
const friendlyDate=(value:string)=>value?new Date(value+'T12:00:00').toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}):'Date to be decided';
function WishlistPhoto({image}:{image:string}){
 const [source,setSource]=useState(image);
 if(!source)return <div className="gift-item-placeholder"><Gift/></div>;
 return <img src={source} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>{
  const url=new URL(source,window.location.href);
  const path=url.pathname.replace(/\/{2,}/g,'/');
  if(path===url.pathname){setSource('');return;}
  url.pathname=path;
  setSource(url.href);
 }}/>;
}
function ItemCard({item,onDelete,onNote,purchased,onPurchase,busy=false}:{
 item:SantaItem;onDelete?:()=>void;onNote?:(note:string)=>void;
 purchased?:boolean;onPurchase?:()=>void;busy?:boolean;
}){
 const [editing,setEditing]=useState(false),[note,setNote]=useState(item.note);
 const appleStore=onPurchase&&(/^apple$/i.test(item.store.trim())||/^https?:\/\/(?:www\.)?apple\.com(?:[/:?#]|$)/i.test(item.url));
 return <article className={`gift-item ${onDelete?'gift-item-own':onPurchase?'gift-item-recipient':''}`}>
  <WishlistPhoto key={item.image} image={item.image}/>
  <div className="gift-item-copy">
   {onDelete&&item.store&&<span className="gift-own-store">{item.store}</span>}
   <h3>{item.title}</h3>
   {item.price&&<strong>{item.currency==='USD'?'$':item.currency?`${item.currency} `:''}{item.price}</strong>}
   {item.variant&&<p>{item.variant}</p>}
   {item.note&&!onPurchase&&<p>{item.note}</p>}
   {editing&&<form onSubmit={event=>{event.preventDefault();onNote?.(note);setEditing(false);}}>
    <textarea aria-label={`Note for ${item.title}`} maxLength={600} value={note} onChange={event=>setNote(event.target.value)}/>
    <button className="santa-secondary" disabled={busy}>Save note</button>
   </form>}
  </div>
  <div className="gift-item-actions">
   <div className="gift-store-actions">
    {!onDelete&&(item.store||appleStore)&&<span className={`gift-item-store${appleStore?' gift-item-store-apple':''}`} title={item.store}>{appleStore?'Apple':item.store}</span>}
    {item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.title} in store`}><ExternalLink size={21}/></a>}
   </div>
   {onDelete&&<button disabled={busy} onClick={onDelete} aria-label={`Remove ${item.title} from wishlist`}><Trash2 size={21}/></button>}
   {onNote&&<button aria-expanded={editing} onClick={()=>{setNote(item.note);setEditing(value=>!value);}} aria-label={`Edit note for ${item.title}`}><Menu size={21}/></button>}
   {onPurchase&&<button className="gift-purchase-button" disabled={busy} aria-pressed={purchased} onClick={onPurchase}>
    {purchased?<SquareCheck size={19}/>:<Square size={19}/>}
    <span>{purchased?'Purchased':'Mark as Purchased'}</span>
   </button>}
  </div>
 </article>;
}

function RecipientWishlist({recipient,busy,onPurchase}:{
 recipient:NonNullable<SantaView['recipient']>;busy:boolean;onPurchase:(ids:string[],purchased:boolean)=>void;
}){
 const [showNotes,setShowNotes]=useState(false);
 const purchased=new Set(recipient.purchasedIds??[]);
 const notes=recipient.items.filter(item=>item.note);
 const remaining=recipient.items.filter(item=>!purchased.has(item.id));
 return <section className="santa-shopping-wishlist">
  <div className="gift-recipient-switch" role="group" aria-label="Recipient wishlist view">
   <button className={showNotes?'santa-secondary':'santa-primary'} aria-pressed={!showNotes} onClick={()=>setShowNotes(false)}><Gift size={18}/>Wishlist ({recipient.items.length})</button>
   <button className={showNotes?'santa-primary':'santa-secondary'} aria-pressed={showNotes} onClick={()=>setShowNotes(true)}><MessageCircle size={18}/>Notes from {recipient.name}</button>
  </div>
  {showNotes?<section className="gift-recipient-list">
   {notes.length?notes.map(item=><div className="gift-recipient-note" key={item.id}><h3>{item.title}</h3><p>{item.note}</p></div>):<p className="gift-recipient-note">No item notes yet.</p>}
  </section>:<>
   {recipient.items.length?<div className="gift-recipient-list">
    {recipient.items.map(item=><ItemCard key={item.id} item={item} busy={busy} purchased={purchased.has(item.id)} onPurchase={()=>onPurchase([item.id],!purchased.has(item.id))}/>)}
   </div>:<p className="gift-recipient-note">No gifts have been added yet.</p>}
   {remaining.length>1&&<button className="santa-primary gift-purchase-all" disabled={busy} onClick={()=>onPurchase(remaining.map(item=>item.id),true)}><CheckCircle2 size={20}/>Mark Gifts as Purchased</button>}
  </>}
 </section>;
}

export function SecretSanta({accountId,initialCreate=false,initialExchangeId='',onHome}:{accountId:string;initialCreate?:boolean;initialExchangeId?:string;onHome?:()=>void}) {
 const [showNameReveal,setShowNameReveal]=useState(false);
 const [focusRecipient,setFocusRecipient]=useState(false);
 const [groupFilter,setGroupFilter]=useState<GroupFilter>('all'),[confirmComplete,setConfirmComplete]=useState(false);
 const [exchanges,setExchanges]=useState<SantaSummary[]>([]),[exchange,setExchange]=useState<SantaView|null>(null);
 const [invite,setInvite]=useState<SantaInvite|null>(null),[token,setToken]=useState(()=>{const value=new URLSearchParams(location.search).get('santa')||'';return /^[A-Za-z0-9_-]{43}$/.test(value)?value:'';});
 const [creating,setCreating]=useState(initialCreate),[tab,setTab]=useState<Tab>('hub'),[confirmDraw,setConfirmDraw]=useState(false),[confirmRemove,setConfirmRemove]=useState<string|null>(null);
 const [name,setName]=useState('Christmas Crew 🎄'),[budget,setBudget]=useState(''),[date,setDate]=useState(`${new Date().getFullYear()}-12-25`),[wishlistEnabled,setWishlistEnabled]=useState(true),[remindersEnabled,setRemindersEnabled]=useState(true);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [adding,setAdding]=useState(false),[link,setLink]=useState(''),[note,setNote]=useState(''),[preview,setPreview]=useState<SantaPreview|null>(null),[deleteItem,setDeleteItem]=useState<string|null>(null);
 const [itemTitle,setItemTitle]=useState(''),[itemPrice,setItemPrice]=useState(''),[itemVariant,setItemVariant]=useState('');
 const working=useRef(false),selectedId=useRef<string|null>(null),version=useRef(0),modal=useRef<HTMLDialogElement>(null),addButton=useRef<HTMLButtonElement>(null);
 selectedId.current=exchange?.id||null;
 const list=useCallback(async()=>{setExchanges(await santaApi.list());},[]);
 useEffect(()=>{let alive=true;setLoading(true);setError('');setExchange(null);setInvite(null);
  Promise.all([santaApi.list(),token?santaApi.preview(token):Promise.resolve(null)]).then(async([values,invitation])=>{const selected=invitation?.exchangeId||(!initialCreate?initialExchangeId:'');const saved=selected?await santaApi.get(selected):null;if(alive){setExchanges(values);setInvite(saved?null:invitation);setExchange(saved);if(invitation)setCreating(false);}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};
 },[accountId,token,initialCreate,initialExchangeId]);
 useEffect(()=>{const id=exchange?.id;if(!id)return;let alive=true;
  const refresh=async()=>{if(working.current||document.visibilityState!=='visible')return;const before=version.current;try{const next=await santaApi.get(id);if(alive&&selectedId.current===id&&before===version.current){setExchange(next);if(next.revision!==exchange?.revision){setConfirmDraw(false);setConfirmRemove(null);}}}catch(e){if(alive)setError((e as Error).message);}};
  const timer=setInterval(()=>void refresh(),10000);window.addEventListener('focus',refresh);return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[exchange?.id,exchange?.revision]);
 useEffect(()=>{if(adding){modal.current?.showModal();modal.current?.querySelector('input')?.focus();}else if(modal.current?.open){modal.current.close();addButton.current?.focus();}},[adding]);
 useEffect(()=>{if(exchange?.wishlistEnabled===false&&tab==='wishlist')setTab('details');},[exchange?.wishlistEnabled,tab]);
 const run=async(action:()=>Promise<void>)=>{if(working.current)return;working.current=true;version.current++;setBusy(true);setError('');setNotice('');try{await action();}catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}};
 const home=()=>{version.current++;setExchange(null);setInvite(null);setToken('');setCreating(false);setTab('hub');setConfirmDraw(false);setConfirmRemove(null);const url=new URL(location.href);url.searchParams.set('santa','home');history.replaceState({},'',url.pathname+url.search);void run(list);};
 const open=(id:string,selectedTab:Tab='hub',recipient=false)=>void run(async()=>{setExchange(await santaApi.get(id));setCreating(false);setInvite(null);setTab(selectedTab);setFocusRecipient(recipient);setConfirmDraw(false);setConfirmRemove(null);setConfirmComplete(false);setDeleteItem(null);setAdding(false);});
 const create=(event:FormEvent)=>{event.preventDefault();void run(async()=>{setExchange(await santaApi.create({name,budget,date,wishlistEnabled,remindersEnabled}));setCreating(false);setTab('hub');await list();});};
 const act=(action:'draw'|'reveal'|'remove'|'wishlist'|'settings'|'cover'|'complete'|'reveal-viewed'|'purchase',extra:Record<string,unknown>={})=>void run(async()=>{if(!exchange)return;const saved=await santaApi.act(exchange.id,action,{revision:exchange.revision,...extra});setExchange(saved||null);if(action==='reveal'&&saved?.recipient)setShowNameReveal(true);if(action==='wishlist'){setNotice('Your wishlist is saved. Only your assigned giver can see the gifts.');setDeleteItem(null);}setConfirmDraw(false);setConfirmRemove(null);await list();});
 const uploadCover=(id:string,file:File)=>void run(async()=>{const image=await coverPhoto(file),saved=await santaApi.act(id,'cover',{image});if(selectedId.current===id)setExchange(saved||null);await list();setNotice('Your group picture is saved for everyone in this exchange.');});
 useEffect(()=>{if(focusRecipient&&exchange?.drawn)document.querySelector('.santa-shopping-wishlist')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[focusRecipient,exchange?.id]);
 const markRevealViewed=()=>{const id=exchange?.id;if(!id)return;void santaApi.act(id,'reveal-viewed').then(saved=>{if(saved)setExchange(current=>current?.id===id?{...current,revealViewed:saved.revealViewed,recipientName:saved.recipientName}:current);return list();}).catch(()=>setNotice('Your person is saved. Replay the reveal if the ready prompt does not update.'));};
 const owner=exchange?.ownerId===accountId,shareLink=exchange?.inviteToken?`${location.origin}/?santa=${encodeURIComponent(exchange.inviteToken)}`:'';
 const copy=()=>void run(async()=>{try{await navigator.clipboard.writeText(shareLink);setNotice('Invite link copied. Anyone in this group can share it.');}catch{setNotice('Your browser couldn’t copy the invitation. Allow clipboard access and try again.');}});
 const openAdd=()=>{
  setLink('');setNote('');setItemTitle('');setItemPrice('');setItemVariant('');
  setPreview(null);setAdding(true);setError('');
 };
 const updateProductLink=(value:string)=>{
  setLink(value);
  if(preview){
   if(itemTitle===preview.product.title)setItemTitle('');
   if(itemPrice===preview.product.price)setItemPrice('');
   setPreview(null);
  }
 };
 const previewLink=(url:string)=>void run(async()=>{
  if(!exchange)return;
  const result=await santaApi.itemPreview(exchange.id,url.trim());
  setPreview(result);
  if(result.product.title!==new URL(result.product.url).hostname){
   setItemTitle(current=>current.trim()?current:result.product.title);
  }
  if(result.product.price)setItemPrice(current=>current.trim()?current:result.product.price);
 });
 const saveItem=()=>void run(async()=>{
  if(!exchange)return;
  const details={title:itemTitle,price:itemPrice,variant:itemVariant};
  const input=preview
   ?{operation:'add',previewId:preview.previewId,details,note}
   :{operation:'add-manual',url:link.trim(),details,note};
  setExchange((await santaApi.act(exchange.id,'wishlist',input))!);
  setAdding(false);
  setNotice('Gift added to your wishlist.');
  await list();
 });
 const roster=exchange&&<><div className="gift-roster-heading"><h2><Users/>Participants ({exchange.count}/50)</h2><span className="santa-badge"><Clock size={16}/>{exchange.drawn?'Names drawn':'Preparing'}</span></div><ul className="gift-roster">{exchange.members.map(member=><li key={member.id}><img src={member.avatar} alt=""/><strong>{member.name}{member.id===accountId?' (you)':''}{member.id===exchange.ownerId?' 👑':''}</strong>{exchange.wishlistEnabled&&<span className={`gift-ready ${member.wishlistUpdated?'ready':''}`}>{member.wishlistUpdated?<Check size={15}/>:<Clock size={15}/>}<span>{member.wishlistUpdated?'Wishlist Updated':'Update Wishlist'}</span></span>}{owner&&!exchange.drawn&&member.id!==accountId&&<button className="gift-remove-member" disabled={busy} aria-label={`Remove ${member.name}`} onClick={()=>setConfirmRemove(member.id)}><MoreHorizontal size={22}/></button>}</li>)}</ul>{confirmRemove&&<div className="santa-confirm"><p>Remove {exchange.members.find(m=>m.id===confirmRemove)?.name}? Their other exchanges will stay unchanged.</p><button className="santa-secondary" disabled={busy} onClick={()=>act('remove',{memberId:confirmRemove})}>Remove participant</button><button className="santa-text-button" onClick={()=>setConfirmRemove(null)}>Cancel</button></div>}<p className="gift-private-hint"><Lock size={14}/>Joining commits you to this exchange. Contact the host if you need to be removed.</p></>;
 const days=exchange?.date?Math.ceil((new Date(exchange.date+'T23:59:59').getTime()-Date.now())/86400000):null;
 const headerAsset=creating?'exchange-details':exchange?(tab==='details'?'exchange-details':tab==='wishlist'?'my-wishlist':tab==='members'?'members':null):invite?null:'my-exchanges';
 const headerTitle=creating?'Exchange Details':exchange?(tab==='details'?'Exchange Details':tab==='wishlist'?'My Wishlist':tab==='members'?'Members':tab==='recipient'&&exchange.recipient?`${exchange.recipient.name}’s Wishlist`:exchange.name):invite?'You’re invited':'My Exchanges';
 const groupCounts={all:exchanges.length,hosting:exchanges.filter(ex=>ex.ownerId===accountId).length,joined:exchanges.filter(ex=>ex.ownerId!==accountId).length,completed:exchanges.filter(ex=>ex.completed).length};
 const filteredGroups=exchanges.filter(ex=>groupFilter==='all'||groupFilter==='hosting'&&ex.ownerId===accountId||groupFilter==='joined'&&ex.ownerId!==accountId||groupFilter==='completed'&&ex.completed);
 return <section className={`santa-page gift-experience${!exchange&&!invite&&!creating?' gift-group-list-screen':''}`}>
  <div className="gift-topline"><button className="gift-back" disabled={busy} onClick={home}><ArrowLeft size={18}/>My Exchanges{exchanges.length?` (${exchanges.length})`:''}</button>{!exchange&&!invite&&!creating&&<button className="gift-new-small" disabled={busy} onClick={()=>{setExchange(null);setInvite(null);setCreating(true);}}>New exchange <Plus size={16}/></button>}</div>
  <header className={`gift-header${headerAsset?' gift-header-generated':''}`}>{headerAsset?<><h1 className="gift-accessible-title">Secret Santa — {headerTitle}</h1><img className="gift-generated-header" src={`/game-night/santa-header-${headerAsset}.webp`} width={1200} height={600} alt="" fetchPriority="high"/></>:<><div className="gift-title-art"><img src="/game-night/santa-welcome-title.webp" width={1100} height={367} alt="Secret Santa"/><Gift className="gift-title-present" aria-hidden="true"/></div><div className="gift-title-ribbon"><img src="/game-night/exchange-gold-ribbon.webp" alt="" aria-hidden="true"/><h1>{headerTitle}</h1></div></>}</header>

  {error&&!adding&&<div className="santa-error" role="alert">{error}<button onClick={()=>setError('')} aria-label="Dismiss Secret Santa error">×</button></div>}{notice&&<p className="santa-notice" role="status">{notice}</p>}
  {loading?<div className="santa-card" role="status">Finding your Christmas plans…</div>:creating?<form className="santa-card gift-setup" onSubmit={create}>
   <label><span><Gift size={19}/>Exchange Name</span><input required maxLength={60} value={name} onChange={e=>setName(e.target.value)}/></label>
   <label><span><Wallet size={19}/>Budget <small>(optional)</small></span><input maxLength={60} placeholder="e.g. $50" value={budget} onChange={e=>setBudget(e.target.value)}/></label>
   <label><span><Calendar size={19}/>Gift Exchange Date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><small>The day you exchange gifts. Names are available after the host draws.</small></label>
   <label className="gift-switch"><span><Gift size={19}/>Enable Wishlist</span><input type="checkbox" role="switch" checked={wishlistEnabled} onChange={e=>setWishlistEnabled(e.target.checked)}/></label>
   <label className="gift-switch"><span><Bell size={19}/>In-app Reminders</span><input type="checkbox" role="switch" checked={remindersEnabled} onChange={e=>setRemindersEnabled(e.target.checked)}/></label>
   <p>You’ll join as the host. After creating, invite your people with a private link.</p><button className="santa-primary" disabled={busy||!name.trim()}>{busy?'Creating…':'Create Exchange'}<ArrowRight size={18}/></button>
  </form>:invite?<div className="santa-card gift-invitation"><Gift size={42}/><h2>{invite.name}</h2><p>{invite.organizer} invited you to their Secret Santa.</p><p>{friendlyDate(invite.date)} · {invite.budget||'No budget set'} · {invite.count} people</p>{invite.drawn?<p>Names have already been drawn. This exchange is closed.</p>:<><p className="santa-privacy"><Lock size={17}/>Joining puts you on the list for this exchange. You’ll stay in it unless the host removes you before the draw. Your other groups stay separate.</p><button className="santa-primary" disabled={busy} onClick={()=>void run(async()=>{setExchange(await santaApi.join(token));setInvite(null);setTab('hub');await list();})}>{busy?'Joining…':'Join & commit to this exchange'}</button></>}</div>:exchange?<>
   <nav className="gift-tabs" aria-label="Exchange navigation">{([{id:'hub',label:'Exchange Hub',Icon:Home},{id:'wishlist',label:'Wishlist',Icon:Gift},{id:'details',label:'Details',Icon:Info},{id:'members',label:'Members',Icon:Users}] as const).filter(t=>t.id!=='wishlist'||exchange.wishlistEnabled).map(t=><button key={t.id} aria-current={tab===t.id?'page':undefined} onClick={()=>setTab(t.id)}><t.Icon size={20}/>{t.label}</button>)}</nav>
   {exchange.remindersEnabled&&days!==null&&days>=0&&days<=7&&<p className="gift-reminder"><Bell size={17}/>Your gift exchange is {days===0?'today':`in ${days} day${days===1?'':'s'}`}!{exchange.wishlistEnabled&&!exchange.yourItems.length?' Add a few gift hints for your person.':''}</p>}
   {tab==='hub'?(exchange.drawn?<SantaDrawnHub exchange={exchange} busy={busy} onReveal={()=>exchange.recipient?setShowNameReveal(true):act('reveal')} onWishlist={()=>setTab('recipient')} onOwnWishlist={()=>setTab('wishlist')} onDetails={()=>setTab('details')} onHome={onHome}/>:<>
    {exchange.wishlistEnabled&&<section className="gift-wishlist-callout"><img className="gift-callout-background" src="/game-night/wishlist-hub-banner.webp" width={1500} height={500} alt=""/><div className="gift-callout-content"><h2><img src="/game-night/wishlist-script-title.webp" alt="Update Your Wishlist!" width={1000} height={240}/></h2><p>Add or edit the gifts you’d love to receive before the draw. Make sure your wishlist is up to date!</p><button className="santa-primary" onClick={()=>setTab('wishlist')}>Update My Wishlist <ArrowRight size={20}/></button></div></section>}
    {shareLink?<section className="gift-invite-bar"><span>Invite Friends</span><button className="santa-primary" onClick={copy} disabled={busy}><Link size={21}/>Copy Invite Link</button></section>:<p className="gift-private-hint"><Lock size={16}/>Invitations are closed because names have been drawn.</p>}

    {roster}
    {!exchange.drawn&&(owner?<section className="gift-draw"><button className="santa-primary" disabled={busy||exchange.count<3} onClick={()=>setConfirmDraw(true)}><Gift/>Draw Names</button><p><Lock size={14}/>{exchange.count<3?'Invite at least 2 more people to draw names.':'You can draw when everyone has joined. Wishlists are optional.'}</p>{confirmDraw&&<div className="santa-confirm" role="group" aria-label="Review before drawing names"><h3>Is everyone here?</h3><p>Draw for these {exchange.count} people? No one can join or be removed after this. Each person can reveal only their own assignment.</p><button className="santa-primary" disabled={busy} onClick={()=>act('draw')}>Yes, draw names now</button><button className="santa-text-button" onClick={()=>setConfirmDraw(false)}>Not yet</button></div>}</section>:<p className="gift-private-hint">Your host will draw names when everyone has joined. You can keep inviting people until then.</p>)}
   </>):tab==='recipient'&&exchange.recipient?<section className="santa-recipient-page"><button className="santa-back" onClick={()=>setTab('hub')}><ArrowLeft size={17}/>Exchange Hub</button><RecipientWishlist key={exchange.recipient.id} recipient={exchange.recipient} busy={busy} onPurchase={(itemIds,purchased)=>act('purchase',{itemIds,purchased})}/></section>:tab==='wishlist'&&exchange.wishlistEnabled?<section className="gift-wishlist-page"><div className="gift-wishlist-heading"><div><h2><Gift/>My Wishlist ({exchange.yourItems.length})</h2><p>For {exchange.name} · Visible only to you and your assigned giver.</p></div><button ref={addButton} className="gift-add-plus" aria-label="Add an item" onClick={openAdd}><Plus size={28}/></button></div>{exchange.yourItems.length?exchange.yourItems.map(item=><div key={item.id}><ItemCard item={item} busy={busy} onDelete={()=>setDeleteItem(item.id)} onNote={value=>act('wishlist',{operation:'note',itemId:item.id,note:value})}/>{deleteItem===item.id&&<div className="santa-confirm"><p>Remove this gift from this exchange’s wishlist?</p><button className="santa-secondary" disabled={busy} onClick={()=>act('wishlist',{operation:'delete',itemId:item.id})}>Remove gift</button><button className="santa-text-button" onClick={()=>setDeleteItem(null)}>Cancel</button></div>}</div>):<div className="gift-empty"><Gift size={48}/><h3>Your wishlist is empty</h3></div>}<button className="santa-primary gift-another" onClick={openAdd}><Plus size={23}/>Add another gift</button></section>:tab==='members'?<section>{shareLink&&<button className="santa-primary" disabled={busy} onClick={copy}><Link size={18}/>Invite Friends</button>}{roster}</section>:<section className="santa-card gift-details"><h2><Info/>Exchange Details</h2><dl><dt>Host</dt><dd>{exchange.members.find(m=>m.id===exchange.ownerId)?.name}</dd><dt>Gift budget</dt><dd>{exchange.budget||'No budget set'}</dd><dt>Gift exchange date</dt><dd>{friendlyDate(exchange.date)}</dd><dt>Wishlists</dt><dd>{exchange.wishlistEnabled?'Enabled · optional before the draw':'Turned off'}</dd><dt>In-app reminders</dt><dd>{exchange.remindersEnabled?'Enabled · shown during the week before your exchange':'Off'}</dd></dl><p>Everyone gives one gift and receives one. No self matches. Only the host draws names, once. Each person’s assignment and gift list stay private.</p>{owner&&<div className="gift-cover-settings"><h3><Camera size={18}/>Group picture</h3><img src={exchange.cover} alt="Current group cover"/><label className="santa-secondary gift-cover-upload">Change picture<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(file)uploadCover(exchange.id,file);event.target.value='';}}/></label><button className="santa-text-button" disabled={busy} onClick={()=>act('cover',{image:''})}>Use Christmas artwork</button></div>}{owner&&exchange.drawn&&<div className="gift-complete-settings"><button className="santa-secondary" disabled={busy} onClick={()=>setConfirmComplete(true)}>{exchange.completed?'Move back to active':'Mark exchange completed'}</button>{confirmComplete&&<div className="santa-confirm"><p>{exchange.completed?'Move this exchange back to active?':'Have you finished exchanging gifts? Move this group to Completed?'} Your saved names and wishlists stay available.</p><button className="santa-primary" disabled={busy} onClick={()=>{act('complete',{completed:!exchange.completed});setConfirmComplete(false);}}>Confirm</button><button className="santa-text-button" onClick={()=>setConfirmComplete(false)}>Cancel</button></div>}</div>}{owner&&!exchange.drawn&&<div className="gift-settings"><h3><Settings size={18}/>Host settings</h3><label className="gift-switch"><span>Wishlists</span><input type="checkbox" role="switch" checked={exchange.wishlistEnabled} disabled={busy} onChange={e=>{act('settings',{wishlistEnabled:e.target.checked,remindersEnabled:exchange.remindersEnabled});if(!e.target.checked)setTab('details');}}/></label><label className="gift-switch"><span>In-app reminders</span><input type="checkbox" role="switch" checked={exchange.remindersEnabled} disabled={busy} onChange={e=>act('settings',{remindersEnabled:e.target.checked,wishlistEnabled:exchange.wishlistEnabled})}/></label></div>}</section>}
  </>:<><div className="gift-groups-intro"><h2>All your Christmas plans, together.</h2><p>Every group. Every wishlist. A little Christmas magic.</p></div><nav className="gift-group-filters" aria-label="Filter your exchanges">{([{id:'all',label:'All',Icon:LayoutGrid},{id:'hosting',label:'Hosting',Icon:Crown},{id:'joined',label:'Joined',Icon:Users},{id:'completed',label:'Completed',Icon:CheckCircle2}] as const).map(filter=><button key={filter.id} aria-pressed={groupFilter===filter.id} onClick={()=>setGroupFilter(filter.id)}><filter.Icon size={16}/>{filter.label} ({groupCounts[filter.id]})</button>)}</nav>
   {filteredGroups.length?<div className="gift-group-cards">{filteredGroups.map(ex=><article className="gift-group-card" key={ex.id}>
    <div className="gift-group-cover"><img src={ex.cover} alt="" loading="lazy"/>{ex.ownerId===accountId&&<label className="gift-group-camera" title={`Change picture for ${ex.name}`}><Camera size={15}/><input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Change picture for ${ex.name}`} disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(file)uploadCover(ex.id,file);event.target.value='';}}/></label>}</div>
    <div className="gift-group-content"><div className="gift-group-card-top"><button className="gift-group-title" disabled={busy} onClick={()=>open(ex.id)}><h2>{ex.name}</h2></button><span className={`gift-group-status ${ex.completed?'complete':ex.drawn?'drawn':''}`}>{ex.completed?<CheckCircle2 size={12}/>:ex.drawn?<Check size={12}/>:<Clock size={12}/>}<span>{ex.completed?'Completed':ex.drawn?'Names Drawn':ex.count>1?'In Progress':'Preparing'}</span></span><button className="gift-group-open" aria-label={`Open ${ex.name}`} disabled={busy} onClick={()=>open(ex.id)}><ChevronRight size={17}/></button></div>
    {ex.ownerId===accountId&&<span className="gift-host-badge"><Crown size={11}/>You’re the Host</span>}
    <div className="gift-group-metadata"><span><Users size={13}/>{ex.count} {ex.count===1?'Participant':'Participants'}</span><span><Wallet size={13}/>{ex.budget?`${ex.budget} Budget`:'No budget set'}</span><span><Calendar size={13}/>{ex.date?new Date(ex.date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'No date set'}</span></div>
    <div className="gift-group-card-footer"><div>{ex.recipientName?<><ShoppingBag size={20}/><span>You’re shopping for: <strong>{ex.recipientName} ♡</strong></span></>:ex.drawn?<><Lock size={20}/><span>Your secret person is ready<small>Reveal your assignment privately</small></span></>:!ex.wishlistEnabled?<><Info size={20}/><span>Your exchange plans<small>Wishlists are turned off</small></span></>:<><Gift size={20}/><span>{ex.yourWishlistUpdated?'Update Your Wishlist':'Add Your Wishlist'}<small>{ex.yourWishlistUpdated?'Keep your gift ideas up to date!':'Help your Santa find a gift.'}</small></span></>}</div><button className="santa-primary" disabled={busy} onClick={()=>open(ex.id,ex.drawn?(ex.revealViewed?'recipient':'hub'):ex.wishlistEnabled?'wishlist':'details',ex.drawn)}>{ex.drawn?(ex.recipientName?'View Wishlist':'Reveal My Person'):!ex.wishlistEnabled?'View Details':ex.yourWishlistUpdated?'Edit Wishlist':'Create Wishlist'}</button></div>
    </div></article>)}</div>:<div className="gift-filter-empty"><Gift size={34}/><p>{exchanges.length?'No exchanges in this category yet.':'Create an exchange or join one using a friend’s invite link.'}</p></div>}
    <button className="santa-primary gift-create-exchange" onClick={()=>setCreating(true)}><Plus size={26}/>Create New Exchange</button>
   </>}

  {showNameReveal&&exchange?.recipient&&<SantaNameReveal name={exchange.recipient.name} onViewed={markRevealViewed} onWishlist={()=>{markRevealViewed();setShowNameReveal(false);setTab('recipient');setFocusRecipient(false);}} onKeepSecret={()=>{setShowNameReveal(false);setTab('hub');setFocusRecipient(false);}}/>}
  <dialog className="gift-add-dialog" ref={modal} onCancel={event=>{
   if(busy)event.preventDefault();
   else setAdding(false);
  }} aria-labelledby="gift-add-title">
   <div className="gift-modal-head">
    <h2 id="gift-add-title"><Gift/>Add an Item</h2>
    <button type="button" disabled={busy} onClick={()=>setAdding(false)} aria-label="Close add gift popup"><X/></button>
   </div>
   <div className="gift-modal-divider" aria-hidden="true">♡</div>
   <p>Add a gift idea to your wishlist.</p>
   {error&&adding&&<p className="santa-error" role="alert">{error}</p>}
   <form onSubmit={event=>{
    event.preventDefault();
    saveItem();
   }}>
    <label>
     <span className="gift-field-label"><Link size={17}/>Product Link <small>(Recommended)</small></span>
     <input autoFocus type="url" placeholder="https://store.com/your-item" value={link} maxLength={2000} disabled={busy} onChange={event=>{
      updateProductLink(event.target.value);
     }} onPaste={event=>{
      const url=event.clipboardData.getData('text').trim();
      if(url.length>2000||!/^https?:\/\/\S+$/i.test(url))return;
      event.preventDefault();
      updateProductLink(url);
      previewLink(url);
     }}/>
    </label>
    {link.trim()&&!preview&&<button type="button" className="gift-fetch-details" disabled={busy} onClick={()=>previewLink(link)}>
     {busy?'Looking up item…':'Fill from link'}
    </button>}
    <div className="gift-modal-or" aria-hidden="true">or</div>
    <label>
     <span className="gift-field-label"><Tag size={17}/>Item Name</span>
     <input required maxLength={250} placeholder="e.g., Cozy blanket, perfume, headphones" value={itemTitle} onChange={event=>setItemTitle(event.target.value)}/>
    </label>
    <div className="gift-manual-fields">
     <label>
      <span className="gift-field-label"><Tag size={17}/>Price <small>(Optional)</small></span>
      <input maxLength={40} placeholder="$0.00" value={itemPrice} onChange={event=>setItemPrice(event.target.value)}/>
     </label>
     <label>
      <span className="gift-field-label">Size / Color <small>(Optional)</small></span>
      <input maxLength={120} placeholder="e.g., Medium / Pink" value={itemVariant} onChange={event=>setItemVariant(event.target.value)}/>
     </label>
    </div>
    {preview&&<div className="gift-product-preview">
     <ItemCard item={{...preview.product,title:itemTitle||preview.product.title,id:'preview',note:'',addedAt:0}}/>
     {preview.warning&&<p className="gift-preview-warning">{preview.warning}</p>}
     <small>Store prices can change. Check the product page before buying.</small>
    </div>}
    <label>
     <span className="gift-field-label"><NotebookPen size={17}/>Notes <small>(Optional)</small></span>
     <textarea maxLength={600} rows={3} placeholder="Add any details, preferences, or a specific style you like…" value={note} onChange={event=>setNote(event.target.value)}/>
    </label>
    <button className="santa-primary" disabled={busy||!itemTitle.trim()}>
     <Gift size={19}/>Add Item
    </button>
   </form>
  </dialog>
 </section>;
}

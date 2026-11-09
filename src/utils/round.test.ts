import test from 'node:test';
import assert from 'node:assert/strict';
import {newRound,moveRound,canPlay,mustTakeDrawStack,leaveRound,automaticMove,Round} from './round';
import {Card,Player} from '../types/game';
import {createDeck} from './deck';
let seq=0;const card=(value:Card['value'],color:Card['color']='red'):Card=>({id:`test-${seq++}`,value,color,score:0});
const players=():Player[]=>Array.from({length:4},(_,i)=>({id:`p${i}`,name:`Player ${i}`,avatar:'',title:'',type:i?'bot':'human',hand:[],hasCalledGlam:false,score:0}));
function rig(hand:Card[],other=card('5'),pending=0,pendingType:Round['pendingType']=null):Round {const r=newRound(players());r.players[0].hand=hand;r.players[1].hand=[other,card('9')];r.discard=[card('7')];r.color='red';r.pending=pending;r.pendingType=pendingType;return r;}
test('108 unique cards; deal seven each without losing cards',()=>{const r=newRound(players());assert.equal(r.deck.length,79);assert.equal(r.players.flatMap(p=>p.hand).length,28);assert.equal(new Set([...r.deck,...r.discard,...r.players.flatMap(p=>p.hand)].map(c=>c.id)).size,108);});
test('mixed-color same numbers, last sets color, automatic UNO',()=>{const a=card('7'),b=card('7','blue'),c=card('7','green');const r=rig([a,b,c,card('3')]);const n=moveRound(r,{type:'play',ids:[a.id,b.id,c.id]});assert.equal(n.color,'green');assert.equal(n.players[0].hand.length,1);assert.equal(n.uno,'p0');assert.equal(n.humanPlayed,3);assert.equal(n.active,1);assert.equal(r.players[0].hand.length,4);});
test('invalid batch or unplayable first card is rejected',()=>{const a=card('3','blue'),b=card('4','red'),r=rig([a,b]);assert.equal(moveRound(r,{type:'play',ids:[a.id]}),r);assert.equal(moveRound(r,{type:'play',ids:[b.id,a.id]}),r);assert.equal(moveRound(r,{type:'play',ids:[b.id,b.id]}),r);});
test('wild +4 at any time, even with matching color available',()=>{const a=card('wild4','wild'),r=rig([a,card('2')]);const n=moveRound(r,{type:'play',ids:[a.id],color:'yellow'});assert.equal(n.pending,4);assert.equal(n.active,1);assert.equal(n.players[1].hand.length,2);assert.equal(n.color,'yellow');});
test('draw two stacks by type across colors, rejects mixed +4',()=>{const a=card('draw2','blue'),b=card('wild4','wild'),r=rig([a,b,card('3')],card('5'),4,'draw2');assert.equal(canPlay(r,b),false);const n=moveRound(r,{type:'play',ids:[a.id]});assert.equal(n.pending,6);assert.equal(n.pendingType,'draw2');const taken=moveRound(n,{type:'draw'});assert.equal(taken.players[1].hand.length,8);assert.equal(taken.pending,0);assert.equal(taken.active,2);});
test('draw four stacks to eight; no immediate drawing',()=>{const a=card('wild4','wild'),r=rig([a,card('3')],card('5'),4,'wild4');const n=moveRound(r,{type:'play',ids:[a.id],color:'blue'});assert.equal(n.pending,8);assert.equal(n.players[1].hand.length,2);assert.equal(moveRound(n,{type:'draw'}).players[1].hand.length,10);});
test('finishing on any draw card ends immediately without penalty',()=>{for(const value of ['draw2','wild4'] as const){const a=card(value,value==='wild4'?'wild':'red'),r=rig([a],card('5'),value==='wild4'?4:2,value);const n=moveRound(r,{type:'play',ids:[a.id],color:'green'});assert.equal(n.winner,'p0');assert.equal(n.pending,0);assert.equal(n.players[1].hand.length,2);assert.equal(moveRound(n,{type:'draw'}),n);}});
test('normal draw takes exactly one and does not loop',()=>{const r=rig([card('2','green')]);r.deck=[card('8','blue')];const n=moveRound(r,{type:'draw'});assert.equal(n.players[0].hand.length,2);assert.equal(n.deck.length,r.deck.length-1);assert.equal(n.active,1);});
test('recycling preserves discard top and never creates a new deck',()=>{const r=rig([card('2')]);const top=card('3'),spare=card('8');r.deck=[];r.discard=[spare,top];const n=moveRound(r,{type:'draw'});assert.deepEqual(n.discard,[top]);assert.equal(n.players[0].hand.at(-1)?.id,spare.id);});
test('skip and reverse; 0 and 7 do not swap hands',()=>{for(const value of ['skip','reverse','0','7'] as const){const a=card(value),r=rig([a,card('4')]),n=moveRound(r,{type:'play',ids:[a.id]});assert.equal(n.active,value==='skip'?2:value==='reverse'?3:1);assert.equal(n.players[1].hand.length,2);}});
test('two-player reverse returns turn to same player',()=>{const a=card('reverse'),r=rig([a,card('2')]);r.players=r.players.slice(0,2);assert.equal(moveRound(r,{type:'play',ids:[a.id]}).active,0);});
test('many real rounds conserve all 108 unique cards',()=>{for(let game=0;game<20;game++){let r=newRound(players());for(let turn=0;turn<500&&!r.winner;turn++){const legal=r.players[r.active].hand.filter(c=>canPlay(r,c));r=legal.length?moveRound(r,{type:'play',ids:[legal[0].id],color:'blue'}):moveRound(r,{type:'draw'});const all=[...r.deck,...r.discard,...r.players.flatMap(p=>p.hand)];assert.equal(all.length,108);assert.equal(new Set(all.map(c=>c.id)).size,108);}}});

test('draw penalties are automatic only when matching stack type is absent',()=>{
 for(const type of ['draw2','wild4'] as const){
  const other=type==='draw2'?'wild4':'draw2';
  const r=rig([card(other,other==='wild4'?'wild':'blue'),card('3')],card('5'),type==='draw2'?6:8,type);
  assert.equal(mustTakeDrawStack(r),true);
  const n=moveRound(r,{type:'draw'});assert.equal(n.players[0].hand.length,2+r.pending);assert.equal(n.active,1);assert.equal(n.pending,0);
  r.players[0].hand.push(card(type,type==='wild4'?'wild':'green'));assert.equal(mustTakeDrawStack(r),false);
  r.winner='p1';assert.equal(mustTakeDrawStack(r),false);
 }
 assert.equal(mustTakeDrawStack(newRound(players())),false);
});

test('playable normal draw stays available without allowing repeated draws',()=>{
 const drawn=card('7','blue'),existing=card('3','red'),r=rig([existing]);r.deck=[card('9','green'),drawn];
 const n=moveRound(r,{type:'draw'});assert.equal(n.active,0);assert.equal(n.drawnCardId,drawn.id);assert.equal(canPlay(n,drawn),true);assert.equal(canPlay(n,existing),true);
 const played=moveRound(n,{type:'play',ids:[drawn.id]});assert.equal(played.active,1);assert.equal(played.color,'blue');assert.equal(played.players[0].hand.length,1);
 const declined=moveRound(n,{type:'draw'});assert.equal(declined.active,1);assert.equal(declined.deck.length,n.deck.length);assert.equal(declined.players[0].hand.length,n.players[0].hand.length);
});
test('a plucked Wild +4 can be played with a chosen color',()=>{
 const drawn=card('wild4','wild'),r=rig([card('3')]);r.deck=[drawn];const n=moveRound(r,{type:'draw'});assert.equal(n.active,0);
 const played=moveRound(n,{type:'play',ids:[drawn.id],color:'green'});assert.equal(played.pending,4);assert.equal(played.color,'green');assert.equal(played.active,1);
});

test('Skip after a playable draw ends turn without another draw',()=>{const drawn=card('7','blue'),r=rig([card('3')]);r.deck=[card('2'),drawn];const n=moveRound(r,{type:'draw'});const skipped=moveRound(n,{type:'skip'});assert.equal(skipped.active,1);assert.equal(skipped.players[0].hand.length,2);assert.equal(skipped.deck.length,1);assert.equal(skipped.drawnCardId,null);});
test('Skip can decline a matching stack and take full penalty',()=>{for(const type of ['draw2','wild4'] as const){const matching=card(type,type==='wild4'?'wild':'red'),r=rig([matching,card('3')],card('5'),type==='draw2'?6:8,type);assert.equal(mustTakeDrawStack(r),false);const n=moveRound(r,{type:'skip'});assert.equal(n.players[0].hand.length,2+r.pending);assert.ok(n.players[0].hand.some(c=>c.id===matching.id));assert.equal(n.pending,0);assert.equal(n.active,1);}});
test('Skip cannot bypass drawing on a normal fresh turn',()=>{const r=rig([card('3')]);assert.equal(moveRound(r,{type:'skip'}),r);});
test('five-player rounds deal correctly and conserve the deck',()=>{const seats=players();seats.push({...seats[1],id:'p4',name:'Fifth player'});let r=newRound(seats);assert.equal(r.players.length,5);assert.equal(r.deck.length,72);assert.equal(r.players.flatMap(p=>p.hand).length,35);for(let t=0;t<250&&!r.winner;t++){const options=r.players[r.active].hand.filter(c=>canPlay(r,c));r=options.length?moveRound(r,{type:'play',ids:[options[0].id],color:'red'}):moveRound(r,{type:'draw'});assert.ok(r.active>=0&&r.active<5);const all=[...r.deck,...r.discard,...r.players.flatMap(p=>p.hand)];assert.equal(all.length,108);assert.equal(new Set(all.map(c=>c.id)).size,108);}});

test('five seats follow a full clockwise cycle, reverse back, and skip exactly one seat',()=>{
 for(const type of ['bot','human'] as const){
  let r=newRound(Array.from({length:5},(_,i)=>({id:`seat${i}`,name:`Seat ${i}`,avatar:'',title:'',type:i?type:'human' as const,hand:[],hasCalledGlam:false,score:0})));
  r.color='red';r.discard=[card('0')];
  r.players.forEach(p=>{p.hand=[card('1'),card('reverse'),card('skip'),card('3')];});
  for(let seat=0;seat<5;seat++){
   assert.equal(r.active,seat);
   r=moveRound(r,{type:'play',ids:[r.players[seat].hand[0].id]});
  }
  assert.equal(r.active,0);
  r=moveRound(r,{type:'play',ids:[r.players[0].hand.find(c=>c.value==='reverse')!.id]});
  assert.equal(r.direction,-1);assert.equal(r.active,4);
  r=moveRound(r,{type:'play',ids:[r.players[4].hand.find(c=>c.value==='skip')!.id]});
  assert.equal(r.active,2);
  r=moveRound(r,{type:'play',ids:[r.players[2].hand.find(c=>c.value==='3')!.id]});
  assert.equal(r.active,1);
 }
});

test('leaving preserves cards and chooses the next surviving seat in either direction',()=>{
 for(const direction of [1,-1] as const)for(let active=0;active<5;active++)for(let leaving=0;leaving<5;leaving++){
  const seats=Array.from({length:5},(_,i)=>({...players()[0],id:`leave${i}`}));
  const before={...newRound(seats),active,direction};
  const expected=before.players[leaving===active?(active+direction+5)%5:active].id;
  const after=leaveRound(before,before.players[leaving].id);
  assert.equal(after.players.length,4);assert.equal(after.players[after.active].id,expected);
  assert.equal(after.deck.length+after.discard.length+after.players.reduce((n,p)=>n+p.hand.length,0),108);
  assert.equal(before.players.length,5);
 }
});
test('leaving cancels the departing active player penalty and the final remaining player wins',()=>{
 const before=newRound(players().slice(0,2));before.pending=4;before.pendingType='wild4';before.drawnCardId=before.players[0].hand[0].id;
 const after=leaveRound(before,before.players[0].id);
 assert.equal(after.winner,before.players[1].id);assert.equal(after.pending,0);assert.equal(after.pendingType,null);assert.equal(after.drawnCardId,null);
});

test('normal pluck permits a matching hand card or matching-number batch',()=>{
 const first=card('3'),second=card('3','green'),drawn=card('8','blue'),r=rig([first,second,card('1','yellow')]);r.deck=[drawn];
 const after=moveRound(r,{type:'draw'});assert.equal(after.active,0);assert.equal(after.drawnCardId,drawn.id);assert(canPlay(after,first));
 const batch=moveRound(after,{type:'play',ids:[first.id,second.id]});assert.equal(batch.active,1);assert.equal(batch.color,'green');assert.equal(batch.players[0].hand.length,2);
});
test('penalty pluck ends turn even when it adds a matching playable card',()=>{
 const r=rig([card('1','blue')],card('5'),2,'draw2');r.deck=[card('7'),card('draw2')];
 const after=moveRound(r,{type:'draw'});assert.equal(after.active,1);assert.equal(after.drawnCardId,null);assert.equal(after.players[0].hand.length,3);
});
test('automatic play chooses legal cards, supplies a Wild color, and handles draw/skip',()=>{
 let r=rig([card('8','blue')]);assert.deepEqual(automaticMove(r),{type:'draw'});
 r.drawnCardId=r.players[0].hand[0].id;assert.deepEqual(automaticMove(r),{type:'skip'});
 r=rig([card('wild4','wild'),card('2','green')]);const wild=automaticMove(r);assert.equal(wild.type,'play');assert.equal(moveRound(r,wild).color,'green');
 r=rig([card('3'),card('3','blue'),card('8','green')]);const normal=automaticMove(r);assert.equal(normal.type,'play');if(normal.type==='play')assert.equal(normal.ids.length,1);assert.notEqual(moveRound(r,normal),r);
});

test('the previous winner opens the next round without changing seat order',()=>{
 const seats=players(),r=newRound(seats,7,seats[2].id);assert.equal(r.active,2);assert.deepEqual(r.players.map(p=>p.id),seats.map(p=>p.id));
 assert.equal(newRound(seats,7,'departed-winner').active,0);
});


test('multiple mixed-color +2 cards accumulate every card and extend existing penalties',()=>{
 for(const pending of [0,4]){
  const cards=[card('draw2'),card('draw2','blue'),card('draw2','green'),card('draw2','yellow')];
  const r=rig([...cards,card('3')],card('5'),pending,pending?'draw2':null);
  const n=moveRound(r,{type:'play',ids:cards.map(c=>c.id)});
  assert.equal(n.pending,pending+8);assert.equal(n.pendingType,'draw2');assert.equal(n.color,'yellow');assert.equal(n.active,1);assert.equal(n.players[0].hand.length,1);
  const drawn=moveRound(n,{type:'draw'});assert.equal(drawn.players[1].hand.length,2+pending+8);assert.equal(drawn.active,2);
 }
});
test('+2 batches require a legal first card and cannot mix action types',()=>{
 const blue=card('draw2','blue'),red=card('draw2'),wild=card('wild4','wild');const r=rig([blue,red,wild,card('3')]);
 assert.equal(moveRound(r,{type:'play',ids:[blue.id,red.id]}),r);
 assert.equal(moveRound(r,{type:'play',ids:[red.id,wild.id],color:'green'}),r);
});


test('ten-player ten-card deal reserves a numeric opening card and preserves all 108 cards',()=>{const seats=Array.from({length:10},(_,i)=>({...players()[0],id:`ten-${i}`}));const r=newRound(seats,10);assert(r.players.every(p=>p.hand.length===10));assert.equal(r.deck.length,7);assert.match(r.discard[0].value,/^\d$/);assert.equal(new Set([...r.deck,...r.discard,...r.players.flatMap(p=>p.hand)].map(c=>c.id)).size,108);});

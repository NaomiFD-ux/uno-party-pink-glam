import {Card,CardColor,Player,PlayDirection} from '../types/game';
import {createDeck,shuffleDeck,isValidPlay} from './deck';
export interface Round {players:Player[];deck:Card[];discard:Card[];color:CardColor;direction:PlayDirection;active:number;pending:number;pendingType:'draw2'|'wild4'|null;winner:string|null;turns:number;humanPlayed:number;uno:string|null;drawnCardId?:string|null;}
export type Move={type:'play';ids:string[];color?:CardColor}|{type:'draw'}|{type:'skip'};
export function newRound(players:Player[],size=7,firstPlayerId?:string):Round {const deck=createDeck(),seats=players.map(p=>({...p,hand:[] as Card[],hasCalledGlam:false}));for(let i=0;i<size;i++)for(const p of seats)p.hand.push(deck.pop()!);const first=deck.splice(deck.findIndex(c=>/^\d$/.test(c.value)),1)[0];return {players:seats,deck,discard:[first],color:first.color,direction:1,active:Math.max(0,seats.findIndex(p=>p.id===firstPlayerId)),pending:0,pendingType:null,winner:null,turns:0,humanPlayed:0,uno:null};}
export function canPlay(r:Round,c:Card){return !r.winner&&(r.pending?c.value===r.pendingType:isValidPlay(c,r.discard.at(-1)!,r.color));}
export function moveRound(old:Round,m:Move):Round {
 if(old.winner)return old;const r:Round={...old,players:old.players.map(p=>({...p,hand:[...p.hand]})),deck:[...old.deck],discard:[...old.discard],uno:null},p=r.players[r.active];
 const next=(steps=1)=>{r.active=(r.active+r.direction*steps+r.players.length*steps)%r.players.length;r.turns++;};
 if(m.type==='skip')return old.pending||old.drawnCardId?moveRound(old,{type:'draw'}):old;
 if(m.type==='draw'){
  if(r.drawnCardId){r.drawnCardId=null;next();return r;}
  const penalty=r.pending>0;let drawn:Card|undefined;
  for(let n=0;n<(r.pending||1);n++){if(!r.deck.length&&r.discard.length>1){const top=r.discard.pop()!;r.deck=shuffleDeck(r.discard);r.discard=[top];}const c=r.deck.pop();if(!c)break;p.hand.push(c);drawn=c;}
  p.hasCalledGlam=p.hand.length===1;r.pending=0;r.pendingType=null;
  if(!penalty&&drawn&&p.hand.some(card=>isValidPlay(card,r.discard.at(-1)!,r.color))){r.drawnCardId=drawn.id;return r;}
  r.drawnCardId=null;next();return r;
 }
 if(!m.ids.length||new Set(m.ids).size!==m.ids.length)return old;const found=m.ids.map(id=>p.hand.find(c=>c.id===id));if(found.some(c=>!c))return old;const cards=found as Card[],first=cards[0],last=cards.at(-1)!;
 if(!canPlay(r,first)||cards.length>1&&(!/^\d$/.test(first.value)||cards.some(c=>c.value!==first.value)))return old;
 if(last.color==='wild'&&(!m.color||m.color==='wild'))return old;
 r.drawnCardId=null;
 p.hand=p.hand.filter(c=>!m.ids.includes(c.id));r.discard.push(...cards);r.color=last.color==='wild'?m.color!:last.color;if(p.type==='human')r.humanPlayed+=cards.length;p.hasCalledGlam=p.hand.length===1;if(p.hand.length===1)r.uno=p.id;
 if(!p.hand.length){r.winner=p.id;r.pending=0;r.pendingType=null;r.turns++;return r;}
 let steps=1;if(last.value==='reverse'){r.direction=(r.direction*-1) as PlayDirection;if(r.players.length===2)steps=2;}if(last.value==='skip')steps=2;if(last.value==='draw2'||last.value==='wild4'){r.pending+=last.value==='draw2'?2:4;r.pendingType=last.value;}next(steps);return r;
}

export function mustTakeDrawStack(r:Round):boolean {
 return !r.winner && r.pending>0 && !r.players[r.active].hand.some(card=>card.value===r.pendingType);
}

/** Explicitly withdraw a seat; disconnects still preserve the seat for reconnect. */
export function leaveRound(old:Round,playerId:string):Round {
 const leaving=old.players.find(p=>p.id===playerId);
 if(!leaving||old.winner)return old;
 const activeId=old.players[old.active].id;
 const players=old.players.filter(p=>p.id!==playerId).map(p=>({...p,hand:[...p.hand]}));
 let nextId=activeId;
 if(activeId===playerId&&players.length){
  const index=(old.active+old.direction+old.players.length)%old.players.length;
  nextId=old.players[index].id;
 }
 return {...old,players,deck:shuffleDeck([...old.deck,...leaving.hand]),discard:[...old.discard],
  active:Math.max(0,players.findIndex(p=>p.id===nextId)),
  winner:players.length===1?players[0].id:null,
  turns:old.turns+(activeId===playerId?1:0),uno:null,
  ...(activeId===playerId?{pending:0,pendingType:null,drawnCardId:null}:{}),
 };
}

/** One legal automatic action. A normal draw can be followed by a play. */
export function automaticMove(r:Round):Move {
 const player=r.players[r.active],choices=player.hand.filter(card=>canPlay(r,card));
 const first=choices.find(card=>card.color!=='wild')||choices[0];
 if(!first)return {type:r.drawnCardId?'skip':'draw'};
 const colors:CardColor[]=['red','blue','green','yellow'];
 colors.sort((a,b)=>player.hand.filter(c=>c.color===b).length-player.hand.filter(c=>c.color===a).length);
 return {type:'play',ids:[first.id],color:colors[0]};
}

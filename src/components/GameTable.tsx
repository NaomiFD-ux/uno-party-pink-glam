import type {RoomView} from '../online/protocol';
import type {Round} from '../utils/round';
// @refresh reset
import {EchoEffect} from './EchoEffect';
import {newRound,moveRound,canPlay,mustTakeDrawStack,Move} from '../utils/round';
import { CardCountFan } from './CardCountFan';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Card, CardColor, Player, PlayDirection, GameSettings } from '../types/game';
import { CardView } from './CardView';
import { ColorPickerModal } from './ColorPickerModal';
import { VictoryModal } from './VictoryModal';
import { BOT_PERSONALITIES } from '../utils/deck';
import { soundFX } from '../utils/audio';
import {
  Sparkles,
  RefreshCw,
  MessageCircle,
  Send,
  X,
  Volume2,
  VolumeX,
  Flame,
  Settings,
  LogOut,
} from 'lucide-react';

interface GameTableProps {
  online?:{room:RoomView;send:(type:string,payload?:unknown)=>Promise<void>};
  paused?: boolean;
  tableName: string;
  settings: GameSettings;
  userAvatar: string;
  userName: string;
  onMatchComplete: (record: {
    placement: number;
    cardsPlayed: number;
    turns: number;
  }) => void;
  onBackToLobby: () => void;
  onOpenSettings: () => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  online,
  paused = false,
  tableName,
  settings,
  userAvatar,
  userName,
  onMatchComplete,
  onBackToLobby,
  onOpenSettings,
}) => {
  const selfId=online?.room.you||'player_human';
  const mapId=(id:string)=>id===selfId?'player_human':id;
  function viewRound(view:RoomView):Round{const r=view.round!,ordered=[...r.players];const self=ordered.findIndex(p=>p.id===view.you);ordered.push(...ordered.splice(0,self));return {players:ordered.map(p=>({id:p.id===view.you?'player_human':p.id,name:p.name,avatar:p.avatar||'/default-avatar.svg',title:'',type:p.id===view.you?'human':'bot',hand:p.id===view.you?r.hand:Array.from({length:p.count},(_,i)=>({id:`hidden_${p.id}_${i}`,color:'wild',value:'wild',score:0})),hasCalledGlam:p.uno,score:0})),deck:[],discard:r.discard,color:r.color,direction:r.direction,active:ordered.findIndex(p=>p.id===r.activeId),pending:r.pending,pendingType:r.pendingType,winner:r.winner?(r.winner===view.you?'player_human':r.winner):null,turns:r.turns,humanPlayed:0,uno:view.event?.kind==='play'&&r.players.find(p=>p.id===view.event?.actorId)?.count===1?(view.event.actorId===view.you?'player_human':view.event.actorId):null,drawnCardId:r.drawnCardId};}
  const [phase,setPhase]=useState<'shuffle'|'deal'|'playing'>(()=>online&&Date.now()-online.room.round!.startedAt>3500?'playing':'shuffle');
  const [round,setRound]=useState(()=>online?viewRound(online.room):newRound([{id:'player_human',name:userName||'You',avatar:userAvatar,title:'',type:'human',hand:[],hasCalledGlam:false,score:0},...BOT_PERSONALITIES.map((b,i)=>({...b,id:`bot_${i}`,type:'bot' as const,hand:[],hasCalledGlam:false,score:0}))],settings.initialHandSize));
  const [sessionWins,setSessionWins]=useState<Record<string,number>>({});
  const [isMuted,setIsMuted]=useState(soundFX.getMuted());
  const [showChatMenu,setShowChatMenu]=useState(false);
  const [showExit,setShowExit]=useState(false);
  const [leaving,setLeaving]=useState(false);
  const [leaveError,setLeaveError]=useState('');
  const leaveMatch=async()=>{
    setLeaving(true);setLeaveError('');
    try{if(online)await online.send('leave');else onBackToLobby();}
    catch(error){setLeaveError((error as Error).message);}
    finally{setLeaving(false);}
  };
  const [reaction,setReaction]=useState('');
  const [chatDraft,setChatDraft]=useState('');
  const [reactionVersion,setReactionVersion]=useState(0);
  const [sendEffect,setSendEffect]=useState<'normal'|'slam'|'echo'>('normal');
  const [messageEffect,setMessageEffect]=useState<{type:'slam'|'echo';text:string;id:number;senderId:string}|null>(null);
  const [botMessage,setBotMessage]=useState<{senderId:string;text:string;id:number}|null>(null);
  const demoBotIndex=useRef(0);
  useEffect(()=>{if(!botMessage)return;const timer=setTimeout(()=>setBotMessage(null),5000);return()=>clearTimeout(timer);},[botMessage]);
  const chatInput=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(showChatMenu)chatInput.current?.focus();},[showChatMenu]);
  const [pendingWildCard,setPendingWildCard]=useState<Card|null>(null);
  const [batch,setBatch]=useState<Card[]>([]);
  const reported=useRef<string|null>(null);
  const {players,deck,discard:discardPile,color:currentColor,direction,active:activePlayerIndex}=round;
  const topCard=discardPile.at(-1)!,humanPlayer=players[0],isHumanTurn=activePlayerIndex===0&&!round.winner;
  const gameWinner=players.find(p=>p.id===round.winner)||null,isColorPickerOpen=!!pendingWildCard;
  const rootRef=useRef<HTMLDivElement>(null);
  const [dealPaths,setDealPaths]=useState<Record<string,{x:number;y:number;dx:number;dy:number}>>({});
  const dealSeatIds=(online?.room.round?.players.map(p=>mapId(p.id))||players.map(p=>p.id));
  const dealSeatKey=dealSeatIds.join(',');
  useLayoutEffect(()=>{
    if(paused)return;
    document.documentElement.classList.add('game-viewport-locked');
    return()=>document.documentElement.classList.remove('game-viewport-locked');
  },[paused]);
  useLayoutEffect(()=>{
    const root=rootRef.current;
    if(!root||paused||phase==='playing')return;
    const measure=()=>{
      const bounds=root.getBoundingClientRect(),source=root.querySelector('.shuffle-stack')?.getBoundingClientRect();
      if(!source?.width)return;
      const x=source.left+source.width/2-bounds.left-22,y=source.top+source.height/2-bounds.top-33;
      const paths:Record<string,{x:number;y:number;dx:number;dy:number}>={};
      for(const seat of root.querySelectorAll<HTMLElement>('[data-player-id]')){
        const id=seat.dataset.playerId!;
        const target=(id==='player_human'?root.querySelector('.hand-cards'):seat.querySelector('.card-count-fan'))||seat;
        const rect=target.getBoundingClientRect();
        paths[id]={x,y,dx:rect.left+rect.width/2-source.left-source.width/2,dy:rect.top+rect.height/2-source.top-source.height/2};
      }
      setDealPaths(paths);
    };
    measure();
    const observer=new ResizeObserver(measure);observer.observe(root);
    window.addEventListener('resize',measure);
    return()=>{observer.disconnect();window.removeEventListener('resize',measure);};
  },[phase,paused,dealSeatKey]);
  const liveRound=useRef(round);liveRound.current=round;
  const busyRef=useRef(false);
  const [drawing,setDrawing]=useState(false);
  const [receivingCards,setReceivingCards]=useState<Record<string,number>>({});
  const [drawFlight,setDrawFlight]=useState<{id:number;count:number;x:number;y:number;dx:number;dy:number}|null>(null);
  const flightTimers=useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(()=>()=>{flightTimers.current.forEach(clearTimeout);if('speechSynthesis' in window)window.speechSynthesis.cancel();},[]);
  const animateTransition=(before:Round,next:Round,move:Move)=>{ 
    if(!online&&next.winner&&!before.winner){const winnerId=next.winner;setSessionWins(wins=>({...wins,[winnerId]:(wins[winnerId]||0)+1}));}
    if(move.type==='draw'||move.type==='skip') {
      const player=before.players[before.active],count=next.players[before.active].hand.length-player.hand.length;
      const source=rootRef.current?.querySelector('[aria-label="Draw card"]')?.getBoundingClientRect();
      const target=rootRef.current?.querySelector(`[data-player-id="${player.id}"]`)?.getBoundingClientRect();
      if(count&&source&&target){
        if(player.type==='human'){
          const incoming=next.players[before.active].hand.slice(player.hand.length);
          setReceivingCards(Object.fromEntries(incoming.map((card,i)=>[card.id,200+i*80])));
        }
        busyRef.current=true;setDrawing(true);setDrawFlight({id:Date.now(),count,x:source.x+source.width/2-20,y:source.y+source.height/2-30,dx:target.x+target.width/2-source.x-source.width/2,dy:target.y+target.height/2-source.y-source.height/2});
        for(let i=0;i<count;i++)flightTimers.current.push(setTimeout(()=>soundFX.playCardDeal(),i*80));
        flightTimers.current.push(setTimeout(()=>{setDrawFlight(null);setReceivingCards({});setDrawing(false);busyRef.current=false;},(count-1)*80+(player.type==='human'?470:320)));
      }
    } else {
      const played=next.discard.at(-1)!;
      if(played.value==='skip')soundFX.playSkipPunch();
      else if(played.value==='reverse')soundFX.playReverse();
      else soundFX.playCardPlay();
    }
    liveRound.current=next;setRound(next);setBatch([]);
  };
  const act=(move:Move)=>{if(busyRef.current)return;if(online){void online.send('move',{move}).then(()=>setBatch([])).catch(()=>{});return;}const before=liveRound.current,next=moveRound(before,move);if(next!==before)animateTransition(before,next,move);};
  const lastOnlineEvent=useRef(online?.room.event?.id),lastOnlineRound=useRef(online?.room.round?.id),lastOnlineMessage=useRef<string|null>(null);
  useEffect(()=>{if(!online)return;const next=viewRound(online.room);setSessionWins(Object.fromEntries(Object.entries(online.room.wins).map(([id,n])=>[mapId(id),n])));
    if(lastOnlineRound.current!==online.room.round!.id){lastOnlineRound.current=online.room.round!.id;lastOnlineEvent.current=online.room.event?.id;flightTimers.current.forEach(clearTimeout);busyRef.current=false;setDrawing(false);setReceivingCards({});setDrawFlight(null);setPhase('shuffle');setBatch([]);setPendingWildCard(null);liveRound.current=next;setRound(next);return;}
    const event=online.room.event;if(event&&event.id!==lastOnlineEvent.current){lastOnlineEvent.current=event.id;if(event.kind==='leave'){liveRound.current=next;setRound(next);setBatch([]);setPendingWildCard(null);}else animateTransition(liveRound.current,next,event.kind==='play'?{type:'play',ids:[]}:{type:'draw'});}else{liveRound.current=next;setRound(next);}
    if(next.active!==0)setPendingWildCard(null);
  },[online?.room]);
  useEffect(()=>{const m=online?.room.message;if(!m||m.id===lastOnlineMessage.current||Date.now()-m.at>5000)return;lastOnlineMessage.current=m.id;const senderId=mapId(m.senderId);if(senderId==='player_human'){setReaction(m.text);setReactionVersion(n=>n+1);}else setBotMessage({senderId,text:m.text,id:m.at});if(m.effect!=='normal')setMessageEffect({type:m.effect,text:m.text,id:m.at,senderId});soundFX.playTap();},[online?.room.message?.id]);
  const startNewGame=()=>{if(online){void online.send('start').catch(()=>{});return;}flightTimers.current.forEach(clearTimeout);busyRef.current=false;setDrawing(false);setReceivingCards({});setDrawFlight(null);setRound(newRound(players,settings.initialHandSize));setPhase('shuffle');setBatch([]);setPendingWildCard(null);reported.current=null;};
  useEffect(()=>{if(phase==='shuffle'&&!paused)soundFX.playShuffle();},[phase,paused]);
  useEffect(()=>{if(paused||phase==='playing')return;const id=setTimeout(()=>setPhase(phase==='shuffle'?'deal':'playing'),phase==='shuffle'?950:2400);return()=>clearTimeout(id);},[phase,paused]);
  useEffect(()=>{
    if(online||drawing||paused||phase!=='playing'||pendingWildCard||!mustTakeDrawStack(round))return;
    const id=setTimeout(()=>act({type:'draw'}),450);
    return()=>clearTimeout(id);
  },[round,drawing,paused,phase,pendingWildCard]);
  useEffect(()=>{if(online||drawing||paused||phase!=='playing'||round.winner||pendingWildCard||mustTakeDrawStack(round)||round.players[round.active].type!=='bot')return;
   const id=setTimeout(()=>{const bot=round.players[round.active],choices=bot.hand.filter(c=>canPlay(round,c));if(!choices.length){act({type:'draw'});return;}const first=choices.find(c=>c.color!=='wild')||choices[0],group=!round.drawnCardId&&/^\d$/.test(first.value)?[first,...bot.hand.filter(c=>c.id!==first.id&&c.value===first.value)]:[first];const colors=['red','blue','green','yellow'] as CardColor[];colors.sort((a,b)=>bot.hand.filter(c=>c.color===b).length-bot.hand.filter(c=>c.color===a).length);act({type:'play',ids:group.map(c=>c.id),color:colors[0]});},1400);return()=>clearTimeout(id);
  },[round,paused,phase,pendingWildCard,drawing]);
  useEffect(()=>{if(!round.uno)return;const player=players.find(p=>p.id===round.uno);soundFX.playGlamShout();if(player&&!soundFX.getMuted()&&'speechSynthesis' in window)window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${player.name} has UNO!`));},[round.turns]);
  useEffect(()=>{if(online||!gameWinner||reported.current===gameWinner.id)return;reported.current=gameWinner.id;const sorted=[...players].sort((a,b)=>a.hand.length-b.hand.length);onMatchComplete({placement:(sorted.findIndex(p=>p.type==='human')+1),cardsPlayed:round.humanPlayed,turns:round.turns});},[round.winner]);
  const handleDrawCard=()=>{if(paused||pendingWildCard||round.drawnCardId||phase!=='playing'||!isHumanTurn)return;act({type:'draw'});};
  const handleSkipTurn=()=>{if(paused||drawing||pendingWildCard||phase!=='playing'||!isHumanTurn||(!round.drawnCardId&&!round.pending))return;act({type:'skip'});};
  const handleCardClick=(card:Card)=>{
    if(paused||pendingWildCard||drawing||phase!=='playing'||!isHumanTurn)return;
    if(batch.some(c=>c.id===card.id)){
      const remaining=batch.filter(c=>c.id!==card.id);
      setBatch(remaining.length&&!canPlay(round,remaining[0])?[]:remaining);return;
    }
    if(batch.length&&/^\d$/.test(batch[0].value)&&card.value===batch[0].value){setBatch(old=>[...old,card]);return;}
    if(!canPlay(round,card))return;
    const canCombine=!round.drawnCardId&&/^\d$/.test(card.value)&&humanPlayer.hand.some(other=>other.id!==card.id&&other.value===card.value);
    if(canCombine){setBatch([card]);return;}
    setBatch([]);
    if(card.color==='wild'){setPendingWildCard(card);return;}
    act({type:'play',ids:[card.id]});
  };
  const playSelected=()=>{
    if(paused||pendingWildCard||drawing||phase!=='playing'||!isHumanTurn||!batch.length||!canPlay(round,batch[0]))return;
    if(batch[0].color==='wild'){setPendingWildCard(batch[0]);return;}
    act({type:'play',ids:batch.map(c=>c.id)});
  };
  const handleSelectWildColor=(color:CardColor)=>{if(pendingWildCard)act({type:'play',ids:[pendingWildCard.id],color});setPendingWildCard(null);};
  const handleSendReaction=(text:string)=>{
    const message=text.trim().slice(0,120);if(!message)return;
    if(online){void online.send('message',{text:message,effect:sendEffect}).then(()=>{setChatDraft('');setShowChatMenu(false);setSendEffect('normal');}).catch(()=>{});return;}
    setReaction(message);setReactionVersion(n=>n+1);
    if(sendEffect!=='normal')setMessageEffect({type:sendEffect,text:message,id:Date.now(),senderId:'player_human'});
    setChatDraft('');setShowChatMenu(false);setSendEffect('normal');soundFX.playTap();
  };
  const previewBotMessage=(effect:'normal'|'slam'|'echo')=>{
    const bots=players.filter(player=>player.type==='bot');
    const bot=bots[demoBotIndex.current++%bots.length];if(!bot)return;
    const text=chatDraft.trim().slice(0,120)||(effect==='slam'?'Not today! 💥':effect==='echo'?'😂😂😂':'Your turn 👀');
    setBotMessage({senderId:bot.id,text,id:Date.now()});
    setMessageEffect(effect==='normal'?null:{type:effect,text,id:Date.now(),senderId:bot.id});
    setShowChatMenu(false);setChatDraft('');soundFX.playTap();
  };
  useEffect(()=>{
    if(!messageEffect)return;
    let shake:Animation|undefined;
    const scattering:Animation[]=[];
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(messageEffect.type==='slam'&&!reduced){
      shake=rootRef.current?.animate([
        {transform:'translate(0,0)'},{transform:'translate(-12px,8px) rotate(-1deg)'},
        {transform:'translate(12px,-8px) rotate(1deg)'},{transform:'translate(-6px,3px)'},
        {transform:'translate(5px,-3px)'},{transform:'translate(-3px,2px)'},
        {transform:'translate(2px,-1px)'},{transform:'translate(0,0)'}
      ],{duration:700,delay:100,easing:'ease-out'});
      const cards=rootRef.current?.querySelectorAll<HTMLElement>('.hand-card-slot');
      cards?.forEach((card,i)=>{
        const middle=(cards.length-1)/2;
        const x=(i-middle)*13;
        const y=-65-(i%3)*22;
        const angle=(i-middle)*6;
        scattering.push(card.animate([
          {transform:'translate(0,0) rotate(0deg)',offset:0},
          {transform:`translate(${x}px,${y}px) rotate(${angle}deg)`,offset:.25},
          {transform:`translate(${x*.8}px,${y*.75}px) rotate(${angle*.7}deg)`,offset:.48},
          {transform:'translate(0,6px) rotate(0deg)',offset:.84},
          {transform:'translate(0,0) rotate(0deg)',offset:1}
        ],{duration:1150,delay:100,easing:'cubic-bezier(.2,.7,.3,1)'}));
      });
    }
    const timer=setTimeout(()=>setMessageEffect(null),messageEffect.type==='echo'?5100:1400);
    return()=>{clearTimeout(timer);shake?.cancel();scattering.forEach(animation=>animation.cancel());};
  },[messageEffect]);
  useEffect(()=>{if(!reaction)return;const id=setTimeout(()=>setReaction(''),5000);return()=>clearTimeout(id);},[reaction,reactionVersion]);
  const getFeltClass=()=>({berry:'felt-table',ruby:'felt-table-ruby',emerald:'felt-table-emerald',midnight:'felt-table-midnight'}[settings.tableFelt]);
  return (
    <div ref={rootRef} data-player-count={players.length} data-message-effect={messageEffect?.type} data-phase={phase} data-felt={settings.tableFelt} className="game-screen relative w-full min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden select-none pb-4 pt-2 px-2 sm:px-4">
      {phase !== 'playing' && <div className={`deal-overlay ${phase}`} role="status" aria-live="polite"><div className="shuffle-stack"><i/><i/><i/><b>UNO</b></div>{phase === 'deal' && Array.from({length:settings.initialHandSize * players.length},(_,i)=><span key={i} className="flying-card" style={{left:dealPaths[dealSeatIds[i%players.length]]?.x,top:dealPaths[dealSeatIds[i%players.length]]?.y,'--deal-x':`${dealPaths[dealSeatIds[i%players.length]]?.dx||0}px`,'--deal-y':`${dealPaths[dealSeatIds[i%players.length]]?.dy||0}px`,animationDelay:`${i*Math.min(65,1900/Math.max(1,settings.initialHandSize*players.length-1))}ms`} as React.CSSProperties}>UNO</span>)}<h2>{phase === 'shuffle' ? 'A little shuffle ✦' : 'Your cards are on their way…'}</h2><p>{phase === 'shuffle' ? 'Fresh deck. Fresh possibilities.' : `${settings.initialHandSize} cards each. Let’s play.`}</p></div>}
      {showExit&&<div className="exit-match-backdrop"><section className="exit-match-dialog" role="dialog" aria-modal="true" aria-labelledby="exit-match-title"><h2 id="exit-match-title">Leave this match?</h2><p>Your current hand will be forfeited.</p>{leaveError&&<p role="alert">{leaveError}</p>}<div><button type="button" className="uno-secondary" disabled={leaving} onClick={()=>setShowExit(false)}>Stay</button><button type="button" className="uno-primary" disabled={leaving} onClick={()=>void leaveMatch()}>{leaving?'Leaving…':'Leave Match'}</button></div></section></div>}
      {/* Top Table Control Bar */}
      <div className="flex items-center justify-between gap-2 max-w-4xl mx-auto w-full z-20 mb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={()=>{setLeaveError('');setShowExit(true);}}
            className="px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-[#881B4D] font-bold text-xs shadow-xs border border-pink-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut size={13} />
            <span>Exit Game</span>
          </button>

          <div className="px-3 py-1 rounded-full bg-white/70 border border-pink-200 text-xs font-semibold text-[#881B4D] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate max-w-[120px] sm:max-w-none">{tableName}</span>
          </div>
        </div>

        {/* Turn indicator & Direction */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold flex items-center gap-1 border border-pink-300">
            <RefreshCw
              size={12}
              className={`transition-transform duration-500 ${direction === 1 ? 'rotate-0' : '-scale-x-100'}`}
            />
            <span className="hidden sm:inline">{direction === 1 ? 'Clockwise' : 'Counter'}</span>
            <span>{direction===1?'↻':'↺'}</span>
          </div>

          <button
            onClick={() => {
              const muted = soundFX.toggleMute();
              setIsMuted(muted);
            }}
            className="p-1.5 rounded-full bg-white/80 text-[#881B4D] border border-pink-200 hover:bg-white shadow-xs cursor-pointer"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-full bg-white/80 text-[#881B4D] border border-pink-200 hover:bg-white shadow-xs cursor-pointer"
            title="Settings" aria-label="Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* RADIAL CARD FELT TABLE */}
      <div
        className={`game-felt relative w-full max-w-4xl mx-auto h-[380px] sm:h-[430px] rounded-[48px] sm:rounded-[70px] ${getFeltClass()} border-4 sm:border-8 border-[#ffe8ed]/90 flex flex-col justify-between items-center p-3 sm:p-6 transition-all duration-300 relative overflow-visible`}
      >
        {/* Opponent Bots Row (Top 3 radial pods) */}
        <div className="opponents w-full flex items-center justify-around gap-2 z-20 pt-1">
          {players
            .filter((p) => p.type === 'bot')
            .map((bot, index) => {
              const isThisBotTurn = players[activePlayerIndex]?.id === bot.id;
              return (
                <div key={bot.id} data-player-id={bot.id} style={players.length>5?{position:'absolute',left:`${index<Math.ceil((players.length-1)/2)?4:74}%`,top:`${4+(index<Math.ceil((players.length-1)/2)?Math.ceil((players.length-1)/2)-1-index:index-Math.ceil((players.length-1)/2))*(68/Math.ceil((players.length-1)/2))}%`}:undefined} className="opponent relative flex flex-col items-center">
                  {botMessage?.senderId===bot.id&&<div className={`bot-chat-bubble ${messageEffect?.type==='slam'&&messageEffect.senderId===bot.id?'slam-message':''}`} role="status" aria-label={`${bot.name}: ${botMessage.text}`}>{botMessage.text}</div>}

                  <span className="game-player-name">{bot.name}</span>
                  {/* Avatar ring */}
                  <div
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-1 transition-all duration-300 ${
                      isThisBotTurn ? 'animate-turn-halo scale-105 z-20' : 'opacity-85'
                    }`}
                  >
                    <img
                      src={bot.avatar}
                      alt={bot.name}
                      className="w-full h-full rounded-full object-cover border-2 border-white shadow-md"
                    />

                    {/* Active turn badge */}
                    {isThisBotTurn && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-black border-2 border-white shadow-md">
                        ✦
                      </div>
                    )}
                  </div>

                  <CardCountFan count={bot.hand.length}/>
                  {bot.hand.length===1 && bot.hasCalledGlam && <span className="player-uno-badge">UNO!</span>}
                </div>
              );
            })}
        </div>

        {/* CENTER TABLE FELT: Draw Pile, Discard Pile, Active Color Gem */}
        <div className="table-piles relative flex items-center justify-center gap-4 sm:gap-8 my-auto z-10">
          {/* Active color ambient ring */}
          <div
            className={`absolute -inset-8 rounded-full blur-2xl opacity-40 transition-colors duration-500 pointer-events-none ${
              currentColor === 'red'
                ? 'bg-rose-500'
                : currentColor === 'blue'
                ? 'bg-blue-500'
                : currentColor === 'green'
                ? 'bg-emerald-500'
                : 'bg-amber-400'
            }`}
          />

          {/* DRAW PILE */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" role="button" tabIndex={0} aria-label="Draw card" onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleDrawCard();}}} onClick={handleDrawCard}>
              {/* Stacked effect layers */}
              <div className="absolute -top-1 -left-1 w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-pink-900/60 shadow-md transform -rotate-3" />
              <div className="absolute -top-0.5 -right-0.5 w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-pink-800/80 shadow-md transform rotate-2" />
              <CardView isBack size="md" className="group-hover:scale-105 transition-transform" />
            </div>
            <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-[10px] sm:text-xs font-bold border border-white/20">
              Draw
            </div>
          </div>

          {/* DISCARD PILE */}
          <div className="flex flex-col items-center">
            <div className={`relative discard-target ${batch.length?'ready-to-play':''}`} role="button" tabIndex={0} aria-label={batch.length?`Play ${batch.length} selected ${batch.length===1?'card':'cards'}`:'Select a card from your hand to play'} aria-disabled={!batch.length||!isHumanTurn} onClick={playSelected} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();playSelected();}}}>
              {discardPile.length > 1 && (
                <div className="absolute top-0 left-0 opacity-40" aria-hidden="true"><CardView
                  card={discardPile[discardPile.length - 2]}
                  size="md"
                  rotation={-14}
                /></div>
              )}
              {topCard && (
                <CardView
                  card={topCard}
                  chosenColor={currentColor}
                  size="md"
                  rotation={discardPile.length % 2 === 0 ? 5 : -4}
                  className="shadow-2xl"
                />
              )}
            </div>


          </div>
        </div>


      </div>

      {/* BOTTOM HUMAN PLAYER CONTROLS & DOCK */}
      <div className="hand-dock relative max-w-4xl mx-auto w-full z-20 mt-2">
        {/* Action pills row: Human status, GLAM Button, Chat */}
        <div className="player-controls flex items-center justify-between gap-2 mb-2 px-1">
          <div data-player-id="player_human" className="human-game-profile">
            {reaction&&<div className={`profile-chat-bubble ${messageEffect?.type==='slam'&&messageEffect.senderId==='player_human'?'slam-message':''} ${/^\p{Extended_Pictographic}$/u.test(reaction)?'emoji-bubble':''}`} role="status" aria-live="polite" aria-label={`${userName}: ${reaction}`}>{reaction}</div>}
            <span className="game-player-name">{userName} <small>(You)</small></span>
            <div className="human-profile-content"><img src={userAvatar} alt={userName} className={isHumanTurn?'human-avatar active':'human-avatar'}/><CardCountFan count={humanPlayer?.hand.length || 0}/>{humanPlayer.hand.length===1&&<span className="player-uno-badge">UNO!</span>}{isHumanTurn&&<span className="human-turn-dot" title="Your turn" aria-label="Your turn"/>}</div>
          </div>

          <div className="player-turn-slot">{isHumanTurn&&phase==='playing'&&!drawing&&!paused&&<span className="player-turn-label" role="status" aria-live="polite">YOUR TURN</span>}</div>
          {/* Quick Reaction & GLAM Shouting */}
          <div className="flex items-center gap-2">
            {/* Quick chat toggle */}
            <div className="relative">
              <button
                onClick={() => setShowChatMenu(!showChatMenu)}
                className="p-2 rounded-full bg-white/90 hover:bg-white text-pink-600 border border-pink-200 shadow-xs cursor-pointer"
                title="Chat" aria-label="Open chat" aria-expanded={showChatMenu}
              >
                <MessageCircle size={16} />
              </button>

              {showChatMenu && <section className="game-chat-composer" aria-label="Message or emoji" onKeyDown={e=>{if(e.key==='Escape')setShowChatMenu(false);}}><div className="chat-composer-heading"><strong>Say something</strong><button type="button" aria-label="Close chat" onClick={()=>setShowChatMenu(false)}><X size={16}/></button></div><div className="chat-emoji-options">{['😂','😭','😏','👀','🔥','💅','❤️','👏','😡','🖕'].map(emoji=><button key={emoji} type="button" aria-label={`Send ${emoji}`} onClick={()=>handleSendReaction(emoji)}>{emoji}</button>)}</div><div className="send-effect-options" role="group" aria-label="Message effect">{(['normal','slam','echo'] as const).map(effect=><button key={effect} type="button" aria-pressed={sendEffect===effect} onClick={()=>setSendEffect(effect)}>{effect==='normal'?'Normal':effect==='slam'?'💥 Slam':'✨ Echo'}</button>)}</div><form onSubmit={e=>{e.preventDefault();handleSendReaction(chatDraft);}}><input ref={chatInput} value={chatDraft} onChange={e=>setChatDraft(e.target.value)} maxLength={120} aria-label="Your message" placeholder="Message or any emoji…" autoComplete="off"/><button type="submit" aria-label="Send message" disabled={!chatDraft.trim()}><Send size={18}/></button></form>{!online&&process.env.NODE_ENV==='development'&&<div className="bot-chat-preview"><small>Try a bot message</small><div>{(['normal','slam','echo'] as const).map(effect=><button key={effect} type="button" onClick={()=>previewBotMessage(effect)}>Bot: {effect==='normal'?'Normal':effect==='slam'?'Slam':'Echo'}</button>)}</div></div>}</section>}
            </div>

            <button type="button" className="skip-turn-button" onClick={handleSkipTurn} disabled={!isHumanTurn||drawing||paused||!!pendingWildCard||phase!=='playing'||(!round.drawnCardId&&!round.pending)} aria-label={round.pending?`Skip stacking and draw ${round.pending} cards`:'Skip playing the drawn card'}>Skip</button>
          </div>
        </div>

        {/* HUMAN HAND CARDS FAN (Horizontally scrollable with peek-ahead on mobile) */}
        <div className="hand-tray relative w-full rounded-3xl glass-pearl p-2 sm:p-3 overflow-hidden border border-pink-200 shadow-lg">


          <div className="hand-cards flex items-center justify-start sm:justify-center overflow-x-auto py-2 px-3 -space-x-4 sm:-space-x-6 min-h-[145px]"
            style={{'--fan-grid': (humanPlayer?.hand.length || 1) <= 1 ? '70px' : `repeat(${Math.ceil((humanPlayer?.hand.length || 1) / Math.ceil((humanPlayer?.hand.length || 1) / 9)) - 1}, minmax(0, 1fr)) 70px`} as React.CSSProperties}>
            {humanPlayer?.hand.map((card, index) => {
              const playable = !drawing && isHumanTurn && (canPlay(round, card) || (batch.length>0 && /^\d$/.test(batch[0].value) && card.value===batch[0].value));
              // Calculate subtle radial rotation fan
              const totalCards = humanPlayer.hand.length;
              const rowSize = Math.ceil(totalCards / Math.ceil(totalCards / 9));
              const rowIndex = index % rowSize;
              const rowLength = Math.min(rowSize, totalCards - Math.floor(index / rowSize) * rowSize);
              const mid = (rowLength - 1) / 2;
              const angle = Math.max(-8, Math.min(8, (rowIndex - mid) * 2));

              return (
                <div
                  key={card.id}
                  className="hand-card-slot transition-transform duration-200 hover:z-30 focus:z-30 shrink-0"
                  style={{'--card-index': index, '--fan-angle': `${angle}deg`} as React.CSSProperties}
                >
                  {receivingCards[card.id]!==undefined ? <div className="receiving-card" style={{animationDelay:`${receivingCards[card.id]}ms`} as React.CSSProperties}><div className="receiving-back" aria-hidden="true"><b>UNO</b></div>
                  <CardView
                    card={card}
                    size="lg"
                    isPlayable={playable}
                    isSelected={batch.some(c=>c.id===card.id)}
                    rotation={angle}
                    elevateOnHover={playable}
                    onClick={() => handleCardClick(card)}
                  />
                  </div> : <CardView card={card} size="lg" isPlayable={playable} isSelected={batch.some(c=>c.id===card.id)} rotation={angle} elevateOnHover={playable} onClick={()=>handleCardClick(card)}/>}

                </div>
              );
            })}
          </div>
        </div>
      </div>

      {drawFlight&&<div className="draw-flight-layer" aria-hidden="true">{Array.from({length:drawFlight.count},(_,i)=><span key={`${drawFlight.id}-${i}`} className="draw-flight-card" style={{left:drawFlight.x,top:drawFlight.y,animationDelay:`${i*80}ms`,'--flight-x':`${drawFlight.dx}px`,'--flight-y':`${drawFlight.dy}px`} as React.CSSProperties}>UNO</span>)}</div>}
      {messageEffect?.type==='echo'&&<EchoEffect key={messageEffect.id} text={messageEffect.text}/>}
      {/* Color Picker Modal */}
      <ColorPickerModal
        isOpen={isColorPickerOpen}
        onSelectColor={handleSelectWildColor}
        title="Choose a color"
      />

      {/* Victory / Game Over Modal */}
      {gameWinner && (
        <VictoryModal
          isOpen={true}
          winner={gameWinner}
          players={players}
          humanPlayerId="player_human"
          sessionWins={sessionWins}
          playAgainDisabled={!!online&&online.room.hostId!==online.room.you}
          playAgainLabel={online&&online.room.hostId!==online.room.you?'Wait for host':'Play Again'}
          onPlayAgain={startNewGame}
          onGoToLobby={onBackToLobby}
        />
      )}
    </div>
  );
};

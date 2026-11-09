import {useEffect,useState} from 'react';
import {GameTable} from './GameTable';
import {WaitingRoom} from './WaitingRoom';
import {VictoryModal} from './VictoryModal';
import {BOT_PERSONALITIES} from '../utils/deck';
import type {Player,UserProfile} from '../types/game';
const profile:UserProfile={id:'preview',username:'You',avatar:'/default-avatar.svg',bio:'',gamesPlayed:0,wins:0,winStreak:0,bestStreak:0,totalWilds:0,matchHistory:[]};
const players:Player[]=[{id:'preview',name:'You',avatar:profile.avatar,title:'',type:'human',hand:[],hasCalledGlam:false,score:0},...BOT_PERSONALITIES.map((p,i)=>({...p,id:`bot_${i}`,type:'bot' as const,hand:[],hasCalledGlam:false,score:0}))];
export default function TablePreview(){const [screen,setScreen]=useState(()=>new URLSearchParams(location.search).get('screen')||'waiting');useEffect(()=>{document.documentElement.classList.toggle('game-viewport-locked',screen!=='waiting');return()=>document.documentElement.classList.remove('game-viewport-locked');},[screen]);
if(screen==='waiting')return <WaitingRoom profile={profile} tableName="Game Night" onStart={()=>setScreen('game')} onLeave={()=>{location.href='/'}}/>;
if(screen==='winner')return <VictoryModal isOpen winner={players[1]} players={players} humanPlayerId="preview" sessionWins={{bot_0:1}} onPlayAgain={()=>setScreen('game')} onGoToLobby={()=>setScreen('waiting')}/>;
return <GameTable practicePlayerCount={4} tableName="Game Night" userName="You" userAvatar="/default-avatar.svg" settings={{tableFelt:'berry',cardBack:'pink_star',stackDraws:true,jumpIn:false,turnTimeoutSeconds:15,initialHandSize:7}} onMatchComplete={()=>{}} onBackToLobby={()=>setScreen('waiting')} onOpenSettings={()=>{}}/>;}

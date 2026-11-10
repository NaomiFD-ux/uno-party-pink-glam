import type {PoolState} from '../utils/pool';
import type {Card,CardColor,PlayDirection} from '../types/game';
export type RoomMessage={id:string;senderId:string;text:string;effect:'normal'|'slam'|'echo';at:number;slap?:{targetId:string};voice?:{url:string;duration:number}};
export type ChatMessage=RoomMessage&{senderName:string};
export type Seat={id:string;name:string;avatar:string;ready:boolean;connected:boolean};
export type WinningPlay={actorId:string;name:string;cards:Card[];color:CardColor;at:number};
export type RoundView={id:string;players:(Seat&{count:number;uno:boolean})[];hand:Card[];discard:Card[];color:CardColor;direction:PlayDirection;activeId:string;pending:number;pendingType:'draw2'|'wild4'|null;winner:string|null;turns:number;drawnCardId:string|null;startedAt:number;turnDeadline?:number;winningPlay?:WinningPlay};
export type RoomView={canTransformCards?:boolean;pool?:PoolState|null;poolWins?:Record<string,number>;serverNow?:number;expiredAt?:number;likelyTopics?:string[];questionCounts?:Record<string,number>;game?:'uno'|'likely'|'pool';customQuestions?:string[];party?:LikelyView|null;code:string;name:string;hostId:string;you:string;revision:number;handSize:number;seats:Seat[];wins:Record<string,number>;round:RoundView|null;message:RoomMessage|null;messages?:ChatMessage[];event:{id:string;actorId:string;kind:'play'|'draw'|'skip'|'start';count?:number;value?:string}|null};

export type LikelyView={voteDeadline?:number;id:string;questionId:string;question:string;number:number;total:number;phase:'vote'|'reveal'|'finished';submitted:string[];yourVote?:string|null;results:Record<string,number>;totals:Record<string,number>;skipped:boolean};


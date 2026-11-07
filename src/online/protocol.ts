import type {Card,CardColor,PlayDirection} from '../types/game';
export type RoomMessage={id:string;senderId:string;text:string;effect:'normal'|'slam'|'echo';at:number};
export type Seat={id:string;name:string;avatar:string;ready:boolean;connected:boolean};
export type RoundView={id:string;players:(Seat&{count:number;uno:boolean})[];hand:Card[];discard:Card[];color:CardColor;direction:PlayDirection;activeId:string;pending:number;pendingType:'draw2'|'wild4'|null;winner:string|null;turns:number;drawnCardId:string|null;startedAt:number};
export type RoomView={code:string;name:string;hostId:string;you:string;revision:number;handSize:number;seats:Seat[];wins:Record<string,number>;round:RoundView|null;message:RoomMessage|null;event:{id:string;actorId:string;kind:'play'|'draw'|'skip'|'start'|'leave';count?:number;value?:string}|null};

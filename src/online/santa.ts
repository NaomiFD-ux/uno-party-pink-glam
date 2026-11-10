import {accountRequest} from './api';
export type SantaMember={id:string;name:string;avatar:string};
export type SantaSummary={id:string;name:string;budget:string;date:string;drawn:boolean;count:number;ownerId:string;revision:number};
export type SantaView=SantaSummary&{you:string;members:SantaMember[];inviteToken?:string;yourWishlist:string;recipient?:SantaMember&{wishlist:string}};
export type SantaInvite={name:string;budget:string;date:string;count:number;drawn:boolean;organizer:string;exchangeId?:string};
export const santaApi={
 list:async():Promise<SantaSummary[]> =>(await accountRequest('/santa')).exchanges,
 get:async(id:string):Promise<SantaView> =>(await accountRequest(`/santa/${id}`)).exchange,
 preview:async(token:string):Promise<SantaInvite> =>accountRequest(`/santa/invite/${encodeURIComponent(token)}`),
 create:async(input:{name:string;budget:string;date:string}):Promise<SantaView> =>(await accountRequest('/santa',input)).exchange,
 join:async(token:string):Promise<SantaView> =>(await accountRequest('/santa/join',{token})).exchange,
 act:async(id:string,action:'draw'|'reveal'|'leave'|'remove'|'wishlist',input:Record<string,unknown>={}):Promise<SantaView|undefined> =>(await accountRequest(`/santa/${id}/${action}`,input)).exchange,
};

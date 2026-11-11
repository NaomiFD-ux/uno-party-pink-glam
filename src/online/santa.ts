import {accountRequest} from './api';
export type SantaItem={id:string;url:string;title:string;image:string;price:string;currency:string;store:string;note:string;variant?:string;addedAt:number};
export type SantaProduct=Omit<SantaItem,'id'|'note'|'variant'|'addedAt'>;
export type SantaPreview={previewId:string;product:SantaProduct;warning?:string};
export type SantaMember={id:string;name:string;avatar:string;wishlistUpdated?:boolean};
export type SantaSummary={id:string;name:string;budget:string;date:string;drawn:boolean;count:number;ownerId:string;revision:number;wishlistEnabled:boolean;remindersEnabled:boolean;cover:string;completed:boolean;yourWishlistUpdated:boolean;revealViewed:boolean;recipientName?:string};
export type SantaView=SantaSummary&{you:string;members:SantaMember[];inviteToken?:string;yourWishlist:string;yourItems:SantaItem[];recipient?:SantaMember&{wishlist:string;items:SantaItem[];purchasedIds?:string[]}};
export type SantaInvite={name:string;budget:string;date:string;count:number;drawn:boolean;organizer:string;exchangeId?:string};
export const santaApi={
 list:async():Promise<SantaSummary[]> =>(await accountRequest('/santa')).exchanges,
 get:async(id:string):Promise<SantaView> =>(await accountRequest(`/santa/${id}`)).exchange,
 preview:async(token:string):Promise<SantaInvite> =>accountRequest(`/santa/invite/${encodeURIComponent(token)}`),
 create:async(input:{name:string;budget:string;date:string;wishlistEnabled:boolean;remindersEnabled:boolean}):Promise<SantaView> =>(await accountRequest('/santa',input)).exchange,
 join:async(token:string):Promise<SantaView> =>(await accountRequest('/santa/join',{token})).exchange,
 itemPreview:async(id:string,url:string):Promise<SantaPreview>=>accountRequest(`/santa/${id}/preview-item`,{url}),
 act:async(id:string,action:'draw'|'reveal'|'leave'|'remove'|'wishlist'|'settings'|'cover'|'complete'|'reveal-viewed'|'purchase',input:Record<string,unknown>={}):Promise<SantaView|undefined> =>(await accountRequest(`/santa/${id}/${action}`,input)).exchange,
};

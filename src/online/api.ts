import type {UserProfile} from '../types/game';
export type AccountUser={id:string;name:string;avatar?:string};
export async function accountRequest(path:string,body?:unknown,method=body===undefined?'GET':'POST'){
 let response:Response;try{response=await fetch('/api/game'+path,{method,credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store'});}catch{throw Error('Can’t reach the game server. Please try again.');}
 const data=await response.json().catch(()=>({}));if(!response.ok){const e=Object.assign(Error(data.error||'The game server is unavailable. Please try again.'),{status:response.status});throw e;}return data;
}
export async function remoteProfile(_id?:string):Promise<Partial<UserProfile>>{return (await accountRequest('/profile')).profile;}
export async function saveRemoteProfile(_id:string,updates:Partial<UserProfile>){return (await accountRequest('/profile',updates,'PATCH')).profile;}
export async function restoreAccount():Promise<AccountUser|null>{try{return (await accountRequest('/auth/me')).user;}catch(e:any){if(e.status===401)return null;throw e;}}
export async function recoverAccount(handle:string,code:string,password:string){return accountRequest('/auth/recover',{handle,code,password});}

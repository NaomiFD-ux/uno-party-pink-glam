import {accountRequest,type AccountUser} from '../online/api';
export async function createAccount(name:string,email:string,password:string,avatar='',remember=true):Promise<AccountUser&{recoveryCode:string}>{const data=await accountRequest('/auth/signup',{name,email,password,avatar,remember});return {...data.user,recoveryCode:data.recoveryCode};}
export async function logIn(handle:string,password:string,remember=true):Promise<AccountUser>{return (await accountRequest('/auth/login',{handle,password,remember})).user;}
// This cache is only the displayed identity. Authentication uses the server's HttpOnly cookie.
export function readSession():AccountUser|null{try{return JSON.parse(sessionStorage.getItem('uno_session_v2')||localStorage.getItem('uno_session_v2')||'null');}catch{return null;}}
export function clearSession(){localStorage.removeItem('uno_session_v2');sessionStorage.removeItem('uno_session_v2');localStorage.removeItem('uno_session');sessionStorage.removeItem('uno_session');}
export function saveSession(user:AccountUser,remember:boolean){clearSession();(remember?localStorage:sessionStorage).setItem('uno_session_v2',JSON.stringify({id:user.id,name:user.name,avatar:user.avatar}));}
export async function signOut(){await accountRequest('/auth/logout',{});clearSession();}

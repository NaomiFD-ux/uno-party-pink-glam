import {Home,Layers,History,UserRound,Gift} from 'lucide-react';
import type {AppTab} from './Header';
export function BottomNav({currentTab,onSelectTab}:{currentTab:AppTab;onSelectTab:(tab:AppTab)=>void}){return <div className="mobile-nav night-mobile-nav"><nav aria-label="Mobile navigation">{([{id:'lobby',label:'Home',Icon:Home},{id:'games',label:'Games',Icon:Layers},{id:'history',label:'History',Icon:History},{id:'santa',label:'Santa',Icon:Gift},{id:'profile',label:'Profile',Icon:UserRound}] as const).map(({id,label,Icon})=><button key={id} aria-current={currentTab===id?'page':undefined} onClick={()=>onSelectTab(id)}><Icon size={25}/><span>{label}</span></button>)}</nav></div>}


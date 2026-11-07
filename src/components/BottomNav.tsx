import { Home, Layers, Settings } from 'lucide-react';
import { AppTab } from './Header';
export function BottomNav({currentTab,onSelectTab}:{currentTab:AppTab;onSelectTab:(tab:AppTab)=>void}) {
  return <div className="mobile-nav"><nav aria-label="Mobile navigation">{[{id:'lobby',label:'Home',Icon:Home},{id:'table',label:'Play',Icon:Layers},{id:'settings',label:'Settings',Icon:Settings}].map(({id,label,Icon})=><button key={id} aria-current={currentTab===id?'page':undefined} onClick={()=>onSelectTab(id as AppTab)}><Icon size={20}/><span>{label}</span></button>)}</nav></div>;
}

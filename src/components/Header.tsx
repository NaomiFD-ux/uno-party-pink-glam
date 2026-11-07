import { Settings } from 'lucide-react';
export type AppTab = 'lobby'|'table'|'profile'|'settings';
interface Props { currentTab:AppTab; onSelectTab:(tab:AppTab)=>void; userAvatar:string; userName:string; }
export function Header({currentTab,onSelectTab,userAvatar,userName}:Props) {
  return <header className="clean-header"><button className="brand-home" onClick={()=>onSelectTab('lobby')}>UNO PARTY <span>✦</span></button><nav aria-label="Main navigation">{([{id:'lobby',label:'Home'},{id:'table',label:'Play'}] as const).map(t=><button key={t.id} aria-current={currentTab===t.id?'page':undefined} onClick={()=>onSelectTab(t.id)}>{t.label}</button>)}</nav><div className="header-actions"><button aria-label="Settings" title="Settings" onClick={()=>onSelectTab('settings')}><Settings size={21}/></button><button className="avatar-button" aria-label="Open your profile" title={userName} onClick={()=>onSelectTab('profile')}><img src={userAvatar} alt=""/></button></div></header>;
}

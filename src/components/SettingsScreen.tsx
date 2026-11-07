import {ProfilePhotoSetting} from './ProfilePhotoSetting';
import { useState } from 'react';
import { ArrowLeft, BookOpen, LogOut } from 'lucide-react';
import { GameSettings } from '../types/game';
import { soundFX } from '../utils/audio';
import { RulesScreen } from './RulesScreen';
export function SettingsScreen({settings,onUpdate,onBack,onLogout,avatar,name,onUpdatePhoto}:{settings:GameSettings;onUpdate:(s:Partial<GameSettings>)=>void;onBack:()=>void;onLogout:()=>void;avatar:string;name:string;onUpdatePhoto:(avatar:string)=>Promise<void>}) {
  const [rules,setRules] = useState(false); const [muted,setMuted] = useState(soundFX.getMuted());
  if(rules) return <div className="settings-rules"><RulesScreen onBack={()=>setRules(false)}/></div>;
  return <section className="settings-screen"><button className="text-button back-link" onClick={onBack}><ArrowLeft size={17}/> Back</button><h1>Settings</h1><div className="settings-panel"><ProfilePhotoSetting avatar={avatar} name={name} onSave={onUpdatePhoto}/><label className="setting-row"><span>Sound</span><input type="checkbox" checked={!muted} onChange={()=>setMuted(soundFX.toggleMute())}/></label><label className="setting-field">Table color<select value={settings.tableFelt} onChange={e=>onUpdate({tableFelt:e.target.value as GameSettings['tableFelt']})}><option value="berry">Pink</option><option value="ruby">Ruby</option><option value="emerald">Emerald</option><option value="midnight">Midnight</option></select></label><p className="setting-hint">Game settings apply to your next round.</p><button className="setting-row rules-setting" onClick={()=>setRules(true)}><span><BookOpen size={19}/> How to play</span><span>→</span></button><button className="setting-row rules-setting" onClick={onLogout}><span><LogOut size={19}/> Log Out</span><span>→</span></button></div></section>;
}

import { useEffect, useRef } from 'react';
import { CardColor } from '../types/game';
import { soundFX } from '../utils/audio';
interface ColorPickerModalProps {isOpen:boolean;onSelectColor:(color:CardColor)=>void;title?:string;}
export function ColorPickerModal({isOpen,onSelectColor,title='Choose a color'}:ColorPickerModalProps) {
 const first=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!isOpen)return;const previous=document.activeElement as HTMLElement|null;first.current?.focus();return()=>previous?.focus();},[isOpen]);
 if(!isOpen)return null;
 return <section className="compact-color-picker" role="dialog" aria-modal="false" aria-labelledby="color-picker-title"><h3 id="color-picker-title">{title}</h3><div>{([{color:'red',name:'Red',hex:'#ee2334'},{color:'blue',name:'Blue',hex:'#087bea'},{color:'green',name:'Green',hex:'#04a95b'},{color:'yellow',name:'Yellow',hex:'#f4b000'}] as const).map((c,i)=><button ref={i===0?first:undefined} key={c.color} type="button" aria-label={`Choose ${c.name}`} onClick={()=>{soundFX.playSparkle();onSelectColor(c.color);}}><span style={{background:c.hex}}/><small>{c.name}</small></button>)}</div></section>;
}

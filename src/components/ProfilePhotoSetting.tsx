import {useRef,useState,type ChangeEvent} from 'react';
import {Camera} from 'lucide-react';
export function ProfilePhotoSetting({avatar,name,onSave}:{avatar:string;name:string;onSave:(avatar:string)=>Promise<void>}){
 const input=useRef<HTMLInputElement>(null);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 async function choose(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  setBusy(true);setNotice('');setError('');
  try{
   if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP picture.');
   if(file.size>8*1024*1024)throw Error('Choose a picture smaller than 8 MB.');
   const image=await createImageBitmap(file);
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
   const context=canvas.getContext('2d');if(!context){image.close();throw Error('Could not open this picture. Try another one.');}
   context.fillStyle='#fff0f5';context.fillRect(0,0,256,256);
   const side=Math.min(image.width,image.height);context.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,256,256);image.close();
   await onSave(canvas.toDataURL('image/jpeg',.85));setNotice('Profile picture updated');
  }catch(e){setError((e as Error).message||'Could not save your picture. Try again.');}finally{setBusy(false);}
 }
 return <section className="settings-photo" aria-label="Profile picture"><img src={avatar} alt={`${name} profile picture`}/><div><strong>{name}</strong><button type="button" className="text-button" disabled={busy} onClick={()=>input.current?.click()}><Camera size={16}/>{busy?'Saving picture…':'Change Profile Picture'}</button><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile picture" hidden onChange={event=>void choose(event)}/>{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}</div></section>;
}

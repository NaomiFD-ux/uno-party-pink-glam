export function normalizeRoomCode(value:string){return value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);}
export function readRoomCode(value:string){
 const match=value.match(/\broom\s*code\s*[:#-]?\s*([A-Z0-9]{6})\b/i)||value.match(/#([A-Z0-9]{6})\b/i)||value.match(/[?&]room=([A-Z0-9]{6})\b/i);
 return match?match[1].toUpperCase():normalizeRoomCode(value);
}
export function roomInviteText(code:string,name:string,url:string){return `Join me for ${name} on Game Night!\nRoom code: ${code}\n${url}${url?'\n\n@'+new URL(url).hostname+' #'+code:''}`;}

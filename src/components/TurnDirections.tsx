import {useEffect,useRef,useState,type RefObject} from 'react';
export function TurnDirections({root,ids,direction}:{root:RefObject<HTMLDivElement|null>;ids:string[];direction:number}){
 const previousDirection=useRef(direction),[paused,setPaused]=useState(false);
 useEffect(()=>{if(previousDirection.current===direction)return;previousDirection.current=direction;setPaused(true);const timer=setTimeout(()=>setPaused(false),450);return()=>clearTimeout(timer);},[direction]);
 const [arrows,setArrows]=useState<{x:number;y:number;angle:number}[]>([]),key=ids.join(',');
 useEffect(()=>{
  const element=root.current;if(!element)return;
  const measure=()=>{
   const bounds=element.getBoundingClientRect(),felt=element.querySelector('.game-felt')?.getBoundingClientRect();if(!felt?.width)return;
   const cx=felt.left+felt.width/2,cy=felt.top+felt.height/2;
   const angles=ids.map((id,index)=>{if(!index)return Math.PI/2;const seat=Array.from(element.querySelectorAll<HTMLElement>('[data-player-id]')).find(p=>p.dataset.playerId===id)?.getBoundingClientRect();return seat?Math.atan2(seat.top+seat.height/2-cy,seat.left+seat.width/2-cx):0;});
   setArrows(angles.map((angle,index)=>{let next=angles[(index+1)%angles.length];while(next<=angle)next+=Math.PI*2;const mid=(angle+next)/2,rx=felt.width*.43,ry=felt.height*.43;return {x:cx-bounds.left+rx*Math.cos(mid),y:cy-bounds.top+ry*Math.sin(mid),angle:Math.atan2(ry*Math.cos(mid),-rx*Math.sin(mid))*180/Math.PI+(direction===-1?180:0)};}));
  };
  measure();const observer=new ResizeObserver(measure);observer.observe(element);const felt=element.querySelector('.game-felt');if(felt)observer.observe(felt);window.addEventListener('resize',measure);return()=>{observer.disconnect();window.removeEventListener('resize',measure);};
 },[root,key,direction]);
 return <svg data-paused={paused} className="turn-flow" role="img" aria-label={`Play moves ${direction===1?'clockwise':'counterclockwise'}`}>{arrows.map((arrow,index)=><g key={index} transform={`translate(${arrow.x} ${arrow.y}) rotate(${arrow.angle})`}><path style={{animationDelay:`${(direction===1?index:ids.length-1-index)*220}ms`}} d="M -11 0 H 11 M 5 -6 L 11 0 L 5 6"/></g>)}</svg>;
}

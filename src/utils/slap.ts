/** A brief visual reaction only; it never changes seats, cards or turn state. */
export function animateProfileSlap(root:HTMLElement,targetId:string){
 const seat=Array.from(root.querySelectorAll<HTMLElement>('[data-player-id]')).find(el=>el.dataset.playerId===targetId);
 const avatar=seat?.querySelector<HTMLElement>('[data-slap-avatar]');if(!avatar)return ()=>{};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const bounds=root.getBoundingClientRect(),rect=avatar.getBoundingClientRect(),direction=rect.left+rect.width/2<bounds.left+bounds.width/2?-1:1;
 const hand=document.createElement('span');hand.className='profile-slap-hand';hand.textContent='👋';hand.setAttribute('aria-hidden','true');hand.style.left=`${rect.left-bounds.left+rect.width/2}px`;hand.style.top=`${rect.top-bounds.top+rect.height/2}px`;root.appendChild(hand);
 const hit=avatar.animate(reduced?[{opacity:1},{opacity:.5},{opacity:1}]:[
  {transform:'translateX(0) rotate(0deg)',offset:0},
  {transform:`translateX(${direction*90}px) rotate(${direction*32}deg) scale(.82)`,offset:.18},
  {transform:`translateX(${direction*100}px) rotate(${direction*38}deg) scale(.8)`,offset:.28},
  {transform:`translateX(${-direction*9}px) rotate(${-direction*6}deg)`,offset:.78},
  {transform:'translateX(0) rotate(0deg)',offset:1}
 ],{duration:reduced?220:620,easing:'ease-out'});
 const swipe=hand.animate(reduced?[{opacity:1},{opacity:0}]:[{transform:`translate(${-direction*55}px,-50%) rotate(${-direction*25}deg)`,opacity:0},{transform:'translate(-50%,-50%) rotate(0deg)',opacity:1,offset:.18},{transform:`translate(${direction*30}px,-40%) rotate(${direction*25}deg)`,opacity:0}],{duration:400,easing:'ease-out'});
 const clear=()=>{hit.cancel();swipe.cancel();hand.remove();};hit.onfinish=clear;return clear;
}

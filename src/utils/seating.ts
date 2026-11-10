/** Change the circular neighbors, keeping the first seat as the visual anchor.
 * Rotating an unchanged circle would look identical from each player's view.
 */
export function shuffleSeating<T extends {id:string}>(previous:readonly T[],pick=(max:number)=>Math.floor(Math.random()*max)):T[] {
 if(previous.length<3)return [...previous];
 if(previous.length===3)return [previous[0],previous[2],previous[1]];
 const neighbors=(seats:readonly T[],index:number)=>[seats[(index+seats.length-1)%seats.length].id,seats[(index+1)%seats.length].id].sort().join('\0');
 const oldNeighbors=new Map(previous.map((seat,index)=>[seat.id,neighbors(previous,index)]));
 for(let attempt=0;attempt<64;attempt++){
  const seats=[...previous];
  for(let i=seats.length-1;i>1;i--){const j=1+pick(i);[seats[i],seats[j]]=[seats[j],seats[i]];}
  if(seats.every((seat,index)=>neighbors(seats,index)!==oldNeighbors.get(seat.id)))return seats;
 }
 // A bounded fallback guarantees a change even if random sampling repeats.
 return [...previous.filter((_,i)=>i%2===0),...previous.filter((_,i)=>i%2===1)];
}

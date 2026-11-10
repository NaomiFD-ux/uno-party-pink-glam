import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shuffleSeating} from './seating';
const neighbors=(seats:{id:string}[],i:number)=>[seats[(i+seats.length-1)%seats.length].id,seats[(i+1)%seats.length].id].sort();
test('every player gets a different neighbor pair, not just a rotated or reversed circle',()=>{
 for(let count=4;count<=10;count++)for(const pick of [()=>0,(max:number)=>max-1,undefined]){
  let seats=Array.from({length:count},(_,i)=>({id:String(i),wins:i,avatar:'photo'+i}));
  for(let round=0;round<20;round++){
   const before=structuredClone(seats),next=shuffleSeating(seats,pick);
   assert.deepEqual(seats,before);assert.equal(next[0],seats[0]);
   assert.deepEqual([...next].sort((a,b)=>a.id.localeCompare(b.id)),[...seats].sort((a,b)=>a.id.localeCompare(b.id)));
   next.forEach((seat,index)=>{assert(seats.includes(seat));assert.notDeepEqual(neighbors(next,index),neighbors(seats,seats.indexOf(seat)));});
   seats=next;
  }
 }
});
test('three players swap left/right; two players have no alternative neighbors',()=>{
 for(let count=0;count<=3;count++){
  const seats=Array.from({length:count},(_,i)=>({id:String(i)})),next=shuffleSeating(seats);
  assert.deepEqual(next,count===3?[seats[0],seats[2],seats[1]]:seats);
 }
});

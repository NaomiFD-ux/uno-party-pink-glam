import { CSSProperties } from 'react';
export function CardCountFan({count}:{count:number}) {
  const cardsPerRow=9;
  const visibleColumns=Math.min(count,cardsPerRow);
  const rows=Math.max(1,Math.ceil(count/cardsPerRow));
  return <span className="card-count-fan" role="img" aria-label={`${count} cards remaining`} title={`${count} cards remaining`} style={{width:count?14+(visibleColumns-1)*4.5:14,height:28+(rows-1)*14} as CSSProperties}>{Array.from({length:count},(_,i)=>{
    const row=Math.floor(i/cardsPerRow);
    const column=i%cardsPerRow;
    const rowCount=Math.min(cardsPerRow,count-row*cardsPerRow);
    const spread = rowCount > 1 ? column / (rowCount - 1) - .5 : 0;
    const arc = Math.pow(spread * 2, 2) * 5;
    return <i key={i} style={{left:column*4.5,top:row*14+arc,transform:`rotate(${spread*42}deg)`}}/>;
  })}</span>;
}

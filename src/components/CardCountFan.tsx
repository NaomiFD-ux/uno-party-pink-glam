import { CSSProperties } from 'react';
export function CardCountFan({count}:{count:number}) {
  const cardsPerRow=9;
  const visibleColumns=Math.min(count,cardsPerRow);
  const rows=Math.max(1,Math.ceil(count/cardsPerRow));
  return <span className="card-count-fan" role="img" aria-label={`${count} cards remaining`} title={`${count} cards remaining`} style={{width:count?14+(visibleColumns-1)*6:14,height:22+(rows-1)*12} as CSSProperties}>{Array.from({length:count},(_,i)=>{
    const row=Math.floor(i/cardsPerRow);
    const column=i%cardsPerRow;
    const rowCount=Math.min(cardsPerRow,count-row*cardsPerRow);
    return <i key={i} style={{left:column*6,top:row*12,transform:`rotate(${rowCount>1?(column/(rowCount-1)-.5)*18:0}deg)`}}/>;
  })}</span>;
}

import { CSSProperties } from 'react';
// Stable varied paths avoid a grid and keep motion smooth between rerenders.
export function EchoEffect({text}:{text:string}) {
 return <div className="message-echo-layer echo-vortex" aria-hidden="true">{Array.from({length:240},(_,i)=>{
  const seed=(i*.61803398875)%1;
  const angle=seed*Math.PI*2;
  const spread=.3+((i*37)%101)/145;
  const style:Record<string,string|number>={animationDelay:`${i*8}ms`,fontSize:`${10+(i*13)%9}px`,'--echo-opacity':.5+((i*17)%50)/100,'--echo-size':.65+((i*23)%70)/100};
  for(let k=0;k<=6;k++){
    const t=k/6,theta=angle+t*Math.PI*2.2;
    const expansion=Math.min(1,t*8);
    const radius=spread*(.2+.95*expansion);
    // The horizontal orbit widens as copies rise, giving the swirl its funnel shape.
    style[`--ex${k}`]=`${Math.cos(theta)*radius*57}vw`;
    style[`--ey${k}`]=`${Math.sin(theta)*radius*53+(1-t)*22-5}vh`;
    style[`--er${k}`]=`${Math.sin(theta)*18}deg`;
  }
  return <span className="message-echo-copy" key={i} style={style as CSSProperties}>{text}</span>;
 })}</div>;
}

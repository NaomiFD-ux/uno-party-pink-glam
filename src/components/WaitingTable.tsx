import type {ReactNode} from 'react';
export function WaitingTable({children,count,ready}:{children:ReactNode;count:number;ready:number}){return <div className="waiting-players velvet-waiting-table" data-seat-count={count}><div className="waiting-deck"><img src="/game-night/card-back-magenta.webp" alt="UNO deck"/><strong>{ready}/{count} ready</strong></div>{children}</div>;}

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Player } from '../types/game';
import { Crown, ArrowRight, RotateCcw, UserPlus } from 'lucide-react';
import { soundFX } from '../utils/audio';

interface VictoryModalProps {
  playAgainDisabled?:boolean;
  playAgainLabel?:string;
  isOpen: boolean;
  winner: Player;
  players: Player[];
  humanPlayerId: string;
  sessionWins: Record<string,number>;
  onInvitePlayers?:()=>Promise<void>;
  onPlayAgain: () => void;
  onGoToLobby: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  playAgainDisabled=false,
  playAgainLabel='Play Again',
  isOpen,
  winner,
  players,
  humanPlayerId,
  sessionWins,
  onInvitePlayers,
  onPlayAgain,
  onGoToLobby,
}) => {
  const [inviting,setInviting]=useState(false),[inviteError,setInviteError]=useState('');
  const isHumanWinner = winner.id === humanPlayerId;

  useEffect(() => {
    if (isOpen && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      soundFX.playVictory();

      // Launch dazzling fireworks confetti
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        colors: ['#EC4899', '#F472B6', '#F59E0B', '#10B981', '#3B82F6', '#FFFFFF'],
      };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Sort players by hand count ascending
  const sortedPlayers = [...players].sort((a,b)=>(sessionWins[b.id]||0)-(sessionWins[a.id]||0));
  const roundsCompleted=Object.values(sessionWins).reduce((total,wins)=>total+wins,0);

  return <div className="velvet-victory" role="dialog" aria-modal="true" aria-label="Round results"><section className="velvet-victory-content">
    <header className="victory-brand"><strong>UNO</strong><span>GAME NIGHT</span></header>
    <p className="victory-round">Round {roundsCompleted} complete</p>
    <div className="victory-portrait"><div className="winner-confetti" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{'--confetti-angle':`${i*30}deg`,'--confetti-delay':`${i*-.18}s`} as React.CSSProperties}/>)}</div><Crown aria-hidden="true"/><img src={winner.avatar||'/default-avatar.svg'} alt={winner.name}/></div>
    <h2>{isHumanWinner?'You won!':`${winner.name} wins!`}</h2><p className="victory-subtitle">One round down. Who’s next?</p>
    <section className="victory-scoreboard" aria-label="Round wins at this table"><header><h3>Round wins</h3><span>This table</span></header>
    {sortedPlayers.map(player=><article key={player.id} className={player.id===winner.id?'is-winner':''}><span className="victory-rank">{player.id===winner.id?<Crown size={18}/>:null}</span><img src={player.avatar||'/default-avatar.svg'} alt=""/><div><strong>{player.name}{player.id===humanPlayerId?' (You)':''}</strong>{player.id===winner.id&&<small>Round winner</small>}</div><b>{sessionWins[player.id]||0} {(sessionWins[player.id]||0)===1?'win':'wins'}</b></article>)}
    </section><p className="victory-carry">Wins carry into the next round.</p>
    {onInvitePlayers&&<button type="button" className="invite-next-round" disabled={inviting} onClick={async()=>{setInviting(true);setInviteError('');try{await onInvitePlayers();}catch(e){setInviteError((e as Error).message);}finally{setInviting(false);}}}><UserPlus size={17}/>{inviting?'Opening table…':'Invite Players'}</button>}
    {inviteError&&<p className="form-error" role="alert">{inviteError}</p>}
    <div className="victory-actions"><button disabled={playAgainDisabled||inviting} onClick={onPlayAgain}><RotateCcw size={20}/>{playAgainLabel}</button><button onClick={onGoToLobby}>Back to Lobby <ArrowRight size={18}/></button></div>
  </section></div>;
};

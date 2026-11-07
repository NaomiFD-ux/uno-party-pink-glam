import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player } from '../types/game';
import { Trophy, Award, ArrowRight, RotateCcw } from 'lucide-react';
import { soundFX } from '../utils/audio';

interface VictoryModalProps {
  playAgainDisabled?:boolean;
  playAgainLabel?:string;
  isOpen: boolean;
  winner: Player;
  players: Player[];
  humanPlayerId: string;
  sessionWins: Record<string,number>;
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
  onPlayAgain,
  onGoToLobby,
}) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#650034]/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md glass-modal p-6 sm:p-8 rounded-3xl shadow-2xl border-2 border-pink-300/80 text-center overflow-y-auto max-h-[90svh]">
        {/* Top ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-pink-500/25 blur-2xl pointer-events-none" />

        {/* Floating badge */}
        <div className="mx-auto w-20 h-20 rounded-full bg-linear-to-tr from-pink-500 to-amber-400 p-1 shadow-xl mb-4 relative">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            {isHumanWinner ? (
              <Trophy className="w-10 h-10 text-amber-500 drop-shadow animate-bounce" />
            ) : (
              <Award className="w-10 h-10 text-pink-600 drop-shadow" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-pink-600 text-white flex items-center justify-center text-xs font-black shadow-md border-2 border-white">
            ✦
          </div>
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-pink-100 text-pink-700 font-bold text-xs uppercase tracking-wider mb-2 border border-pink-200">
          Round {roundsCompleted} complete
        </span>

        <h2 className="text-3xl font-extrabold text-[#3E001E] font-heading mb-1">
          {isHumanWinner ? 'You won!' : `${winner.name} wins!`}
        </h2>
        <p className="text-sm text-[#574048] mb-5">
          {isHumanWinner
            ? 'Nice play!'
            : 'Ready for another round?'}
        </p>

        {/* Scoreboard Rankings */}
        <div className="space-y-2 mb-6 text-left">
          <div className="text-xs font-bold uppercase tracking-wider text-[#881B4D] px-1">
            Round wins at this table
          </div>
          {sortedPlayers.map((player, idx) => {
            const isWinnerItem = player.id === winner.id;
            const isCurrent = player.id === humanPlayerId;
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isWinnerItem
                    ? 'bg-linear-to-r from-amber-100 to-pink-100 border border-amber-300 shadow-xs text-amber-950 font-bold'
                    : isCurrent
                    ? 'bg-pink-50 border border-pink-200 text-[#3E001E]'
                    : 'bg-white/60 text-[#574048]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950'
                        : idx === 1
                        ? 'bg-gray-300 text-gray-800'
                        : idx === 2
                        ? 'bg-amber-600/60 text-white'
                        : 'bg-pink-200 text-pink-800'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <img
                    src={player.avatar}
                    alt={player.name}
                    className="w-7 h-7 rounded-full object-cover border border-white shadow-xs"
                  />
                  <span>
                    {player.name} {isCurrent && '(You)'}
                  </span>
                </div>
                <div className="text-xs text-right font-semibold text-[#881B4D]">
                  <strong className="session-win-count">{sessionWins[player.id]||0}</strong> {(sessionWins[player.id]||0)===1?'win':'wins'}{player.id===winner.id&&<small className="round-winner-label">Won this round</small>}
                </div>
              </div>
            );
          })}
        </div>

        <p className="session-score-note">Totals since this table started · kept for the next round</p>
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={playAgainDisabled}
            onClick={onPlayAgain}
            className="btn-glam-primary py-3 px-4 rounded-full text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <RotateCcw size={16} /> {playAgainLabel}
          </button>
          <button
            onClick={onGoToLobby}
            className="py-3 px-4 rounded-full bg-white hover:bg-pink-50 text-[#881B4D] font-bold text-sm border-1.5 border-pink-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            Lobby <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

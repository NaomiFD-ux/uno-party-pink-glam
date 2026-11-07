import React from 'react';
import { Card, CardColor } from '../types/game';
import { Sparkles, Ban, RefreshCw, Plus } from 'lucide-react';

interface CardViewProps {
  card?: Card;
  chosenColor?: CardColor;
  isBack?: boolean;
  isPlayable?: boolean;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  className?: string;
  rotation?: number;
  elevateOnHover?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  chosenColor,
  isBack = false,
  isPlayable = false,
  isSelected = false,
  size = 'md',
  onClick,
  className = '',
  rotation = 0,
  elevateOnHover = false,
}) => {
  // Dimension profiles
  const sizeMap = {
    sm: 'w-10 h-14 rounded-lg text-xs',
    md: 'w-16 h-24 sm:w-20 sm:h-28 rounded-xl text-sm',
    lg: 'w-20 h-30 sm:w-24 sm:h-36 rounded-2xl text-base',
    xl: 'w-28 h-40 sm:w-32 sm:h-48 rounded-2xl text-lg',
  };

  // Color background mapping
  const getColorGradient = (color: CardColor) => {
    switch (color) {
      case 'red':
        return 'from-red-500 via-rose-500 to-rose-600 text-white';
      case 'blue':
        return 'from-sky-500 via-blue-500 to-indigo-600 text-white';
      case 'green':
        return 'from-emerald-400 via-teal-500 to-emerald-600 text-white';
      case 'yellow':
        return 'from-amber-300 via-amber-400 to-yellow-500 text-amber-950';
      case 'wild':
        return 'from-pink-500 via-purple-600 to-indigo-700 text-white';
    }
  };

  const renderGlyph = (cardItem: Card, isCorner: boolean = false) => {
    const iconSize = isCorner ? 12 : size === 'lg' ? 28 : 20;

    switch (cardItem.value) {
      case 'skip':
        return <Ban size={iconSize} className="stroke-[2.5]" />;
      case 'reverse':
        return <RefreshCw size={iconSize} className="stroke-[2.5]" />;
      case 'draw2':
        return (
          <div className="flex items-center font-bold tracking-tighter">
            <Plus size={iconSize * 0.75} className="stroke-[3]" />
            <span>2</span>
          </div>
        );
      case 'wild':
        return (
          <div className="flex flex-col items-center justify-center">
            {isCorner ? (
              <span className="font-extrabold text-[10px]">W</span>
            ) : (
              <div className="relative flex items-center justify-center">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full uno-wild-colors border-2 border-white shadow-md flex items-center justify-center">
                  <Sparkles size={14} className="text-white drop-shadow" />
                </div>
              </div>
            )}
          </div>
        );
      case 'wild4':
        return (
          <div className="flex flex-col items-center justify-center">
            {isCorner ? (
              <span className="font-extrabold text-[10px]">+4</span>
            ) : (
              <div className="flex items-center gap-0.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full uno-wild-colors border-2 border-white shadow-md flex items-center justify-center font-extrabold text-white text-xs sm:text-sm">
                  +4
                </div>
              </div>
            )}
          </div>
        );
      default:
        return <span className={`font-black font-heading ${isCorner ? 'text-xs' : 'text-xl sm:text-3xl'}`}>{cardItem.value}</span>;
    }
  };

  // Card Back Rendering (Lacquered Luxury Satin Back)
  if (isBack || !card) {
    return (
      <div
        onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? (card ? `${card.color} ${card.value}` : 'Draw card') : undefined}
      onKeyDown={(event) => { if (onClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onClick(); } }}
        style={{ transform: `rotate(${rotation}deg)` }}
        className={`uno-card-back relative ${sizeMap[size]} bg-linear-to-br from-pink-500 via-rose-600 to-[#881B4D] p-1.5 shadow-lg border-2 border-pink-200/90 rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-200 select-none ${
          onClick ? 'cursor-pointer hover:scale-105 hover:shadow-pink-400/40' : ''
        } ${className}`}
      >
        {/* Inner golden border highlight */}
        <div className="w-full h-full border border-pink-300/40 rounded-xl flex flex-col items-center justify-center relative overflow-hidden bg-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.25)_0%,transparent_70%)]" />
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full border-2 border-white/80 bg-white/10 flex items-center justify-center shadow-inner">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white/95 animate-pulse" />
          </div>
          <span className="text-[9px] sm:text-[11px] font-black font-heading tracking-widest uppercase text-white/95 mt-1 drop-shadow">
            UNO
          </span>
        </div>
      </div>
    );
  }

  // Front of Card (Pure White surface, double border, saturated colored oval, dual corner pips)
  return (
    <div
      data-playable={isPlayable}
      data-selected={isSelected}
      aria-pressed={onClick?isSelected:undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? (card ? `${card.color} ${card.value}` : 'Draw card') : undefined}
      onKeyDown={(event) => { if (onClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onClick(); } }}
      style={{
        transform: `rotate(${rotation}deg) ${isSelected ? 'translateY(-14px)' : ''}`,
        '--card-ink': ({red:'#ee2334',blue:'#087bea',green:'#04a95b',yellow:'#f4b000',wild:'#272031'})[card.color],
      } as React.CSSProperties}
      className={`uno-card-face relative ${sizeMap[size]} bg-white p-1 sm:p-1.5 border border-pink-200/90 shadow-md rounded-2xl flex flex-col justify-between overflow-hidden transition-all duration-200 select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${
        elevateOnHover
          ? 'hover:-translate-y-3 hover:scale-105 hover:shadow-xl hover:shadow-pink-500/25'
          : ''
      } ${
        isPlayable
          ? 'ring-2 ring-pink-500 shadow-lg shadow-pink-500/30 ring-offset-1'
          : ''
      } ${isSelected ? 'ring-3 ring-pink-500 shadow-2xl shadow-pink-500/50 scale-105 z-30' : ''} ${className}`}
    >
      <div className="uno-card-color" aria-hidden="true"/>
      <div className="uno-corner uno-corner-top">{renderGlyph(card,true)}</div>
      <div className="uno-center-oval" style={(card.value==='wild4'||card.value==='wild')&&chosenColor&&chosenColor!=='wild'?{background:({red:'#ee2334',blue:'#087bea',green:'#04a95b',yellow:'#f4b000'})[chosenColor]}:undefined}><div className="uno-center-glyph">{(card.value==='wild4'||card.value==='wild')&&chosenColor&&chosenColor!=='wild'?<span style={{color:'#fff',fontSize:card.value==='wild4'?'28px':'25px',letterSpacing:'-.08em'}}>{card.value==='wild4'?'+4':'W'}</span>:renderGlyph(card,false)}</div></div>
      <div className="uno-corner uno-corner-bottom">{renderGlyph(card,true)}</div>
    </div>
  );
};

export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';

export type CardValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'reverse' | 'draw2'
  | 'wild' | 'wild4';

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
  score: number;
}

export type PlayerType = 'human' | 'bot';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  title: string;
  type: PlayerType;
  hand: Card[];
  hasCalledGlam: boolean;
  score: number;
  reaction?: string;
  streak?: number;
}

export type GameStatus = 'waiting' | 'dealing' | 'playing' | 'color_picking' | 'game_over' | 'paused';

export type PlayDirection = 1 | -1; // 1 = clockwise, -1 = counter-clockwise

export interface GameSettings {
  tableFelt: 'berry' | 'ruby' | 'emerald' | 'midnight';
  cardBack: 'pink_star' | 'diamond_glam' | 'leopard_chic' | 'gold_velvet';
  stackDraws: boolean;
  jumpIn: boolean;
  turnTimeoutSeconds: number;
  initialHandSize: number;
}

export interface MatchRecord {
  id: string;
  date: string;
  tableName: string;
  placement: number;
  cardsPlayed: number;
  turns: number;
}

export interface UserProfile {
  id: string;
  username: string;
  bio: string;
  avatar: string;
  gamesPlayed: number;
  wins: number;
  winStreak: number;
  bestStreak: number;
  totalWilds: number;
  matchHistory: MatchRecord[];
}

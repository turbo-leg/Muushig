export interface CardVM {
  suit: string;
  rank: number;
}

export interface SeatVM {
  id: string;
  username: string;
  score: number;
  tricksWon: number;
  handCount: number;
  isReady: boolean;
  isHost: boolean;
  isTurn: boolean;
  hasResigned: boolean;
  isMe: boolean;
}

export interface TrickPlayVM {
  playerId: string;
  username: string;
  card: CardVM;
}

export type Phase = 'waiting' | 'swap' | 'playing' | 'finished';

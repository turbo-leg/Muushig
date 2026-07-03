export interface CardVM {
  suit: string;
  rank: number;
}

export interface SeatVM {
  id: string;
  username: string;
  avatarUrl: string;
  score: number;
  /** Per-round scoresheet cells: running total, or '-' for a folded round. */
  scoreLog: string[];
  tricksWon: number;
  handCount: number;
  isReady: boolean;
  isHost: boolean;
  isTurn: boolean;
  hasDecided: boolean;
  hasResigned: boolean;
  /** False while the seat is held for a dropped player (reconnection window). */
  isConnected: boolean;
  isMe: boolean;
  /** Currently talking in the Discord voice channel (drives the green ring). */
  isSpeaking: boolean;
  /** This round's dealer. */
  isDealer: boolean;
  /** The amankhuzuu — first player to swap cards this round. */
  isAmankhuzuu: boolean;
  seatNumber?: number;
}

export interface TrickPlayVM {
  playerId: string;
  username: string;
  card: CardVM;
}

export type Phase = 'waiting' | 'decision' | 'swap' | 'playing' | 'finished';

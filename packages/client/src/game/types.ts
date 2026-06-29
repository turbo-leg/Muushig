export interface CardVM {
  suit: string;
  rank: number;
}

export interface SeatVM {
  id: string;
  username: string;
  avatarUrl: string;
  score: number;
  tricksWon: number;
  handCount: number;
  isReady: boolean;
  isHost: boolean;
  isTurn: boolean;
  hasDecided: boolean;
  hasResigned: boolean;
  isMe: boolean;
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

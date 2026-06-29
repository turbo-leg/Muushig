import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayingCard } from '../components/PlayingCard';
import { Seat } from '../components/Seat';
import { ActionBar } from '../components/ActionBar';
import type { SeatVM } from '../game/types';

describe('PlayingCard', () => {
  test('renders rank label and suit glyph for a face-up card', () => {
    render(<PlayingCard suit="Spades" rank={14} />);
    // Two indices (top-left + bottom-right) plus the center glyph.
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('♠').length).toBeGreaterThanOrEqual(1);
  });

  test('exposes an accessible label for face-down cards', () => {
    render(<PlayingCard faceDown />);
    expect(screen.getByLabelText('Face-down card')).toBeInTheDocument();
  });
});

describe('Seat', () => {
  const seat: SeatVM = {
    id: 'p1',
    username: 'Golden Falcon',
    avatarUrl: '',
    score: 15,
    tricksWon: 0,
    handCount: 5,
    isReady: true,
    isHost: true,
    isTurn: false,
    hasDecided: false,
    hasResigned: false,
    isMe: false,
    isDealer: false,
    isAmankhuzuu: false,
  };

  test('shows name and ready state in the waiting phase', () => {
    render(<Seat seat={seat} phase="waiting" />);
    expect(screen.getByText('Golden Falcon')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  test('marks the dealer and amankhuzuu roles', () => {
    render(<Seat seat={{ ...seat, isDealer: true, isAmankhuzuu: true }} phase="swap" />);
    expect(screen.getByTitle('Dealer')).toBeInTheDocument();
    expect(screen.getByTitle('Amankhuzuu — first to swap')).toBeInTheDocument();
  });
});

describe('ActionBar', () => {
  const base = {
    phase: 'waiting' as const,
    isHost: true,
    canStart: false,
    meReady: false,
    needPlayers: false,
    meDecided: false,
    canDecide: true,
    canSwap: false,
    meSwapped: false,
    isMyTurn: false,
    selectedCount: 0,
    winnerNames: [],
    isWinner: false,
    muted: false,
    onReady: vi.fn(),
    onStart: vi.fn(),
    onStay: vi.fn(),
    onSwap: vi.fn(),
    onKeep: vi.fn(),
    onResign: vi.fn(),
    onRematch: vi.fn(),
    onToggleMute: vi.fn(),
  };

  test('host start is disabled until all are ready, ready fires callback', async () => {
    const onReady = vi.fn();
    render(<ActionBar {...base} onReady={onReady} />);
    expect(screen.getByRole('button', { name: /wait/i })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /ready/i }));
    expect(onReady).toHaveBeenCalledOnce();
  });

  test('mute toggle is labelled for accessibility', () => {
    render(<ActionBar {...base} muted />);
    expect(screen.getByRole('button', { name: /unmute sound/i })).toBeInTheDocument();
  });
});

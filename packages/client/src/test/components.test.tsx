import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayingCard } from '../components/PlayingCard';
import { Seat } from '../components/Seat';
import { Scoreboard } from '../components/Scoreboard';
import { ScoreSheet } from '../components/ScoreSheet';
import { PipView } from '../components/PipView';
import { HoldButton } from '../components/HoldButton';
import { ActionBar } from '../components/ActionBar';
import { RoundSummary } from '../components/RoundSummary';
import { Celebration } from '../components/Celebration';
import { MatchRecap, summarizeScoreLog } from '../components/MatchRecap';
import { HelpBook } from '../components/HelpBook';
import { Lobby } from '../components/Lobby';
import type { SeatVM } from '../game/types';

const makeSeat = (over: Partial<SeatVM>): SeatVM => ({
  id: 'p',
  username: 'Player',
  avatarUrl: '',
  score: 15,
  scoreLog: [],
  tricksWon: 0,
  handCount: 5,
  isReady: false,
  isHost: false,
  isTurn: false,
  hasDecided: false,
  hasResigned: false,
  isConnected: true,
  isBot: false,
  isMe: false,
  isSpeaking: false,
  isDealer: false,
  isAmankhuzuu: false,
  ...over,
});

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
    scoreLog: [],
    tricksWon: 0,
    handCount: 5,
    isReady: true,
    isHost: true,
    isTurn: false,
    hasDecided: false,
    hasResigned: false,
    isConnected: true,
    isBot: false,
    isMe: false,
    isSpeaking: false,
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

  test('shows a reconnecting badge for a held mid-game seat', () => {
    render(<Seat seat={{ ...seat, isConnected: false }} phase="playing" />);
    expect(screen.getByText('Reconnecting…')).toBeInTheDocument();
  });

  test('shows a bot badge once a bot takes the seat over', () => {
    render(<Seat seat={{ ...seat, isConnected: false, isBot: true }} phase="playing" />);
    expect(screen.getByText('Bot')).toBeInTheDocument();
    expect(screen.queryByText('Reconnecting…')).not.toBeInTheDocument();
  });

  test('offers a remove button only when onRemove is provided', async () => {
    const onRemove = vi.fn();
    const bot = { ...seat, isBot: true, username: 'Баатар 🤖' };
    const { rerender } = render(<Seat seat={bot} phase="waiting" onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(onRemove).toHaveBeenCalledOnce();
    rerender(<Seat seat={bot} phase="waiting" />);
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });
});

describe('Scoreboard', () => {
  test('lists every player with their score and opens the sheet', async () => {
    const onOpenSheet = vi.fn();
    render(
      <Scoreboard
        onOpenSheet={onOpenSheet}
        seats={[
          makeSeat({ id: 'a', username: 'Ariun', score: 15 }),
          makeSeat({ id: 'b', username: 'Bat', score: 12, isMe: true }),
        ]}
      />,
    );
    expect(screen.getByText('Ariun')).toBeInTheDocument();
    expect(screen.getByText('Bat')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /open scoresheet/i }));
    expect(onOpenSheet).toHaveBeenCalledOnce();
  });

  test('shows "-" for a folded player', () => {
    render(
      <Scoreboard
        onOpenSheet={vi.fn()}
        seats={[makeSeat({ id: 'a', username: 'Ariun', score: 15, hasResigned: true })]}
      />,
    );
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});

describe('ScoreSheet', () => {
  test('renders per-round history with totals and a fold dash', () => {
    render(
      <ScoreSheet
        onClose={vi.fn()}
        seats={[
          makeSeat({ id: 'a', username: 'Ariun', score: 13, scoreLog: ['13'] }),
          makeSeat({ id: 'b', username: 'Bat', score: 15, scoreLog: ['-'] }),
        ]}
      />,
    );
    // "13" appears in both the round row and the "Now" footer.
    expect(screen.getAllByText('13').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('Ariun')).toBeInTheDocument();
  });
});

describe('PipView', () => {
  test('shows the turn headline and scores, no cards', () => {
    render(
      <PipView
        seats={[
          makeSeat({ id: 'a', username: 'Ariun', score: 13 }),
          makeSeat({ id: 'b', username: 'Bat', score: 15, isMe: true }),
        ]}
        phase="playing"
        isMyTurn
        turnName="Ariun"
        ledSuit="Hearts"
        trumpSuit="Spades"
      />,
    );
    expect(screen.getByText('Your turn!')).toBeInTheDocument();
    expect(screen.getByText('Ariun')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
  });
});

describe('HoldButton', () => {
  test('a plain tap does not confirm (anti-misclick)', async () => {
    const onConfirm = vi.fn();
    render(<HoldButton onConfirm={onConfirm}>Fold</HoldButton>);
    await userEvent.click(screen.getByRole('button', { name: /hold to fold/i }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('reduced-motion / hot device falls back to a two-tap confirm', async () => {
    document.documentElement.dataset.perf = 'low';
    const onConfirm = vi.fn();
    render(<HoldButton onConfirm={onConfirm}>Fold</HoldButton>);
    const btn = screen.getByRole('button', { name: /hold to fold/i });
    await userEvent.click(btn);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Confirm?')).toBeInTheDocument();
    await userEvent.click(btn);
    expect(onConfirm).toHaveBeenCalledOnce();
    delete document.documentElement.dataset.perf;
  });
});

describe('RoundSummary', () => {
  test('shows trick deltas, the shut-out penalty, and folds', () => {
    render(
      <RoundSummary
        rows={[
          { id: 'a', username: 'Ariun', folded: false, tricksWon: 3, total: 12 },
          { id: 'b', username: 'Bat', folded: false, tricksWon: 0, total: 20 },
          { id: 'c', username: 'Chono', folded: true, tricksWon: 0, total: 15 },
        ]}
      />,
    );
    expect(screen.getByText('Round over')).toBeInTheDocument();
    expect(screen.getByText('−3')).toBeInTheDocument(); // Ariun's tricks
    expect(screen.getByText('+5')).toBeInTheDocument(); // Bat's shut-out
    expect(screen.getByText('folded')).toBeInTheDocument(); // Chono sat out
  });
});

describe('Celebration', () => {
  test('names the winners on the plaque', () => {
    render(<Celebration winnerNames={['Ariun', 'Bat']} />);
    expect(screen.getByText(/Ariun & Bat wins the pot!/)).toBeInTheDocument();
  });
});

describe('Lobby', () => {
  test('offers quick play, hosting with a seat count, and code join', async () => {
    const onJoin = vi.fn();
    render(<Lobby onJoin={onJoin} />);

    await userEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(onJoin).toHaveBeenCalledWith({ mode: 'quick' });

    await userEvent.click(screen.getByRole('radio', { name: '3' }));
    await userEvent.click(screen.getByRole('button', { name: /host a table/i }));
    expect(onJoin).toHaveBeenCalledWith({ mode: 'create', maxPlayers: 3 });
  });

  test('normalizes the code input and only enables join for valid codes', async () => {
    const onJoin = vi.fn();
    render(<Lobby onJoin={onJoin} />);
    const input = screen.getByRole('textbox', { name: /join with code/i });
    const joinBtn = screen.getByRole('button', { name: /join with code/i });

    await userEvent.type(input, 'ab');
    expect(joinBtn).toBeDisabled();
    await userEvent.type(input, '!c d9'); // junk stripped, uppercased, capped at 4
    expect(input).toHaveValue('ABCD');
    await userEvent.click(joinBtn);
    expect(onJoin).toHaveBeenCalledWith({ mode: 'code', code: 'ABCD' });
  });

  test('shows a notice from a previous session', () => {
    render(<Lobby onJoin={vi.fn()} notice="That table is gone." />);
    expect(screen.getByText('That table is gone.')).toBeInTheDocument();
  });
});

describe('HelpBook', () => {
  test('pages forward through all six pages and finishes', async () => {
    const onClose = vi.fn();
    render(<HelpBook onClose={onClose} />);

    expect(screen.getByText('The goal')).toBeInTheDocument();
    expect(screen.getByText('1 / 6')).toBeInTheDocument();

    // Walk to the last page.
    for (let i = 0; i < 5; i++) {
      await userEvent.click(screen.getByRole('button', { name: /next/i }));
    }
    expect(screen.getByText('The words')).toBeInTheDocument();
    expect(screen.getByText('6 / 6')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /to the table/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('back button returns to the previous page and Escape closes', async () => {
    const onClose = vi.fn();
    render(<HelpBook onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('The deal')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('The goal')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('MatchRecap', () => {
  test('summarizeScoreLog decodes folds, tricks, shut-outs, and perfect rounds', () => {
    // From 15: fold, take 3 (→12), get muushig'd (→17), take all 5 (→12).
    const s = summarizeScoreLog(['-', '12', '17', '12']);
    expect(s).toEqual({
      roundsTotal: 4,
      roundsStayed: 3,
      tricks: 8, // 3 + 5
      muushigd: 1,
      perfectRounds: 1,
    });
  });

  test('renders the recap chips from a scoreLog', () => {
    render(<MatchRecap scoreLog={['-', '12', '17', '12']} />);
    expect(screen.getByText('Bid 3/4 rounds')).toBeInTheDocument();
    expect(screen.getByText('8 tricks')).toBeInTheDocument();
    expect(screen.getByText('muushig’d ×1')).toBeInTheDocument();
    expect(screen.getByText('perfect round ×1')).toBeInTheDocument();
  });
});

describe('ActionBar', () => {
  const base = {
    phase: 'waiting' as const,
    isSpectator: false,
    isHost: true,
    canStart: false,
    meReady: false,
    needPlayers: false,
    meDecided: false,
    canDecide: true,
    mustPlay: false,
    canSwap: false,
    meSwapped: false,
    isMyTurn: false,
    selectedCount: 0,
    canSwapTrump: false,
    trumpSwapMode: false,
    canInvite: false,
    canAddBot: false,
    hint: null,
    winnerNames: [],
    isWinner: false,
    muted: false,
    onReady: vi.fn(),
    onStart: vi.fn(),
    onAddBot: vi.fn(),
    onHelp: vi.fn(),
    onStay: vi.fn(),
    onSwap: vi.fn(),
    onKeep: vi.fn(),
    onResign: vi.fn(),
    onRematch: vi.fn(),
    onToggleTrumpSwap: vi.fn(),
    onInvite: vi.fn(),
    onToggleMute: vi.fn(),
    onLeaveTable: vi.fn(),
  };

  test('host start is disabled until all are ready, ready fires callback', async () => {
    const onReady = vi.fn();
    render(<ActionBar {...base} onReady={onReady} />);
    expect(screen.getByRole('button', { name: /wait/i })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /ready/i }));
    expect(onReady).toHaveBeenCalledOnce();
  });

  test('shows the first-game hint only when provided, and the help button always', async () => {
    const onHelp = vi.fn();
    const { rerender } = render(
      <ActionBar {...base} phase="decision" hint="Weak hand? Fold." onHelp={onHelp} />,
    );
    expect(screen.getByText(/weak hand\? fold\./i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /how to play/i }));
    expect(onHelp).toHaveBeenCalledOnce();

    rerender(<ActionBar {...base} phase="decision" hint={null} onHelp={onHelp} />);
    expect(screen.queryByText(/weak hand/i)).not.toBeInTheDocument();
  });

  test('leave is instant in the lobby but needs a second tap mid-game', async () => {
    const onLeaveTable = vi.fn();
    const { rerender } = render(<ActionBar {...base} onLeaveTable={onLeaveTable} />);
    await userEvent.click(screen.getByRole('button', { name: /leave table/i }));
    expect(onLeaveTable).toHaveBeenCalledOnce();

    onLeaveTable.mockClear();
    rerender(<ActionBar {...base} phase="playing" onLeaveTable={onLeaveTable} />);
    await userEvent.click(screen.getByRole('button', { name: /leave table/i }));
    expect(onLeaveTable).not.toHaveBeenCalled(); // armed only
    await userEvent.click(screen.getByRole('button', { name: /leave table/i }));
    expect(onLeaveTable).toHaveBeenCalledOnce();
  });

  test('spectators get a watching notice instead of actions', () => {
    render(<ActionBar {...base} isSpectator phase="playing" />);
    expect(screen.getByText(/watching/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ready/i })).not.toBeInTheDocument();
  });

  test('host can add a bot while seats remain', async () => {
    const onAddBot = vi.fn();
    const { rerender } = render(<ActionBar {...base} canAddBot onAddBot={onAddBot} />);
    await userEvent.click(screen.getByRole('button', { name: /add bot/i }));
    expect(onAddBot).toHaveBeenCalledOnce();
    rerender(<ActionBar {...base} />);
    expect(screen.queryByRole('button', { name: /add bot/i })).not.toBeInTheDocument();
  });

  test('mute toggle is labelled for accessibility', () => {
    render(<ActionBar {...base} muted />);
    expect(screen.getByRole('button', { name: /unmute sound/i })).toBeInTheDocument();
  });

  test('navshih button appears only when the dealer can exchange, and fires its callback', async () => {
    const onToggleTrumpSwap = vi.fn();
    const { rerender } = render(<ActionBar {...base} phase="swap" canSwap />);
    expect(screen.queryByRole('button', { name: /navshih/i })).not.toBeInTheDocument();

    rerender(
      <ActionBar
        {...base}
        phase="swap"
        canSwap
        canSwapTrump
        onToggleTrumpSwap={onToggleTrumpSwap}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /navshih/i }));
    expect(onToggleTrumpSwap).toHaveBeenCalledOnce();

    rerender(<ActionBar {...base} phase="swap" canSwap canSwapTrump trumpSwapMode />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});

import type { Phase } from '../game/types';
import { SUIT_GLYPH } from './PlayingCard';
import { t } from '../i18n';

interface Props {
  phase: Phase;
  trumpSuit: string;
  /** Completed tricks this round (0–4); the counter shows the current one. */
  tricksPlayed: number;
  /** Username of the player whose turn it is (null between turns). */
  turnName: string | null;
  isMyTurn: boolean;
  /** Open the full-screen scoresheet. */
  onOpenSheet: () => void;
}

/** Small parchment / scroll glyph used for the "open scoresheet" control. */
function PaperIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 11h6M9 14h6M9 17h4" />
    </svg>
  );
}

const RED_SUITS = new Set(['Hearts', 'Diamonds']);

/**
 * The in-round HUD pill: trump suit · trick counter · whose turn. Scores live
 * only on the seats; tapping the pill opens the full {@link ScoreSheet}.
 * Hidden in the lobby (join code on the felt) and at game end (Celebration).
 */
export function Scoreboard({
  phase,
  trumpSuit,
  tricksPlayed,
  turnName,
  isMyTurn,
  onOpenSheet,
}: Props) {
  if (phase === 'waiting' || phase === 'finished') return null;

  const trickNo = Math.min(tricksPlayed + 1, 5);

  return (
    <button
      type="button"
      onClick={onOpenSheet}
      aria-label={t('openScoresheet')}
      className="mx-auto flex max-w-full select-none items-center gap-2 rounded-[8px] border-2 border-gild bg-parchment px-3 py-1 font-hand text-sm font-bold shadow-[0_3px_6px_rgba(0,0,0,0.3),inset_0_0_12px_rgba(0,0,0,0.45)] hover:border-amber-deep"
    >
      {trumpSuit && (
        <span
          title={t('trumpLabel')}
          className={`text-base leading-none ${RED_SUITS.has(trumpSuit) ? 'text-danger' : 'text-ink'}`}
        >
          {SUIT_GLYPH[trumpSuit] ?? trumpSuit}
        </span>
      )}
      {phase === 'playing' && (
        <span className="num leading-none text-ink-soft">{t('trickCounter', { n: trickNo })}</span>
      )}
      {turnName && (
        <span
          className={`max-w-[9rem] truncate leading-none ${
            isMyTurn ? 'text-amber-deep' : 'text-ink'
          }`}
        >
          {isMyTurn ? t('yourTurnShort') : `${turnName}…`}
        </span>
      )}
      <span className="text-ember">
        <PaperIcon />
      </span>
    </button>
  );
}

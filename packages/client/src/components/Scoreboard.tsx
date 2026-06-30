import { useState } from 'react';
import type { SeatVM } from '../game/types';

interface Props {
  seats: SeatVM[];
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

function Chevron({ up }: { up?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={up ? '' : 'rotate-180'}
    >
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

/**
 * A compact, retractable parchment tally of every player's running score
 * (everyone starts at 15 and counts down toward 0). A paper icon opens the
 * full-screen {@link ScoreSheet} with the per-round history.
 */
export function Scoreboard({ seats, onOpenSheet }: Props) {
  const [open, setOpen] = useState(true);
  if (seats.length === 0) return null;

  if (!open) {
    return (
      <div className="mx-auto flex select-none items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show scores"
          className="flex items-center gap-1.5 rounded-[8px] border-2 border-[#c9a56e] bg-parchment px-3 py-1 font-hand text-sm font-bold text-ink shadow-[0_3px_6px_rgba(0,0,0,0.3)]"
        >
          <PaperIcon />
          Scores
          <Chevron />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-full select-none items-center justify-center gap-1.5 rounded-[8px] border-2 border-[#c9a56e] bg-parchment px-2 py-1 shadow-[0_3px_6px_rgba(0,0,0,0.3),inset_0_0_12px_rgba(120,80,40,0.16)]">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {seats.map((s) => (
          <div
            key={s.id}
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
              s.isMe ? 'bg-amber/25 ring-1 ring-amber-deep/40' : ''
            } ${s.hasResigned ? 'opacity-50' : ''}`}
            title={`${s.username}: ${s.score}`}
          >
            <span className="max-w-[72px] truncate font-hand text-sm font-bold leading-none text-ink">
              {s.username}
            </span>
            <span className="num font-hand text-base font-bold leading-none text-amber-deep">
              {s.hasResigned ? '-' : s.score}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-0.5 self-stretch border-l border-[#c9a56e] pl-1.5">
        <button
          type="button"
          onClick={onOpenSheet}
          aria-label="Open scoresheet"
          className="grid h-7 w-7 place-items-center rounded text-wood hover:bg-wood/10 hover:text-amber-deep"
        >
          <PaperIcon />
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Hide scores"
          className="grid h-7 w-7 place-items-center rounded text-wood hover:bg-wood/10 hover:text-amber-deep"
        >
          <Chevron up />
        </button>
      </div>
    </div>
  );
}

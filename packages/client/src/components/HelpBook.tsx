import { useEffect, useState } from 'react';
import { PlayingCard } from './PlayingCard';
import { Button } from './Button';
import { t, type MsgKey } from '../i18n';

interface PageDef {
  titleKey: MsgKey;
  bodyKey: MsgKey;
  diagram?: () => React.ReactNode;
}

/** Small role chips matching the real Seat badges, so the book teaches the UI. */
function RoleChip({ label, gold }: { label: string; gold?: boolean }) {
  return (
    <span
      className={`grid h-6 min-w-6 select-none place-items-center rounded-full border border-ink/40 px-1.5 font-hand text-xs font-bold leading-none shadow-sm ${
        gold ? 'bg-amber text-[#1d1503]' : 'bg-parchment text-ember'
      }`}
    >
      {label}
    </span>
  );
}

function DealDiagram() {
  return (
    <div className="flex items-center justify-center gap-3">
      <PlayingCard faceDown className="w-12" />
      <PlayingCard suit="Hearts" rank={10} trump className="w-12" />
      <div className="flex items-center gap-1.5">
        <RoleChip label="D" />
        <RoleChip label="АМ" gold />
      </div>
    </div>
  );
}

function TrickDiagram() {
  return (
    <div className="flex items-center justify-center gap-2">
      <PlayingCard suit="Spades" rank={9} className="w-11 -rotate-6" />
      <PlayingCard suit="Spades" rank={13} className="w-11" />
      <PlayingCard suit="Hearts" rank={7} trump className="w-11 rotate-6" />
    </div>
  );
}

// Page order mirrors a real round: goal → deal → decision → swap → play → words.
const PAGES: PageDef[] = [
  { titleKey: 'helpGoalTitle', bodyKey: 'helpGoalBody' },
  { titleKey: 'helpDealTitle', bodyKey: 'helpDealBody', diagram: DealDiagram },
  { titleKey: 'helpBidTitle', bodyKey: 'helpBidBody' },
  { titleKey: 'helpSwapTitle', bodyKey: 'helpSwapBody' },
  { titleKey: 'helpTrickTitle', bodyKey: 'helpTrickBody', diagram: TrickDiagram },
  { titleKey: 'helpGlossaryTitle', bodyKey: 'helpGlossaryBody' },
];

/**
 * Paged parchment rules book. Content lives in the i18n catalog (en/mn) as
 * short screens — GAME_RULES.md stays the authoritative long-form reference;
 * keep the two in sync when rules wording changes.
 */
export function HelpBook({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;
  const def = PAGES[page]!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setPage((p) => Math.min(p + 1, PAGES.length - 1));
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(p - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 safe-pad"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('helpTitle')}
    >
      <div
        className="relative flex max-h-[90dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-[12px] border-2 border-ink bg-parchment px-6 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('cancel')}
          className="absolute right-3 top-2 font-hand text-2xl text-ink-soft hover:text-ink"
        >
          ✕
        </button>

        <header className="flex items-baseline justify-between gap-2 border-b-2 border-gild pb-2 pr-6">
          <h2 className="font-display text-3xl font-bold text-ink">{t('helpTitle')}</h2>
          <span className="num font-hand text-sm text-ink-soft">
            {t('helpPageOf', { n: page + 1, total: PAGES.length })}
          </span>
        </header>

        <h3 className="font-hand text-xl font-bold text-ember">{t(def.titleKey)}</h3>

        {def.diagram && <div className="py-1">{def.diagram()}</div>}

        <div className="flex min-h-[120px] flex-col gap-1.5">
          {t(def.bodyKey)
            .split('\n')
            .map((line, i) => (
              <p key={i} className="font-hand text-lg leading-snug text-ink">
                {line}
              </p>
            ))}
        </div>

        {/* Page dots */}
        <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
          {PAGES.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i === page ? 'bg-amber-deep' : 'bg-ink/20'}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 pt-1">
          {page > 0 && (
            <Button variant="coin" secondary onClick={() => setPage((p) => p - 1)}>
              {t('helpBack')}
            </Button>
          )}
          {last ? (
            <Button variant="coin" onClick={onClose}>
              {t('helpDone')}
            </Button>
          ) : (
            <Button variant="coin" onClick={() => setPage((p) => p + 1)}>
              {t('helpNext')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

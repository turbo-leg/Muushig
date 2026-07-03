import { useState } from 'react';
import { Button } from './Button';
import type { JoinIntent } from '../net/useRoom';
import { t, tAlt } from '../i18n';

const CODE_RE = /^[A-HJ-NP-Z2-9]{4}$/;

/**
 * Web landing screen: quick match, host a private table, or join by code.
 * Never shown inside Discord — there the activity instance IS the table.
 */
export function Lobby({
  onJoin,
  notice,
}: {
  onJoin: (intent: JoinIntent) => void;
  /** One-time message from a previous session (kicked / table closed). */
  notice?: string | null;
}) {
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [code, setCode] = useState('');
  const codeOk = CODE_RE.test(code);

  return (
    <main className="flex min-h-full items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-5">
        <header className="text-center">
          <h1 className="font-hand text-4xl font-bold text-cream">{t('lobbyTitle')}</h1>
          <p className="font-hand text-xl text-cream/70">{t('lobbySubtitle')}</p>
        </header>

        {notice && (
          <p className="rounded-lg border-2 border-amber-deep bg-parchment px-4 py-1.5 text-center font-hand text-lg text-danger">
            {notice}
          </p>
        )}

        <Button variant="coin" sub={tAlt('quickPlay')} onClick={() => onJoin({ mode: 'quick' })}>
          {t('quickPlay')}
        </Button>

        {/* Host a private table */}
        <div className="flex w-full flex-col items-center gap-2 rounded-[10px] border-2 border-[#c9a56e] bg-parchment px-4 py-3 [box-shadow:inset_0_0_14px_rgba(120,80,40,0.18)]">
          <div
            className="flex items-center gap-1.5"
            role="radiogroup"
            aria-label={t('seatsLabel', { n: '' }).trim()}
          >
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={maxPlayers === n}
                onClick={() => setMaxPlayers(n)}
                className={`grid h-9 w-9 place-items-center rounded-full border font-hand text-lg font-bold ${
                  maxPlayers === n
                    ? 'border-amber-deep bg-amber text-ink'
                    : 'border-ink/30 bg-parchment-deep/50 text-ink-soft'
                }`}
              >
                {n}
              </button>
            ))}
            <span className="ml-1 font-hand text-sm text-ink-soft">
              {t('seatsLabel', { n: maxPlayers })}
            </span>
          </div>
          <Button
            variant="coin"
            secondary
            sub={tAlt('hostTable')}
            onClick={() => onJoin({ mode: 'create', maxPlayers })}
          >
            {t('hostTable')}
          </Button>
        </div>

        {/* Join by code */}
        <form
          className="flex w-full items-center justify-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (codeOk) onJoin({ mode: 'code', code });
          }}
        >
          <input
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z2-9]/g, '')
                  .slice(0, 4),
              )
            }
            placeholder={t('codePlaceholder')}
            aria-label={t('joinWithCode')}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="num w-28 rounded-lg border-2 border-[#c9a56e] bg-parchment px-3 py-2 text-center font-hand text-xl font-bold tracking-[0.3em] text-ink outline-none focus:border-amber-deep"
          />
          <Button variant="coin" secondary sub={tAlt('joinWithCode')} disabled={!codeOk}>
            {t('joinWithCode')}
          </Button>
        </form>
      </div>
    </main>
  );
}

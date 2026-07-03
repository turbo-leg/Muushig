import { useState } from 'react';
import { Background } from './components/Background';
import { Table } from './components/Table';
import { Login } from './components/Login';
import { Profile } from './components/Profile';
import { useRoom } from './net/useRoom';
import { useAuth } from './auth/AuthContext';
import { isEmbedded } from './discord';
import { t, useLocale } from './i18n';

/** Hidden SVG definition block containing global filters for hand-inked line warp and paper tooth. */
function GlobalSVGDefs() {
  return (
    <svg className="absolute w-0 h-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Slightly warps borders/lines to create an organic, hand-inked line wiggle */}
        <filter id="handDrawn" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Simulates coarse tooth and lighting shadows of heavy cold-press watercolor paper */}
        <filter id="paperTexture" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="3" result="noise" />
          <feDiffuseLighting in="noise" lightingColor="#f5e6d3" surfaceScale="1.2" result="light">
            <feDistantLight azimuth="45" elevation="65" />
          </feDiffuseLighting>
          <feBlend mode="multiply" in="SourceGraphic" in2="light" />
        </filter>
      </defs>
    </svg>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-full items-center justify-center p-4">
      <div className="w-full">{children}</div>
    </main>
  );
}

function AccountBar({ onProfile }: { onProfile: () => void }) {
  const { session, signOut } = useAuth();
  if (!session) return null;
  const m = (session.user.user_metadata ?? {}) as Record<string, string>;
  const avatar = m.avatar_url || m.picture || '';
  const name = m.full_name || m.name || m.user_name || 'You';
  return (
    <div className="fixed right-[max(0.75rem,var(--safe-right))] top-[max(0.75rem,var(--safe-top))] z-40 flex items-center gap-2 select-none">
      <button
        type="button"
        onClick={onProfile}
        aria-label="Open profile"
        className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border-2 border-amber-deep bg-parchment-deep bg-cover bg-center font-hand text-lg text-wood"
        style={avatar ? { backgroundImage: `url("${avatar}")` } : undefined}
      >
        {!avatar && name.charAt(0).toUpperCase()}
      </button>
      <button
        type="button"
        onClick={signOut}
        className="rounded px-2 py-1 font-hand text-base text-cream/80 hover:text-cream"
      >
        Sign out
      </button>
    </div>
  );
}

/** The connected game (only mounts once we're past the auth gate). */
function GameView() {
  const { status, error, state, sessionId, send } = useRoom();
  const { session } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  useLocale(); // re-render the shell when the language flips

  return (
    <>
      <GlobalSVGDefs />
      <Background />
      <AccountBar onProfile={() => setShowProfile(true)} />

      {status === 'connecting' && (
        <Centered>
          <p className="text-center font-hand text-2xl text-cream/80">{t('settlingIn')}</p>
        </Centered>
      )}

      {status === 'error' && (
        <Centered>
          <p className="text-center font-hand text-2xl text-danger">
            {error ?? t('connectionFailed')}
          </p>
        </Centered>
      )}

      {/* While reconnecting, keep the last-known table visible under a banner. */}
      {status === 'reconnecting' &&
        (state ? (
          <div
            className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-lg border-2 border-amber-deep bg-parchment px-4 py-1.5 font-hand text-lg text-wood shadow-lg"
            role="status"
          >
            {t('reconnectingTable')}
          </div>
        ) : (
          <Centered>
            <p className="text-center font-hand text-2xl text-cream/80">{t('reconnectingTable')}</p>
          </Centered>
        ))}

      {(status === 'connected' || status === 'reconnecting') && state && (
        <Table state={state} sessionId={sessionId} send={send} />
      )}

      {showProfile && session && (
        <Profile session={session} onClose={() => setShowProfile(false)} />
      )}
    </>
  );
}

export default function App() {
  const { enabled, loading, session } = useAuth();

  if (loading) {
    return (
      <>
        <GlobalSVGDefs />
        <Background />
        <Centered>
          <p className="text-center font-hand text-2xl text-cream/80">{t('settlingIn')}</p>
        </Centered>
      </>
    );
  }

  // On the web (not inside Discord), require sign-in when auth is configured.
  if (enabled && !session && !isEmbedded) {
    return (
      <>
        <GlobalSVGDefs />
        <Background />
        <Login />
      </>
    );
  }

  return <GameView />;
}

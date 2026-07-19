import { useEffect, useState } from 'react';
import { Background } from './components/Background';
import { HelpBook } from './components/HelpBook';
import { hasSeenRules, markRulesSeen } from './lib/firstRun';
import { Table } from './components/Table';
import { Login } from './components/Login';
import { Profile } from './components/Profile';
import { Leaderboard } from './components/Leaderboard';
import { Lobby } from './components/Lobby';
import { Button } from './components/Button';
import { LoadingIndicator } from './components/LoadingIndicator';
import { useRoom, readStoredIntent, writeStoredIntent, type JoinIntent } from './net/useRoom';
import { useAuth } from './auth/AuthContext';
import { isEmbedded } from './discord';
import { supabase } from './lib/supabase';
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
            scale="0.6"
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
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      setCoins(null);
      return;
    }
    let active = true;
    supabase
      .from('profiles')
      .select('coins')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) {
          setCoins((data as { coins?: number }).coins ?? 0);
        }
      });
    return () => {
      active = false;
    };
  }, [session?.user.id]);

  if (!session) return null;
  const m = (session.user.user_metadata ?? {}) as Record<string, string>;
  const avatar = m.avatar_url || m.picture || '';
  const name = m.full_name || m.name || m.user_name || t('youName');
  return (
    <div className="fixed right-[max(0.75rem,var(--safe-right))] top-[max(0.75rem,var(--safe-top))] z-40 flex items-center gap-2 select-none">
      {coins !== null && (
        <div className="flex items-center gap-1.5 rounded-full border border-amber-deep/40 bg-parchment-deep px-2.5 py-1 text-sm font-bold text-ember shadow-sm">
          <span>🪙</span>
          <span className="font-hand text-sm">{coins}</span>
        </div>
      )}
      <button
        type="button"
        onClick={onProfile}
        aria-label={t('openProfile')}
        className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border-2 border-amber-deep bg-parchment-deep bg-cover bg-center font-hand text-lg text-ember"
        style={avatar ? { backgroundImage: `url("${avatar}")` } : undefined}
      >
        {!avatar && name.charAt(0).toUpperCase()}
      </button>
      <button
        type="button"
        onClick={signOut}
        className="rounded px-2 py-1 font-hand text-base text-cream/80 hover:text-cream"
      >
        {t('signOut')}
      </button>
    </div>
  );
}

/** Trophy button — visible to guests too; the leaderboard view is world-readable. */
function LeaderboardButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('openLeaderboard')}
      className="fixed left-[max(0.75rem,var(--safe-left))] top-[max(0.75rem,var(--safe-top))] z-40 grid h-10 w-10 place-items-center rounded-full border-2 border-amber-deep bg-parchment-deep text-lg select-none"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" />
        <path d="M7 6H4a2 2 0 0 0 2 4h1M17 6h3a2 2 0 0 1-2 4h-1" />
      </svg>
    </button>
  );
}

/** Corner how-to-play button, below the trophy. */
function HelpCornerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('helpOpen')}
      className="fixed left-[max(0.75rem,var(--safe-left))] top-[calc(max(0.75rem,var(--safe-top))+3rem)] z-40 grid h-10 w-10 place-items-center rounded-full border-2 border-amber-deep bg-parchment-deep font-hand text-lg font-bold text-ember select-none"
    >
      ?
    </button>
  );
}

/** The connected game (only mounts once we're past the auth gate). */
function GameView({
  intent,
  onExit,
}: {
  intent: JoinIntent;
  /** Terminal status (kicked / table closed) hands control back to the shell. */
  onExit: (notice: string | null) => void;
}) {
  const { status, error, state, sessionId, send } = useRoom(intent);
  const { session, signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  useLocale(); // re-render the shell when the language flips

  useEffect(() => {
    if (status === 'closed') {
      onExit(null);
    } else if (status === 'kicked') {
      window.history.pushState(null, '', '/');
    }
  }, [status, onExit]);

  // First run: open the rules book once, when the player lands in a lobby.
  const inLobby = status === 'connected' && state?.phase === 'waiting';
  useEffect(() => {
    if (inLobby && !hasSeenRules()) {
      setShowHelp(true);
      markRulesSeen();
    }
  }, [inLobby]);

  const closeHelp = () => {
    markRulesSeen();
    setShowHelp(false);
  };

  // Terminal statuses: a parchment notice with a way back.
  if (status === 'kicked' || status === 'closed') {
    const message = status === 'kicked' ? t('kickedNotice') : t('tableClosed');
    return (
      <>
        <GlobalSVGDefs />
        <Background />
        <Centered>
          <div className="flex flex-col items-center gap-4">
            <p className="text-center font-hand text-2xl text-cream/85">{message}</p>
            <Button variant="coin" onClick={() => onExit(message)}>
              {t('backToLobby')}
            </Button>
          </div>
        </Centered>
      </>
    );
  }

  return (
    <>
      <GlobalSVGDefs />
      <Background />
      <AccountBar onProfile={() => setShowProfile(true)} />
      {supabase && <LeaderboardButton onClick={() => setShowLeaderboard(true)} />}
      <HelpCornerButton onClick={() => setShowHelp(true)} />
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
      {showHelp && <HelpBook onClose={closeHelp} />}

      {status === 'connecting' && (
        <Centered>
          <div className="flex flex-col items-center gap-2">
            <LoadingIndicator />
            <p className="text-center font-hand text-2xl text-cream/80">{t('settlingIn')}</p>
          </div>
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
            className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-lg border-2 border-amber-deep bg-parchment px-4 py-1.5 font-hand text-lg text-ember shadow-lg"
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
        <Table state={state} sessionId={sessionId} send={send} onLeaveTable={() => onExit(null)} />
      )}

      {showProfile && session && (
        <Profile session={session} onClose={() => setShowProfile(false)} signOut={signOut} />
      )}
    </>
  );
}

/** Display-only premium check for the Lobby's host section (server re-verifies). */
function useCanHost(): boolean {
  const { session } = useAuth();
  const [canHost, setCanHost] = useState(false);
  const userId = session?.user.id;
  useEffect(() => {
    if (!supabase || !userId) {
      setCanHost(false);
      return;
    }
    let active = true;
    void supabase
      .from('profiles')
      .select('premium')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setCanHost(!!(data as { premium?: boolean } | null)?.premium);
      });
    return () => {
      active = false;
    };
  }, [userId]);
  return canHost;
}

/** Picks the table (web Lobby) or auto-joins (Discord), then runs the game. */
function TableRouter({ session, signOut }: { session: any; signOut?: () => Promise<void> }) {
  // Inside Discord the activity instance IS the table — always quick-join.
  const [intent, setIntent] = useState<JoinIntent | null>(() => {
    if (isEmbedded) return { mode: 'quick' };

    const pathMatch = window.location.pathname.match(/^\/table\/(\d+)$/);
    if (pathMatch) {
      const tableId = parseInt(pathMatch[1], 10);
      if (tableId >= 1 && tableId <= 20) {
        return { mode: 'table', tableId };
      }
    }

    return readStoredIntent();
  });

  const canHost = useCanHost();
  const [notice, setNotice] = useState<string | null>(null);
  const getInitialTab = () => {
    if (isEmbedded) return 'lobby';
    const path = window.location.pathname;
    if (path === '/profile') return 'profile';
    if (path === '/shop') return 'shop';
    if (path === '/settings') return 'settings';
    return 'lobby';
  };

  const [activeTab, setActiveTab] = useState<'lobby' | 'profile' | 'shop' | 'settings'>(
    getInitialTab(),
  );
  const [nonce, setNonce] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  useLocale();

  useEffect(() => {
    if (isEmbedded) return;
    const handlePopState = () => {
      const path = window.location.pathname;
      const pathMatch = path.match(/^\/table\/(\d+)$/);
      if (pathMatch) {
        const tableId = parseInt(pathMatch[1], 10);
        if (tableId >= 1 && tableId <= 20) {
          setIntent({ mode: 'table', tableId });
          return;
        }
      }
      setIntent(null);
      if (path === '/profile') setActiveTab('profile');
      else if (path === '/shop') setActiveTab('shop');
      else if (path === '/settings') setActiveTab('settings');
      else setActiveTab('lobby');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (!intent) {
    return (
      <>
        <GlobalSVGDefs />
        <Background />
        {supabase && <LeaderboardButton onClick={() => setShowLeaderboard(true)} />}
        <HelpCornerButton onClick={() => setShowHelp(true)} />
        {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
        {showHelp && (
          <HelpBook
            onClose={() => {
              markRulesSeen();
              setShowHelp(false);
            }}
          />
        )}
        <Lobby
          notice={notice}
          canHost={canHost}
          activeTab={activeTab}
          onNavigate={(tab) => {
            setActiveTab(tab);
            if (!isEmbedded) {
              window.history.pushState(null, '', tab === 'lobby' ? '/' : `/${tab}`);
            }
          }}
          onJoin={(next) => {
            setNotice(null);
            setIntent(next);
            if (next.mode === 'table') {
              window.history.pushState(null, '', `/table/${next.tableId}`);
            }
          }}
          signOut={signOut}
        />
      </>
    );
  }

  return (
    <GameView
      key={nonce}
      intent={intent}
      onExit={(message) => {
        writeStoredIntent(null);
        if (isEmbedded) {
          setIntent({ mode: 'quick' });
          setNonce((n) => n + 1);
        } else {
          window.history.pushState(null, '', '/');
          setNotice(message);
          setIntent(null);
        }
      }}
    />
  );
}

export default function App() {
  const { enabled, loading, session, signOut } = useAuth();

  if (loading) {
    return (
      <>
        <GlobalSVGDefs />
        <Background />
        <Centered>
          <div className="flex flex-col items-center gap-2">
            <LoadingIndicator />
            <p className="text-center font-hand text-2xl text-cream/80">{t('settlingIn')}</p>
          </div>
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

  return <TableRouter session={session} signOut={signOut} />;
}

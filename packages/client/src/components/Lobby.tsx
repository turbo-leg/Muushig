import { useCallback, useEffect, useMemo, useState } from 'react';
import type { JoinIntent } from '../net/useRoom';
import { t } from '../i18n';
import { HomeLayout } from './HomeLayout';
import { useAuth } from '../auth/AuthContext';
import { identityFromSession } from '../auth/identity';
import { supabase } from '../lib/supabase';
import { MongolianCloud } from './MongolianCloud';
import { Profile } from './Profile';
import { Shop } from './Shop';
import { SettingsDashboard } from './Settings';
import { HelpBook } from './HelpBook';
import { GoldCoinIcon, LobbyIcon, ProfileIcon, ShopIcon, SettingsIcon, SwordIcon } from './Icons';

const REFRESH_MS = 5_000;

export interface LobbyRow {
  roomId: string | null;
  tableId: number;
  name: string;
  host: string | null;
  phase: string;
  playerCount: number;
  maxPlayers: number;
  spectatorCount: number;
  playerNames?: string[];
  buyIn?: number;
  type?: string;
  stakes?: 'low' | 'medium' | 'high';
}

const ROOM_NAMES: Record<number, string> = {
  1: 'Golden Steppe',
  2: 'Ulaanbaatar High Stakes',
  3: 'Quick Game',
  4: 'Tourney-7',
  5: 'Friends Table',
  6: 'Altai Mountain Range',
  7: 'Gobi Desert Oasis',
  8: 'Karakorum Palace',
  9: 'Nomadic Campfire',
  10: "Falconer's Guild",
  11: "Sky Father's Court",
  12: 'Steppe Wind',
  13: 'Khangai Forest',
  14: 'Orkhon Valley',
  15: 'Selenge River',
  16: 'Khuvsgul Pearl',
  17: 'Tuul Stream',
  18: 'Terelj Valley',
  19: 'Bogd Khan Peak',
  20: 'Bayan-Ulgii Summit',
};

async function fetchLobbies(): Promise<LobbyRow[]> {
  try {
    const res = await fetch('/api/lobbies');
    if (!res.ok) return [];
    const data = (await res.json()) as { lobbies?: LobbyRow[] };
    return data.lobbies ?? [];
  } catch {
    return [];
  }
}

export function Lobby({
  onJoin,
  notice,
  canHost,
  activeTab,
  onNavigate,
  signOut,
}: {
  onJoin: (intent: JoinIntent) => void;
  notice?: string | null;
  canHost?: boolean;
  activeTab: 'lobby' | 'profile' | 'shop' | 'settings';
  onNavigate: (tab: 'lobby' | 'profile' | 'shop' | 'settings') => void;
  signOut?: () => Promise<void>;
}) {
  const { session } = useAuth();
  const me = session ? identityFromSession(session) : null;
  const [coins, setCoins] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(1000);
  const [showHelp, setShowHelp] = useState(false);

  const [lobbies, setLobbies] = useState<LobbyRow[] | null>(null);

  // Filters
  const [gameTypeFilter, setGameTypeFilter] = useState<'all' | 'classic' | 'tourney'>('all');
  const [stakesFilter, setStakesFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const refresh = useCallback(() => {
    void fetchLobbies().then(setLobbies);
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!supabase || !me) return;
    let active = true;
    Promise.all([
      supabase.from('profiles').select('coins').eq('id', me.userId).maybeSingle(),
      supabase.from('player_stats').select('rating').eq('user_id', me.userId).maybeSingle(),
    ]).then(([profRes, statRes]) => {
      if (!active) return;
      if (profRes.data) setCoins((profRes.data as { coins?: number }).coins ?? 0);
      if (statRes.data) setRating((statRes.data as { rating?: number }).rating ?? 1000);
    });
    return () => {
      active = false;
    };
  }, [me]);

  const list = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const id = i + 1;
      const active = lobbies?.find((l) => l.tableId === id);

      // Determine static buy-in & type & stakes
      const isClassic = id <= 10;
      const buyIn =
        id <= 5 || (id >= 11 && id <= 15) ? 100 : id <= 8 || (id >= 16 && id <= 18) ? 250 : 500;
      const stakes = buyIn === 100 ? 'low' : buyIn === 250 ? 'medium' : 'high';

      return {
        roomId: null,
        tableId: id,
        name: ROOM_NAMES[id] || `Table ${id}`,
        host: null,
        phase: 'waiting',
        playerCount: 0,
        maxPlayers: 5,
        spectatorCount: 0,
        playerNames: [],
        buyIn,
        type: isClassic ? 'Classic 15' : 'Tourney 7',
        stakes,
        ...(active ?? {}),
      };
    });
  }, [lobbies]);

  // Apply filters
  const filteredList = useMemo(() => {
    return list.filter((row) => {
      const matchType =
        gameTypeFilter === 'all' ||
        (gameTypeFilter === 'classic' && row.type === 'Classic 15') ||
        (gameTypeFilter === 'tourney' && row.type === 'Tourney 7');
      const matchStakes = stakesFilter === 'all' || row.stakes === stakesFilter;
      return matchType && matchStakes;
    });
  }, [list, gameTypeFilter, stakesFilter]);

  const getRankLabel = (r: number) => {
    if (r >= 1400) return 'Grandmaster';
    if (r >= 1200) return 'Expert Ranking';
    if (r >= 1000) return 'Professional';
    return 'Novice';
  };

  const activeCount = list.filter((row) => row.playerCount > 0).length;

  return (
    <HomeLayout className="h-full w-full flex flex-col justify-start">
      {/* ──────────────────────────── DESKTOP VIEW ──────────────────────────── */}
      <div className="hidden lg:flex flex-col w-full h-full">
        {/* Top Navbar */}
        <header className="w-full flex items-center justify-between bg-gradient-to-r from-[#4c1116] to-[#350e13] border-b border-gild/40 px-8 py-3 select-none">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🃏</span>
            <span className="font-display text-2xl font-bold tracking-widest text-ember">
              MUUSHIG
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onNavigate('lobby')}
              className={`font-hand text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'lobby' ? 'text-amber font-bold' : 'text-cream hover:text-amber'
              }`}
            >
              {t('homeLabel', { defaultValue: 'Home' })}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className={`font-hand text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'profile' ? 'text-amber font-bold' : 'text-cream hover:text-amber'
              }`}
            >
              {t('tabStats')}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className={`font-hand text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'shop' ? 'text-amber font-bold' : 'text-cream hover:text-amber'
              }`}
            >
              {t('tabShop')}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className={`font-hand text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'settings' ? 'text-amber font-bold' : 'text-cream hover:text-amber'
              }`}
            >
              {t('settingsTitle')}
            </button>
          </nav>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              aria-label={t('helpOpen')}
              className="grid h-8 w-8 place-items-center rounded-full border border-amber/40 bg-[#4c1116]/80 text-[#faf8f4] font-hand text-lg font-bold hover:bg-[#4c1116] cursor-pointer shadow-sm select-none"
            >
              ?
            </button>
            {me && (
              <div
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2.5 rounded-full border border-gild/45 bg-[#4c1116]/80 px-4 py-1 hover:bg-[#4c1116] transition-all duration-200 cursor-pointer select-none"
              >
                <div className="h-6 w-6 rounded-full border border-amber bg-parchment-deep grid place-items-center font-hand text-xs font-bold text-ember">
                  {me.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-hand text-sm font-semibold text-cream">{me.username}</span>
                {coins !== null && (
                  <span className="font-hand text-xs text-amber font-bold flex items-center gap-1">
                    <GoldCoinIcon className="w-3.5 h-3.5" /> {coins}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto overflow-y-auto p-8">
          {activeTab === 'lobby' ? (
            <div className="grid grid-cols-12 gap-6 h-full">
              {/* Left Filter Column (3 cols) */}
              <div className="col-span-3 flex flex-col gap-5 select-none">
                {/* Game Type Filter */}
                <div className="bg-[#fdfbf7] border border-gild/30 rounded-[20px] p-5 shadow-sm text-[#332b25]">
                  <h3 className="font-display text-base font-bold text-[#4c1116] border-b border-gild/20 pb-2 mb-3">
                    {t('filterGameType', { defaultValue: 'Game Type' })}
                  </h3>
                  <div className="flex flex-col gap-2 font-hand text-sm font-semibold text-[#5c4a3b]">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="gameType"
                        checked={gameTypeFilter === 'all'}
                        onChange={() => setGameTypeFilter('all')}
                        className="accent-amber"
                      />
                      <span>All Types</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="gameType"
                        checked={gameTypeFilter === 'classic'}
                        onChange={() => setGameTypeFilter('classic')}
                        className="accent-amber"
                      />
                      <span>Classic 15</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="gameType"
                        checked={gameTypeFilter === 'tourney'}
                        onChange={() => setGameTypeFilter('tourney')}
                        className="accent-amber"
                      />
                      <span>Tourney 7</span>
                    </label>
                  </div>
                </div>

                {/* Stakes Filter */}
                <div className="bg-[#fdfbf7] border border-gild/30 rounded-[20px] p-5 shadow-sm text-[#332b25]">
                  <h3 className="font-display text-base font-bold text-[#4c1116] border-b border-gild/20 pb-2 mb-3">
                    {t('filterStakes', { defaultValue: 'Stakes' })}
                  </h3>
                  <div className="flex flex-col gap-2 font-hand text-sm font-semibold text-[#5c4a3b]">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="stakes"
                        checked={stakesFilter === 'all'}
                        onChange={() => setStakesFilter('all')}
                        className="accent-amber"
                      />
                      <span>All Stakes</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="stakes"
                        checked={stakesFilter === 'low'}
                        onChange={() => setStakesFilter('low')}
                        className="accent-amber"
                      />
                      <span>Low (100)</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="stakes"
                        checked={stakesFilter === 'medium'}
                        onChange={() => setStakesFilter('medium')}
                        className="accent-amber"
                      />
                      <span>Medium (250)</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="stakes"
                        checked={stakesFilter === 'high'}
                        onChange={() => setStakesFilter('high')}
                        className="accent-amber"
                      />
                      <span>High (500)</span>
                    </label>
                  </div>
                </div>

                {/* Create Room Button */}
                <button
                  type="button"
                  onClick={() =>
                    onJoin({
                      mode: 'create',
                      maxPlayers: 5,
                      isPrivate: true,
                      tableName: 'Private Game',
                    })
                  }
                  className="w-full bg-gradient-to-r from-amber to-amber-deep text-[#1d1503] font-hand font-bold text-sm py-3 rounded-xl shadow-md border border-amber/40 hover:brightness-110 cursor-pointer active:scale-98 transition-all"
                >
                  CREATE PRIVATE TABLE
                </button>

                {/* Decorative Card */}
                <div className="bg-[#fdfbf7] border border-gild/30 rounded-[20px] p-5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden h-36">
                  <MongolianCloud className="absolute inset-0 opacity-15 w-full h-full scale-125" />
                  <div className="relative text-center select-none z-10">
                    <SwordIcon className="w-8 h-8 text-amber mx-auto" />
                    <p className="font-display text-sm font-bold text-[#4c1116] mt-2">
                      NOMADIC GLORY
                    </p>
                    <p className="font-hand text-[10px] text-[#c5bbae] uppercase tracking-widest mt-1">
                      Muushig Steppe
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Tables Browser (9 cols) */}
              <div className="col-span-9 flex flex-col gap-4">
                {/* Notice banner */}
                {notice && (
                  <p className="animate-bounce rounded-xl border border-danger/40 bg-[#4c1116] px-4 py-2 text-center font-hand text-sm font-semibold text-cream shadow-md select-none">
                    {notice}
                  </p>
                )}

                {/* Info header bar */}
                <div className="flex items-center justify-between bg-[#4c1116] border border-gild/30 rounded-xl p-4 text-cream shadow-sm font-hand text-sm select-none">
                  <div className="flex items-center gap-4">
                    <span>
                      <strong>Game Type:</strong>{' '}
                      {gameTypeFilter === 'all'
                        ? 'All Types'
                        : gameTypeFilter === 'classic'
                          ? 'Classic 15'
                          : 'Tourney 7'}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Stakes:</strong>{' '}
                      {stakesFilter === 'all'
                        ? 'All Stakes'
                        : stakesFilter === 'low'
                          ? 'Low (100)'
                          : stakesFilter === 'medium'
                            ? 'Medium (250)'
                            : 'High (500)'}
                    </span>
                  </div>
                  <span className="text-amber font-semibold">{activeCount} / 20 Tables Active</span>
                </div>

                {/* Grid browser */}
                <div className="bg-[#fdfbf7] border border-gild/30 rounded-[20px] overflow-hidden shadow-sm flex flex-col">
                  <div className="grid grid-cols-12 bg-gradient-to-r from-amber to-amber-deep text-[#1d1503] font-display font-extrabold text-sm py-2.5 px-6 border-b border-gild/30 select-none">
                    <span className="col-span-4 uppercase tracking-wider">Room Name</span>
                    <span className="col-span-2 text-center uppercase tracking-wider">Players</span>
                    <span className="col-span-2 text-center uppercase tracking-wider">Buy-in</span>
                    <span className="col-span-2 text-center uppercase tracking-wider">Type</span>
                    <span className="col-span-2 text-center uppercase tracking-wider">Action</span>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[500px]">
                    {filteredList.map((row) => {
                      const waiting = row.phase === 'waiting';
                      const seatFree = waiting && row.playerCount < row.maxPlayers;
                      return (
                        <div
                          key={row.tableId}
                          className="grid grid-cols-12 items-center font-hand text-sm text-[#332b25] py-3.5 px-6 border-b border-gild/15 hover:bg-[#faf6eb] transition-all duration-200"
                        >
                          <span className="col-span-4 font-bold flex flex-col items-start gap-0.5">
                            <span className="flex items-center gap-2">
                              <span className="text-amber">●</span>
                              {row.name}
                            </span>
                            {row.playerNames && row.playerNames.length > 0 && (
                              <span className="text-[10px] text-[#c5bbae] font-semibold pl-4">
                                {row.playerNames.join(', ')}
                              </span>
                            )}
                          </span>
                          <span className="col-span-2 text-center font-semibold text-[#c5bbae]">
                            {row.playerCount} / {row.maxPlayers}
                          </span>
                          <span className="col-span-2 text-center font-bold text-amber flex items-center justify-center gap-1">
                            <GoldCoinIcon className="w-3.5 h-3.5" /> {row.buyIn}
                          </span>
                          <span className="col-span-2 text-center font-semibold text-[#c5bbae]">
                            {row.type}
                          </span>
                          <div className="col-span-2 text-center">
                            <button
                              type="button"
                              onClick={() => onJoin({ mode: 'table', tableId: row.tableId })}
                              className="px-5 py-1.5 rounded-lg bg-amber hover:bg-amber-deep text-[#1d1503] font-bold text-xs shadow-sm cursor-pointer transition-all duration-200"
                            >
                              {seatFree ? '[JOIN]' : '[WATCH]'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'profile' ? (
            <Profile session={session} signOut={signOut} />
          ) : activeTab === 'shop' ? (
            <Shop session={session} />
          ) : (
            <SettingsDashboard session={session} signOut={signOut} />
          )}
        </main>
      </div>

      {/* ──────────────────────────── MOBILE VIEW ──────────────────────────── */}
      <div className="flex lg:hidden flex-col w-full h-full relative pb-16 overflow-y-auto px-4 pt-4">
        {/* Welcome Profile Bar */}
        {me && (
          <div className="w-full flex items-center justify-between bg-gradient-to-r from-[#4c1116] to-[#350e13] border-2 border-gild/45 rounded-2xl p-4 shadow-md relative overflow-hidden select-none mb-4">
            <MongolianCloud className="absolute right-[-20px] top-[-10px] w-32 h-32 opacity-10 pointer-events-none" />
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => onNavigate('profile')}
            >
              <div className="h-11 w-11 rounded-full border border-amber bg-parchment-deep grid place-items-center font-hand text-lg font-bold text-ember">
                {me.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="font-hand text-[10px] text-ember/85 uppercase tracking-wider block">
                  Welcome,
                </span>
                <span className="font-display text-base font-bold text-cream block truncate leading-tight mt-0.5">
                  {me.username}
                </span>
                <span className="font-hand text-[10px] text-ink-soft block mt-0.5">
                  {getRankLabel(rating)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {coins !== null && (
                <div className="bg-[#4c1116] border border-gild/45 rounded-full py-1 px-3 flex items-center gap-1.5 font-hand text-xs font-bold text-amber shadow-inner">
                  <GoldCoinIcon className="w-3.5 h-3.5" />
                  <span>{coins}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className="h-7 w-7 rounded-full border border-gild/30 bg-[#350e13] hover:bg-[#4c1116] grid place-items-center text-xs text-cream/75 hover:text-cream cursor-pointer"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Notice alert */}
        {notice && (
          <p className="animate-bounce rounded-xl border border-danger/40 bg-[#4c1116] px-4 py-2 text-center font-hand text-sm font-semibold text-cream shadow-md mb-4 select-none">
            {notice}
          </p>
        )}

        {activeTab === 'lobby' ? (
          <>
            {/* GAME LOBBY Header */}
            <div className="flex items-center justify-between mb-3 px-1 select-none">
              <h2 className="font-display text-lg font-bold tracking-wider text-ember uppercase">
                Game Lobby
              </h2>
              <button
                type="button"
                onClick={refresh}
                className="font-hand text-xs font-semibold text-[#daaa3d] hover:text-[#ca8a04] flex items-center gap-1 cursor-pointer"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Room cards list */}
            <div className="flex flex-col gap-3 flex-1">
              {list.map((row) => {
                const waiting = row.phase === 'waiting';
                const seatFree = waiting && row.playerCount < row.maxPlayers;
                return (
                  <div
                    key={row.tableId}
                    className="bg-[#fdfbf7] border-2 border-gild/25 rounded-2xl p-4 shadow-sm flex items-center justify-between select-none"
                  >
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-extrabold text-[#4c1116] truncate">
                        {row.name}
                      </h3>
                      {row.playerNames && row.playerNames.length > 0 && (
                        <p className="font-hand text-[10px] text-[#c5bbae] truncate mt-0.5">
                          {row.playerNames.join(', ')}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 font-hand text-xs text-[#c5bbae]">
                        <span>{row.type}</span>
                        <span>•</span>
                        <span className="font-semibold text-amber flex items-center gap-0.5">
                          <GoldCoinIcon className="w-3 h-3" /> {row.buyIn}
                        </span>
                        <span>•</span>
                        <span className="font-bold flex items-center gap-0.5">
                          <ProfileIcon className="w-3 h-3" /> {row.playerCount} / {row.maxPlayers}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onJoin({ mode: 'table', tableId: row.tableId })}
                      className="bg-amber hover:bg-amber-deep text-[#1d1503] font-hand font-bold text-xs py-2 px-5 rounded-xl border border-amber/40 shadow-sm cursor-pointer transition-all active:scale-95 ml-2"
                    >
                      {seatFree ? 'JOIN' : 'WATCH'}
                    </button>
                  </div>
                );
              })}

              {/* Private game Create room card */}
              <div className="bg-[#4c1116]/80 border-2 border-gild/45 rounded-2xl p-4 shadow-sm flex items-center justify-between select-none mt-2 mb-6">
                <div>
                  <h3 className="font-display text-base font-extrabold text-ember">Private Game</h3>
                  <p className="font-hand text-xs text-cream/70 mt-1">Play only with friends</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onJoin({
                      mode: 'create',
                      maxPlayers: 5,
                      isPrivate: true,
                      tableName: 'Private Game',
                    })
                  }
                  className="bg-gradient-to-r from-amber to-amber-deep text-[#1d1503] font-hand font-bold text-xs py-2 px-4 rounded-xl shadow-sm border border-amber/40 hover:brightness-110 cursor-pointer active:scale-95"
                >
                  CREATE ROOM
                </button>
              </div>
            </div>
          </>
        ) : activeTab === 'profile' ? (
          <Profile session={session} signOut={signOut} />
        ) : activeTab === 'shop' ? (
          <Shop session={session} />
        ) : (
          <SettingsDashboard session={session} signOut={signOut} />
        )}

        {/* Mobile Bottom Navigation Bar */}
        <footer className="fixed bottom-0 left-0 right-0 h-16 bg-[#3d1a1b] border-t border-gild/40 flex items-center justify-around z-40 select-none">
          <button
            type="button"
            onClick={() => onNavigate('lobby')}
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'lobby' ? 'text-amber' : 'text-cream hover:text-amber'
            }`}
          >
            <LobbyIcon className="w-5 h-5" />
            <span className="font-hand text-[10px] font-bold">Lobby</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'profile' ? 'text-amber' : 'text-cream hover:text-amber'
            }`}
          >
            <ProfileIcon className="w-5 h-5" />
            <span className="font-hand text-[10px] font-bold">Profile</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'shop' ? 'text-amber' : 'text-cream hover:text-amber'
            }`}
          >
            <ShopIcon className="w-5 h-5" />
            <span className="font-hand text-[10px] font-bold">Shop</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'settings' ? 'text-amber' : 'text-cream hover:text-amber'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="font-hand text-[10px] font-bold">Settings</span>
          </button>
        </footer>
      </div>

      {showHelp && <HelpBook onClose={() => setShowHelp(false)} />}
    </HomeLayout>
  );
}

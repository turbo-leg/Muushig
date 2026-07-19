import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { identityFromSession } from '../auth/identity';
import {
  isMuted,
  toggleMuted,
  getSfxVolume,
  setSfxVolume,
  getMusicVolume,
  setMusicVolume,
  play,
  initAudio,
} from '../audio/sound';
import { isMusicOn, toggleMusic } from '../audio/music';
import { t, getLocale, toggleLocale } from '../i18n';
import { MongolianCloud } from './MongolianCloud';
import { GoldCoinIcon } from './Icons';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink/10 py-2 last:border-b-0">
      <span className="font-hand text-lg text-black font-semibold" style={{ color: '#000000' }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full border transition-colors cursor-pointer ${
        on ? 'border-amber bg-amber' : 'border-ink/30 bg-parchment-deep'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4.5 w-4.5 rounded-full border border-ink/40 bg-parchment shadow transition-all ${
          on ? 'left-[calc(100%-1.25rem)]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function Slider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={Math.round(value * 100)}
      aria-label={label}
      onChange={(e) => onChange(parseInt(e.target.value, 10) / 100)}
      className="w-32 accent-[#d98e04] cursor-pointer"
    />
  );
}

export function SettingsForm({ onOpenHelp }: { onOpenHelp?: () => void }) {
  const [muted, setMutedState] = useState(isMuted());
  const [sfx, setSfx] = useState(getSfxVolume());
  const [music, setMusic] = useState(getMusicVolume());
  const [musicOn, setMusicOn] = useState(isMusicOn());

  return (
    <div className="flex flex-col gap-3.5 text-[#332b25]">
      <Row label={t('muteAll')}>
        <Toggle
          on={muted}
          label={t('muteAll')}
          onChange={() => {
            initAudio();
            setMutedState(toggleMuted());
          }}
        />
      </Row>

      <Row label={t('sfxVolume')}>
        <Slider
          value={sfx}
          label={t('sfxVolume')}
          onChange={(v) => {
            initAudio();
            setSfxVolume(v);
            setSfx(v);
            play('click');
          }}
        />
      </Row>

      <Row label={t('musicToggle')}>
        <Toggle on={musicOn} label={t('musicToggle')} onChange={() => setMusicOn(toggleMusic())} />
      </Row>

      <Row label={t('musicVolume')}>
        <Slider
          value={music}
          label={t('musicVolume')}
          onChange={(v) => {
            setMusicVolume(v);
            setMusic(v);
          }}
        />
      </Row>

      <Row label={t('languageRow')}>
        <button
          type="button"
          onClick={toggleLocale}
          className="rounded-lg border border-ink/30 bg-[#faf6eb] hover:bg-[#faf6eb]/80 px-3 py-1 font-hand text-lg font-bold text-[#daaa3d] cursor-pointer"
        >
          {getLocale() === 'en' ? 'English → Монгол' : 'Монгол → English'}
        </button>
      </Row>

      {onOpenHelp && (
        <Row label={t('rulesRow')}>
          <button
            type="button"
            onClick={onOpenHelp}
            className="grid h-8 w-8 place-items-center rounded-full border border-ink/30 bg-[#faf6eb] hover:bg-[#faf6eb]/80 font-hand text-lg font-bold text-[#daaa3d] cursor-pointer"
            aria-label={t('helpOpen')}
          >
            ?
          </button>
        </Row>
      )}

      <div className="mt-3 flex justify-center gap-4 text-sm text-[#c5bbae]">
        <a href="/privacy" target="_blank" rel="noreferrer" className="underline hover:text-cream">
          {t('privacyLink')}
        </a>
        <a href="/terms" target="_blank" rel="noreferrer" className="underline hover:text-cream">
          {t('termsLink')}
        </a>
      </div>
    </div>
  );
}

/** Gear modal: audio, language. Values persist via the audio module. */
export function Settings({ onClose, onOpenHelp }: { onClose: () => void; onOpenHelp: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 safe-pad"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('settingsTitle')}
    >
      <div
        className="relative flex w-full max-w-sm flex-col rounded-[24px] border-2 border-[#e5c158] bg-[#faf8f4] px-6 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.65)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <MongolianCloud className="absolute -top-12 -right-12 w-28 h-28 opacity-10 rotate-90 pointer-events-none" />
        <MongolianCloud className="absolute -bottom-12 -left-12 w-28 h-28 opacity-10 pointer-events-none" flip />

        <button
          type="button"
          onClick={onClose}
          aria-label={t('cancel')}
          className="absolute right-3 top-2 font-hand text-2xl text-ink-soft hover:text-ink cursor-pointer z-10"
        >
          ✕
        </button>
        <h2 className="mb-4 border-b-2 border-gild pb-2 font-display text-3xl font-bold text-[#4c1116] uppercase tracking-wider relative z-10">
          {t('settingsTitle')}
        </h2>
        <div className="relative z-10">
          <SettingsForm onOpenHelp={onOpenHelp} />
        </div>
      </div>
    </div>
  );
}

/** Redesigned settings page for Lobby (Desktop sidebar + Mobile group list) */
export function SettingsDashboard({
  session,
  signOut,
}: {
  session: Session;
  signOut?: () => Promise<void>;
}) {
  const me = identityFromSession(session);
  const [coins, setCoins] = useState<number | null>(null);
  const [activeSidebar, setActiveSidebar] = useState<
    'profile' | 'security' | 'preferences' | 'subscriptions' | 'history' | 'support'
  >('preferences');

  // Volume bindings
  const [masterVolume, setMasterVolume] = useState(50);
  const [musicVolume, setMusicVolumeState] = useState(Math.round(getMusicVolume() * 100));
  const [sfxVolume, setSfxVolumeState] = useState(Math.round(getSfxVolume() * 100));

  // Mobile expanding state
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('profiles')
      .select('coins')
      .eq('id', me.userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCoins((data as { coins?: number }).coins ?? 0);
      });
  }, [me.userId]);

  const handleMusicChange = (val: number) => {
    setMusicVolumeState(val);
    setMusicVolume(val / 100);
  };

  const handleSfxChange = (val: number) => {
    setSfxVolumeState(val);
    setSfxVolume(val / 100);
    play('click');
  };

  return (
    <div className="w-full text-[#332b25]">
      {/* ──────────────────────────── DESKTOP VIEW ──────────────────────────── */}
      <div className="hidden lg:flex flex-col gap-4">
        <h2 className="font-display text-2xl font-black text-cream uppercase tracking-widest border-b border-gild/15 pb-2 mb-2 select-none text-left">
          {t('accountSettingsDashboard')}
        </h2>

        <div className="grid grid-cols-12 gap-6 select-none">
          {/* Left Sidebar Menu */}
          <div className="col-span-4 flex flex-col gap-2 bg-[#4c1116]/30 p-3.5 rounded-[20px] border border-gild/15">
            {[
              ['profile', t('tabProfile')],
              ['security', t('tabSecurity')],
              ['preferences', t('tabPreferences')],
              ['subscriptions', t('tabSubscriptions')],
              ['history', t('tabHistory')],
              ['support', t('tabSupport')],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveSidebar(id as any)}
                className={`w-full py-3.5 px-5 rounded-xl font-hand font-extrabold text-sm text-left border transition-all cursor-pointer ${
                  activeSidebar === id
                    ? 'bg-[#faf8f4] border-[#e5c158] text-[#4c1116] shadow-sm'
                    : 'bg-transparent border-transparent text-cream hover:bg-[#4c1116]/50'
                }`}
              >
                [{label.toUpperCase()}]
              </button>
            ))}
          </div>

          {/* Right Dashboard Preferences Card */}
          <div className="col-span-8 bg-[#faf8f4] border-2 border-[#e5c158] rounded-[24px] p-8 shadow-md relative min-h-[400px]">
            <div className="absolute top-0 right-0 w-24 h-24 opacity-10 pointer-events-none text-amber">
              <svg viewBox="0 0 160 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M40 70 C 40 50, 60 40, 80 40 C 100 40, 120 50, 120 70" />
              </svg>
            </div>

            {activeSidebar === 'preferences' ? (
              <div className="flex flex-col gap-6">
                <div className="text-left">
                  <h3 className="font-display text-base font-extrabold text-[#4c1116] border-b border-gild/20 pb-2 mb-5">
                    {t('tabPreferences')}
                  </h3>

                  <div className="flex flex-col gap-5">
                    {/* Master Volume */}
                    <div className="flex flex-col gap-1.5">
                      <span className="font-hand text-sm font-extrabold text-[#736357]">{t('soundAndAudio')}</span>
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-hand text-base text-black font-semibold w-32">{t('masterVolume')}</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={masterVolume}
                          onChange={(e) => setMasterVolume(parseInt(e.target.value, 10))}
                          className="flex-grow accent-[#d98e04] cursor-pointer"
                        />
                        <span className="num font-bold text-amber-deep w-8 text-right">{masterVolume}</span>
                      </div>
                    </div>

                    {/* Music Volume */}
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-hand text-base text-black font-semibold w-32">{t('musicVolumeLabel')}</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={musicVolume}
                        onChange={(e) => handleMusicChange(parseInt(e.target.value, 10))}
                        className="flex-grow accent-[#d98e04] cursor-pointer"
                      />
                      <span className="num font-bold text-amber-deep w-8 text-right">{musicVolume}</span>
                    </div>

                    {/* SFX Volume */}
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-hand text-base text-black font-semibold w-32">{t('sfxVolumeLabel')}</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={sfxVolume}
                        onChange={(e) => handleSfxChange(parseInt(e.target.value, 10))}
                        className="flex-grow accent-[#d98e04] cursor-pointer"
                      />
                      <span className="num font-bold text-amber-deep w-8 text-right">{sfxVolume}</span>
                    </div>

                    {/* Language Dropdown */}
                    <div className="flex items-center justify-between gap-4 border-t border-gild/10 pt-4 mt-2">
                      <span className="font-hand text-base text-black font-semibold">{t('languageLabel')}</span>
                      <select
                        value={getLocale()}
                        onChange={toggleLocale}
                        className="rounded-lg border border-[#c5bbae]/60 bg-[#fdfbf7] px-3 py-1.5 font-hand text-sm font-bold text-[#daaa3d] outline-none cursor-pointer"
                      >
                        <option value="en">English</option>
                        <option value="mn">Монгол</option>
                      </select>
                    </div>

                    {/* Subscription Management */}
                    <div className="flex items-center justify-between gap-4 border-t border-gild/10 pt-4 mt-2">
                      <span className="font-hand text-base text-black font-semibold">{t('subscriptionManagement')}</span>
                      <button className="rounded-lg border border-gild/30 bg-[#faf6eb] hover:bg-[#faf6eb]/80 px-4 py-1.5 font-hand text-xs font-bold text-[#daaa3d] cursor-pointer">
                        {t('manageSubscriptions')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-[#736357]">
                <span className="text-4xl">⚙️</span>
                <h4 className="font-display text-base font-extrabold text-[#4c1116] uppercase mt-4">
                  {activeSidebar.toUpperCase()}
                </h4>
                <p className="font-hand text-xs text-[#c5bbae] mt-1">{t('underDevelopment')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────── MOBILE VIEW ──────────────────────────── */}
      <div className="lg:hidden flex flex-col gap-4 select-none">
        {/* Header user settings card */}
        <div className="bg-[#4c1116]/30 border border-gild/15 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-full border border-amber bg-parchment bg-cover bg-center grid place-items-center font-hand text-lg font-bold text-ember"
              style={me.avatarUrl ? { backgroundImage: `url("${me.avatarUrl}")` } : undefined}
            >
              {!me.avatarUrl && me.username.charAt(0).toUpperCase()}
            </div>
            <h2 className="font-display text-sm font-extrabold text-cream leading-tight">
              {t('mobileSettingsHeader', { username: me.username })}
            </h2>
          </div>
          {coins !== null && (
            <div className="flex items-center gap-1 bg-[#4c1116]/80 border border-gild/35 px-3 py-1 rounded-xl text-amber text-xs font-bold">
              <GoldCoinIcon className="w-3.5 h-3.5" />
              <span>{coins}</span>
            </div>
          )}
        </div>

        {/* Group lists accordion */}
        <div className="flex flex-col gap-3 text-left">
          {/* 1. Account Settings Group */}
          <div>
            <h3 className="text-[10px] font-bold text-[#736357] tracking-widest uppercase mb-1.5 pl-1">
              {t('accountSettingsDashboard').split(' ')[0]} {t('accountSettingsDashboard').split(' ')[1]}
            </h3>
            <div className="rounded-xl border border-gild/20 bg-[#faf8f4] overflow-hidden">
              {/* Profile Info */}
              <button
                onClick={() => setMobileExpandedSection(mobileExpandedSection === 'profile' ? null : 'profile')}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-gild/10"
              >
                <span className="font-hand text-sm font-semibold text-black">{t('profileInformation')}</span>
                <span className="text-xs text-[#736357]">{mobileExpandedSection === 'profile' ? '▼' : '▶'}</span>
              </button>
              {mobileExpandedSection === 'profile' && (
                <div className="p-4 bg-[#fdfbf7] text-xs text-[#736357] leading-relaxed border-b border-gild/10">
                  <p><strong>{t('usernameLabel')}:</strong> {me.username}</p>
                  <p className="mt-1"><strong>ID:</strong> #{me.userId.slice(0, 8)}</p>
                </div>
              )}

              {/* Security & Login */}
              <button
                onClick={() => setMobileExpandedSection(mobileExpandedSection === 'security' ? null : 'security')}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <span className="font-hand text-sm font-semibold text-black">{t('securityAndLogin')}</span>
                <span className="text-xs text-[#736357]">{mobileExpandedSection === 'security' ? '▼' : '▶'}</span>
              </button>
              {mobileExpandedSection === 'security' && (
                <div className="p-4 bg-[#fdfbf7] text-xs text-[#736357] leading-relaxed">
                  <p>{t('underDevelopment')}</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Game Preferences Group */}
          <div>
            <h3 className="text-[10px] font-bold text-[#736357] tracking-widest uppercase mb-1.5 pl-1">
              {t('tabPreferences')}
            </h3>
            <div className="rounded-xl border border-gild/20 bg-[#faf8f4] overflow-hidden">
              {/* Sound & Audio sliders */}
              <button
                onClick={() => setMobileExpandedSection(mobileExpandedSection === 'sound' ? null : 'sound')}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-gild/10"
              >
                <span className="font-hand text-sm font-semibold text-black">{t('soundAndAudio')}</span>
                <span className="text-xs text-[#736357]">{mobileExpandedSection === 'sound' ? '▼' : '▶'}</span>
              </button>
              {mobileExpandedSection === 'sound' && (
                <div className="p-4 bg-[#fdfbf7] flex flex-col gap-4 border-b border-gild/10 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-hand font-semibold w-24">{t('musicVolumeLabel')}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={musicVolume}
                      onChange={(e) => handleMusicChange(parseInt(e.target.value, 10))}
                      className="flex-grow accent-[#d98e04] cursor-pointer"
                    />
                    <span className="num font-bold text-amber-deep w-6 text-right">{musicVolume}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-hand font-semibold w-24">{t('sfxVolumeLabel')}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sfxVolume}
                      onChange={(e) => handleSfxChange(parseInt(e.target.value, 10))}
                      className="flex-grow accent-[#d98e04] cursor-pointer"
                    />
                    <span className="num font-bold text-amber-deep w-6 text-right">{sfxVolume}</span>
                  </div>
                </div>
              )}

              {/* Language Switch */}
              <button
                onClick={() => setMobileExpandedSection(mobileExpandedSection === 'lang' ? null : 'lang')}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-gild/10"
              >
                <span className="font-hand text-sm font-semibold text-black">{t('languageLabel')}</span>
                <span className="text-xs text-[#736357]">{mobileExpandedSection === 'lang' ? '▼' : '▶'}</span>
              </button>
              {mobileExpandedSection === 'lang' && (
                <div className="p-4 bg-[#fdfbf7] flex items-center justify-between border-b border-gild/10 text-xs">
                  <span className="font-semibold">Switch Language / Хэл солих</span>
                  <button
                    onClick={toggleLocale}
                    className="rounded-lg border border-gild/30 bg-[#faf6eb] px-3.5 py-1 font-hand font-bold text-[#daaa3d]"
                  >
                    {getLocale() === 'en' ? 'English ➔ Монгол' : 'Монгол ➔ English'}
                  </button>
                </div>
              )}

              {/* Push Notifications */}
              <button
                onClick={() => setMobileExpandedSection(mobileExpandedSection === 'push' ? null : 'push')}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <span className="font-hand text-sm font-semibold text-black">{t('pushNotifications')}</span>
                <span className="text-xs text-[#736357]">{mobileExpandedSection === 'push' ? '▼' : '▶'}</span>
              </button>
              {mobileExpandedSection === 'push' && (
                <div className="p-4 bg-[#fdfbf7] text-xs text-[#736357] leading-relaxed">
                  <p>{t('pushNotificationsDesc')}</p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Legal & Support Group */}
          <div>
            <h3 className="text-[10px] font-bold text-[#736357] tracking-widest uppercase mb-1.5 pl-1">
              LEGAL & SUPPORT
            </h3>
            <div className="rounded-xl border border-gild/20 bg-[#faf8f4] overflow-hidden">
              {/* Help Center */}
              <a href="#help" className="w-full flex items-center justify-between px-4 py-3 border-b border-gild/10">
                <span className="font-hand text-sm font-semibold text-black">{t('helpCenter')}</span>
                <span className="text-xs text-[#c5bbae]">▶</span>
              </a>

              {/* Privacy Policy */}
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between px-4 py-3 border-b border-gild/10"
              >
                <span className="font-hand text-sm font-semibold text-black">{t('privacyLink')}</span>
                <span className="text-xs text-[#c5bbae]">▶</span>
              </a>

              {/* Sign Out option */}
              {signOut && (
                <button onClick={signOut} className="w-full flex items-center justify-between px-4 py-3 text-[#b91c1c]">
                  <span className="font-hand text-sm font-bold">{t('logOut')}</span>
                  <span className="text-xs">▶</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
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
        on ? 'border-amber-deep bg-amber' : 'border-ink/30 bg-parchment-deep'
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

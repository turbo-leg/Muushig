import { t } from '../i18n';

/** The Muushig title, drawn as type with a premium gold gradient. */
export function TitleBanner() {
  return (
    <header className="flex shrink-0 flex-col items-start justify-center gap-2 text-left select-none sm:items-center sm:text-center">
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber/25 bg-parchment/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber/90 shadow-sm sm:hidden">
        <span className="h-2 w-2 rounded-full bg-amber shadow-[0_0_8px_rgba(202,138,4,0.7)]" />
        Card game tavern
      </div>
      <h1 className="bg-gradient-to-b from-[#fbe3a1] via-[#dcaa3d] to-[#ca8a04] bg-clip-text pl-[0.25em] font-display text-4xl font-extrabold tracking-[0.2em] text-transparent drop-shadow-[0_3px_5px_rgba(0,0,0,0.95)] sm:text-5xl [@media(max-height:600px)]:text-3xl">
        МУУШИГ
      </h1>
      <p className="max-w-lg font-hand text-[10px] uppercase tracking-[0.3em] text-amber/80 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] pl-[0.3em] sm:block [@media(max-height:600px)]:hidden">
        {t('tavernSubtitle')}
      </p>
    </header>
  );
}

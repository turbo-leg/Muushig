import { UlziiKnot } from './UlziiKnot';

/** The ornamental МУУШИГ header, flanked by ulzii endless-knots. */
export function TitleBanner() {
  return (
    <header className="flex items-center justify-center gap-3 py-1 select-none">
      <UlziiKnot className="hidden h-7 w-24 opacity-80 sm:block" />
      <h1 className="font-hand text-5xl font-bold tracking-wide text-wood drop-shadow-[0_2px_0_rgba(255,255,255,0.25)] sm:text-6xl">
        МУУШИГ
      </h1>
      <UlziiKnot className="hidden h-7 w-24 opacity-80 sm:block" flip />
    </header>
  );
}

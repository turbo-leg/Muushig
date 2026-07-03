/** The Muushig title, drawn as type (no image). */
export function TitleBanner() {
  return (
    <header className="flex flex-col items-center justify-center py-0.5 select-none sm:py-1">
      <h1 className="font-hand text-3xl font-bold tracking-wide text-amber drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] sm:text-5xl">
        МУУШИГ
      </h1>
      <p className="-mt-1 font-hand text-[10px] tracking-[0.2em] text-cream/70 sm:text-sm">
        Mongolian Tavern Card Game
      </p>
    </header>
  );
}

import { useAuth, type OAuthProvider } from '../auth/AuthContext';
import { TitleBanner } from './TitleBanner';
import { PlayingCard } from './PlayingCard';
import { t } from '../i18n';
import { Button } from './Button';
import { HomeLayout } from './HomeLayout';

function ProviderButton({
  provider,
  label,
  onClick,
}: {
  provider: OAuthProvider;
  label: string;
  onClick: (p: OAuthProvider) => void;
}) {
  return (
    <Button variant="primary" className="w-full justify-center" onClick={() => onClick(provider)}>
      {label}
    </Button>
  );
}

/** The sign-in gate shown on the web when no Supabase session exists. */
export function Login() {
  const { signIn } = useAuth();
  return (
    <HomeLayout className="px-4 py-6 sm:px-6 sm:py-8">
      <main className="w-full max-w-6xl">
        <div className="relative overflow-hidden rounded-[32px] border border-gild/35 bg-parchment-deep/85 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-6 lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(202,138,4,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_35%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber/30 bg-parchment/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber/90 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-amber shadow-[0_0_8px_rgba(202,138,4,0.7)]" />
                Tavern entrance
              </div>
              <TitleBanner />

              <div className="max-w-xl space-y-2">
                <p className="font-hand text-xl font-semibold text-ink drop-shadow-sm sm:text-2xl">
                  {t('signInToPlay')}
                </p>
                <p className="font-hand text-sm leading-relaxed text-ink-soft sm:text-base">
                  {t('signInSubtitle')}
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-3">
                {[
                  ['Live tables', 'Jump straight into a waiting game'],
                  ['Match history', 'Keep track of every hand'],
                  ['Social play', 'Sit with friends and rivals'],
                ].map(([title, desc]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-gild/25 bg-parchment/70 px-3 py-3 text-left shadow-inner"
                  >
                    <p className="font-hand text-sm font-semibold text-ink">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-soft">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-gild/40 bg-parchment/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_60%)]" />
              <div className="relative flex flex-col items-center gap-4">
                <div className="pointer-events-auto relative flex h-24 w-56 items-center justify-center select-none sm:h-28 sm:w-64">
                  <div className="absolute z-10 -translate-x-12 translate-y-1.5 rotate-[-14deg] transition-all duration-300 hover:-translate-y-4 hover:rotate-[-8deg] drop-shadow-md">
                    <PlayingCard rank={14} suit="Spades" />
                  </div>
                  <div className="absolute z-20 transition-all duration-300 hover:-translate-y-5 drop-shadow-lg">
                    <PlayingCard rank={13} suit="Hearts" />
                  </div>
                  <div className="absolute z-10 translate-x-12 translate-y-1.5 rotate-[14deg] transition-all duration-300 hover:-translate-y-4 hover:rotate-[8deg] drop-shadow-md">
                    <PlayingCard rank={12} suit="Diamonds" />
                  </div>
                </div>

                <div className="w-full rounded-[22px] border border-gild/35 bg-parchment-deep/90 p-4 text-center shadow-[0_10px_30px_rgba(0,0,0,0.28)] sm:p-5">
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-[1px] w-10 bg-gradient-to-r from-transparent to-gild/55" />
                    <span className="text-xs text-gild/70">♦</span>
                    <div className="h-[1px] w-10 bg-gradient-to-l from-transparent to-gild/55" />
                  </div>
                  <div className="mt-3 flex flex-col gap-2.5">
                    <ProviderButton
                      provider="discord"
                      label={t('continueDiscord')}
                      onClick={signIn}
                    />
                    <ProviderButton
                      provider="google"
                      label={t('continueGoogle')}
                      onClick={signIn}
                    />
                    <ProviderButton
                      provider="facebook"
                      label={t('continueFacebook')}
                      onClick={signIn}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </HomeLayout>
  );
}

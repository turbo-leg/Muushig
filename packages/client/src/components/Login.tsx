import { useAuth, type OAuthProvider } from '../auth/AuthContext';
import { TitleBanner } from './TitleBanner';

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
    <button
      type="button"
      onClick={() => onClick(provider)}
      className="btn-wood btn-wood--primary w-full justify-center"
    >
      {label}
    </button>
  );
}

/** The sign-in gate shown on the web when no Supabase session exists. */
export function Login() {
  const { signIn } = useAuth();
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-7 p-6 select-none">
      <TitleBanner />
      <div className="parchment flex w-full max-w-xs flex-col items-stretch gap-3 px-7 py-7 text-center">
        <p className="font-hand text-2xl text-ink">Sign in to play</p>
        <p className="-mt-2 mb-1 font-hand text-base text-ink-soft">
          Track your games, wins, and match history.
        </p>
        <ProviderButton provider="discord" label="Continue with Discord" onClick={signIn} />
        <ProviderButton provider="google" label="Continue with Google" onClick={signIn} />
        <ProviderButton provider="facebook" label="Continue with Facebook" onClick={signIn} />
      </div>
    </main>
  );
}

import { Component, type ReactNode } from 'react';
import { reportError } from '../lib/report';
import { t } from '../i18n';

interface State {
  hasError: boolean;
}

/**
 * Last line of defense for render crashes — without it a throw white-screens
 * the whole Discord iframe. Reload is the right recovery: the reconnection
 * token in sessionStorage re-seats the player at their table.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    reportError(error, 'react-render');
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-full items-center justify-center bg-[#2a1c12] p-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[12px] border-2 border-gild bg-parchment px-6 py-6 text-center shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <p className="font-hand text-3xl font-bold text-ink">{t('crashTitle')}</p>
          <p className="font-hand text-lg leading-snug text-ink-soft">{t('crashBody')}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border-2 border-amber-deep bg-amber px-5 py-2 font-hand text-xl font-bold text-[#1d1503] shadow-md"
          >
            {t('crashReload')}
          </button>
        </div>
      </main>
    );
  }
}

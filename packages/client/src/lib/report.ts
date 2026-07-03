/**
 * Minimal self-hosted error reporting: fire-and-forget POSTs to the game
 * server, which folds them into its structured log (the Fly log drain is the
 * store — no external SDK). Deduped by message with a hard session cap so a
 * render loop can't flood anything.
 */
const MAX_REPORTS_PER_SESSION = 5;

const seen = new Set<string>();
let sent = 0;

export function reportError(error: unknown, context: string): void {
  if (sent >= MAX_REPORTS_PER_SESSION) return;
  const message = error instanceof Error ? error.message : String(error);
  const key = `${context}:${message}`;
  if (seen.has(key)) return;
  seen.add(key);
  sent += 1;

  const stack = error instanceof Error ? (error.stack ?? '') : '';
  try {
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message.slice(0, 500),
        stack: stack.slice(0, 2000),
        context,
        url: typeof location !== 'undefined' ? location.href.slice(0, 200) : '',
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* reporting must never throw */
  }
}

/** Window-level hooks for the errors an ErrorBoundary can't see. */
export function installGlobalErrorHooks(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'window.onerror'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'unhandledrejection'));
}

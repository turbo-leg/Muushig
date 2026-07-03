type Level = 'info' | 'warn' | 'error';

/**
 * Dependency-free structured logging: one JSON line per event, so the Fly log
 * drain doubles as the event store. Silent under vitest so room tests stay
 * readable.
 */
export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

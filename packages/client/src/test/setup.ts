import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    enabled: true,
    loading: false,
    session: {
      user: { id: 'test-user', email: 'test@example.com' },
    },
    signOut: vi.fn(),
  }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  },
  isAuthEnabled: true,
}));

// Node 22 exposes a global `localStorage` stub (inert without
// --experimental-webstorage) that shadows jsdom's working implementation.
// Give tests a real in-memory Storage so persistence code paths are testable.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
});

import type { Game } from '../engine/types';
import { STORAGE_KEY } from '../engine/constants';
import type { StorageAdapter } from './adapter';

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type LoadProblem = 'incompatible' | 'corrupt' | null;

function looksLikeGame(value: unknown): value is Game {
  if (typeof value !== 'object' || value === null) return false;
  const g = value as Partial<Game>;
  return (
    g.version === 1 &&
    typeof g.id === 'string' &&
    typeof g.setup === 'object' &&
    g.setup !== null &&
    typeof g.sim === 'object' &&
    g.sim !== null &&
    Array.isArray(g.plan) &&
    Array.isArray(g.decisions) &&
    Array.isArray(g.history)
  );
}

export class LocalStorageAdapter implements StorageAdapter {
  /** 직전 load()가 null을 돌려준 이유 */
  lastProblem: LoadProblem = null;

  constructor(
    private readonly key: string = STORAGE_KEY,
    private readonly store: KV | null = typeof window !== 'undefined' ? window.localStorage : null,
  ) {}

  /** 브라우저에서 첫 화면을 바로 그릴 때 쓰는 동기 버전. Supabase 어댑터는 비동기 load()만 구현하면 된다. */
  loadSync(): Game | null {
    this.lastProblem = null;
    if (!this.store) return null;
    let raw: string | null = null;
    try {
      raw = this.store.getItem(this.key);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && (parsed as { version?: unknown }).version !== 1) {
        this.lastProblem = 'incompatible';
        return null;
      }
      if (!looksLikeGame(parsed)) {
        this.lastProblem = 'corrupt';
        return null;
      }
      return parsed;
    } catch {
      this.lastProblem = 'corrupt';
      return null;
    }
  }

  saveSync(game: Game): void {
    if (!this.store) return;
    this.store.setItem(this.key, JSON.stringify(game));
  }

  clearSync(): void {
    if (!this.store) return;
    this.store.removeItem(this.key);
  }

  async load(): Promise<Game | null> {
    return this.loadSync();
  }

  async save(game: Game): Promise<void> {
    this.saveSync(game);
  }

  async clear(): Promise<void> {
    this.clearSync();
  }
}

import type { Game } from '../engine/types';

/**
 * 저장소 인터페이스. 지금은 브라우저 localStorage이고, 이후 Supabase 어댑터가 같은 인터페이스를 구현한다.
 * Supabase 이행 시 제안: games(id uuid pk, owner uuid, data jsonb, updated_at timestamptz)
 */
export interface StorageAdapter {
  load(): Promise<Game | null>;
  save(game: Game): Promise<void>;
  clear(): Promise<void>;
}

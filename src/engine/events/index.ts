import type { GameEvent, Stage } from '../types';
import { STAGE1_EVENTS } from './stage1';
import { STAGE2_EVENTS } from './stage2';
import { STAGE3_EVENTS } from './stage3';
import { EMERGENCY_EVENT } from './emergency';

export { EMERGENCY_EVENT_ID } from './emergency';

export const ALL_EVENTS: GameEvent[] = [...STAGE1_EVENTS, ...STAGE2_EVENTS, ...STAGE3_EVENTS, EMERGENCY_EVENT];

export const EVENT_MAP: Record<string, GameEvent> = Object.fromEntries(
  ALL_EVENTS.map((e) => [e.id, e]),
);

export function getEvent(id: string): GameEvent {
  const ev = EVENT_MAP[id];
  if (!ev) throw new Error(`알 수 없는 이벤트: ${id}`);
  return ev;
}

/** 해당 단계의 후보(대체 이벤트 제외), order 순 */
export function stageCandidates(stage: Stage): GameEvent[] {
  return ALL_EVENTS.filter((e) => e.stage === stage && !e.isFallback).sort((a, b) => a.order - b.order);
}

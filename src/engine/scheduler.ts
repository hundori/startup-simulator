import type { GameEvent, GameMode, SimState, Stage } from './types';
import { evalConds } from './rules';
import { EVENT_MAP, stageCandidates } from './events';
import { hashString, seededRandom } from './rng';

export const CLASS_MODE_EVENTS_PER_STAGE = 2;

/** 업종·상태 조건에 맞는 이벤트인가 */
export function isEventApplicable(ev: GameEvent, sim: SimState): boolean {
  if (ev.appliesTo && !ev.appliesTo.includes(sim.businessType)) return false;
  if (ev.appliesToCustomer && sim.customerType && !ev.appliesToCustomer.includes(sim.customerType)) return false;
  return evalConds(sim, ev.applicableWhen);
}

export function eventScore(ev: GameEvent, sim: SimState, seed: number): number {
  const boost = (ev.boosts ?? []).reduce((sum, b) => sum + (evalConds(sim, b.when) ? b.add : 0), 0);
  const jitter = seededRandom(seed + hashString(ev.id)) * 0.5;
  return ev.weight + boost + jitter;
}

/**
 * 연차 시작 시 한 번 호출한다.
 * 1) 후보 5개를 훑어 부적절하면 대체 이벤트로 바꾼다.
 * 2) 전체 모드는 모두, 수업용 모드는 점수 상위 2개를 고른다.
 * 3) order 순으로 진행한다.
 */
export function planStageEvents(
  input: { sim: SimState; mode: GameMode; seed: number },
  stage: Stage,
): string[] {
  const resolved: GameEvent[] = [];
  for (const ev of stageCandidates(stage)) {
    if (isEventApplicable(ev, input.sim)) {
      resolved.push(ev);
    } else if (ev.fallbackId) {
      const fb = EVENT_MAP[ev.fallbackId];
      if (fb && !resolved.some((r) => r.id === fb.id)) resolved.push(fb);
    }
  }
  const chosen =
    input.mode === 'full'
      ? resolved
      : [...resolved]
          .sort((a, b) => eventScore(b, input.sim, input.seed) - eventScore(a, input.sim, input.seed))
          .slice(0, CLASS_MODE_EVENTS_PER_STAGE);
  return chosen.sort((a, b) => a.order - b.order).map((e) => e.id);
}

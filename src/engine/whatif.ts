// "다른 선택이었다면?" 비교. 원래 선택 직전 상태에서 같은 계산 함수로 이후 기간만 다시 흘린다.
// 시뮬레이션에는 난수가 없고(시장 경쟁은 상태에 이미 들어 있다) 외부 조건이 상태 안에 있으므로, 같은 상태에서 시작하면 조건이 같다.
// 원래 게임 객체와 기록은 읽기만 하며 바꾸지 않는다. 임의의 결과를 만들지 않고, 같은 선택을 다시 계산하면 기록과 같은 값이 나와야 한다.

import type { DecisionRecord, Game, StateMetrics } from './types';
import { getEvent } from './events';
import { evaluateOption } from './rules';
import { applyDirect, visibleOptions } from './game';
import { fillText } from './josa';
import { runPeriod, stateMetrics } from './trace';

export interface AltOption {
  id: string;
  label: string;
  available: boolean;
  reasons: string[];
  isOriginal: boolean;
}

export interface PeriodOutcome {
  label: string;
  oneTimeCost: number;
  directNetCash: number;
  fixedDelta: number;
  periodNetCash: number;
  end: StateMetrics;
  months: number;
  bankrupt: boolean; // 이 기간 안에 월말 현금이 0원 이하가 되어 파산했는가
}

export type WhatIfResult =
  | { ok: true; original: PeriodOutcome; alternative: PeriodOutcome; before: StateMetrics }
  | { ok: false; error: string };

function labelOf(game: Game, d: DecisionRecord, text: string): string {
  const s = d.trace?.beforeSim;
  if (!s) return text;
  // 라벨 안의 자리표시자가 남지 않게 기본 값만 채운다(회사 이름 등).
  return fillText(text, { company: game.setup.companyName, target: game.setup.targetCustomer, idea: game.setup.idea });
}

/** 비교할 수 있는 결정인가: 직전 전체 상태가 기록돼 있고 기간이 흐른 결정만 가능하다. */
export function canCompare(d: DecisionRecord): boolean {
  return !!d.trace && d.trace.period.months > 0;
}

/** 그 결정 시점에 고를 수 있었던 대안 목록(원래 선택 표시 포함) */
export function alternativesFor(game: Game, d: DecisionRecord): AltOption[] {
  if (!d.trace) return [];
  const ev = getEvent(d.eventId);
  const view = { setup: game.setup, sim: d.trace.beforeSim };
  return visibleOptions(view, ev.options).map((o) => {
    const chk = evaluateOption(d.trace!.beforeSim, o);
    return { id: o.id, label: labelOf(game, d, o.label), available: chk.available, reasons: chk.reasons, isOriginal: o.id === d.optionId };
  });
}

function run(game: Game, d: DecisionRecord, optionId: string): PeriodOutcome | string {
  const t = d.trace!;
  const ev = getEvent(d.eventId);
  const option = visibleOptions({ setup: game.setup, sim: t.beforeSim }, ev.options).find((o) => o.id === optionId);
  if (!option) return '그 시점에 고를 수 없던 대안입니다.';
  const chk = evaluateOption(t.beforeSim, option);
  if (!chk.available) return chk.reasons.join(' / ');
  const direct = applyDirect(t.beforeSim, option, ev.id);
  const period = runPeriod(direct.afterDirect, t.period.months);
  return {
    label: labelOf(game, d, option.label),
    oneTimeCost: direct.cost,
    directNetCash: direct.afterDirect.cash - t.beforeSim.cash,
    fixedDelta: stateMetrics(direct.afterDirect).fixedCost - stateMetrics(t.beforeSim).fixedCost,
    periodNetCash: period.netCash,
    end: stateMetrics(period.state),
    months: period.elapsed,
    bankrupt: period.bankrupt,
  };
}

/** 같은 시작 상태·같은 개월 수로 원래 선택과 다른 대안을 비교한다. */
export function compareAlternative(game: Game, decisionIndex: number, optionId: string): WhatIfResult {
  const d = game.decisions[decisionIndex];
  if (!d) return { ok: false, error: '결정 기록을 찾을 수 없습니다.' };
  if (!canCompare(d)) return { ok: false, error: '이전 기록에는 선택 직전 상태가 저장돼 있지 않아 같은 조건으로 다시 계산할 수 없습니다.' };
  const original = run(game, d, d.optionId);
  const alternative = run(game, d, optionId);
  if (typeof original === 'string') return { ok: false, error: original };
  if (typeof alternative === 'string') return { ok: false, error: alternative };
  return { ok: true, original, alternative, before: d.trace!.before };
}


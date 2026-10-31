// 검증 가능한 규칙 기반 계산. 모든 함수는 순수 함수이며 입력 상태를 바꾸지 않는다.
// 수치는 교육용 가정이다. 자세한 설명: docs/05-SIMULATION-RULES.md

import type {
  Cond,
  CondMetric,
  Effects,
  EventOption,
  MetricSnapshot,
  MonthRecord,
  Outcome,
  SimState,
} from './types';
import { formatMoney } from './format';

export const HIRE_SALARY = 400;
export const MKT_REF = 300;
export const INTEREST_RATE = 0.012;
export const BANKRUPT_CASH_FLOOR_RATIO = 0.5;
export const BANKRUPT_MONTHS = 2;
// 시장 압력(교육용 가정): 시간이 지날수록 경쟁이 심해져 이탈이 늘고 고객 획득이 어려워진다.
export const MARKET_CHURN_DRIFT = 0.0009;
export const MARKET_ACQ_DECAY = 0.008;

export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}
const r1 = (v: number) => Math.round(v * 10) / 10;

// ---------- 규모 배율 ----------
export const SCALE_BASE_CAPITAL = 5000;
export const MIN_CAPITAL = 100;
export function scaleOf(s: Pick<SimState, 'scale'>): number {
  return s.scale ?? 1;
}
export function scaleFor(capital: number): number {
  return clamp(capital / SCALE_BASE_CAPITAL, 0.02, 1);
}
/** 이벤트 데이터는 표준 규모(만원)로 쓰여 있다. 소액 창업이면 금액을 같은 비율로 줄인다. */
export function scaleMoney(s: Pick<SimState, 'scale'>, amount: number): number {
  const k = scaleOf(s);
  return k >= 1 ? amount : Math.round(amount * k);
}

// ---------- 파생 값 ----------
export function capacity(s: SimState): number {
  return Math.max(1, s.headcount * s.capPerHead);
}
export function utilization(s: SimState): number {
  return s.customers / capacity(s);
}
export function payroll(s: SimState): number {
  return Math.round(s.headcount * s.avgSalary);
}
export function monthlyInterest(s: SimState): number {
  return Math.round(s.debt * INTEREST_RATE);
}
/** 월 고정비(매출과 무관하게 나가는 비용) */
export function monthlyFixedCost(s: SimState): number {
  return payroll(s) + s.overhead + s.marketingBudget + monthlyInterest(s);
}
export function projectedMonthlyProfit(s: SimState): number {
  const revenue = Math.round(s.customers * s.arpu);
  const cogs = Math.round(revenue * s.cogsRatio);
  return revenue - cogs - payroll(s) - s.overhead - s.marketingBudget - monthlyInterest(s);
}
/** 남은 개월 수. 흑자면 null(무기한), 현금이 0 이하면 0 */
export function computeRunway(s: SimState): number | null {
  if (s.cash <= 0) return 0;
  const profit = projectedMonthlyProfit(s);
  if (profit >= 0) return null;
  return s.cash / -profit;
}

export function acquisitionRate(s: SimState): number {
  const u = utilization(s);
  const rep = 0.6 + (0.8 * s.reputation) / 100;
  const qual = 0.6 + (0.8 * s.quality) / 100;
  const cap = u <= 1 ? 1 : Math.max(0.2, 1 - (u - 1));
  const net = s.businessType === 'platform' ? 1 + Math.min(1.5, s.customers / 3000) : 1;
  return s.acqBase * (1 + s.marketingBudget / MKT_REF) * rep * qual * cap * net;
}

export function effectiveChurn(s: SimState): number {
  const u = utilization(s);
  return Math.min(0.6, s.churnRate * (1.5 - s.quality / 100) + 0.05 * Math.max(0, u - 1));
}

// ---------- 조건 ----------
export function metricValue(s: SimState, metric: CondMetric): number {
  switch (metric) {
    case 'utilization':
      return utilization(s);
    case 'runway': {
      const r = computeRunway(s);
      return r === null ? 999 : r;
    }
    case 'monthlyProfit':
      return projectedMonthlyProfit(s) / scaleOf(s);
    case 'cash':
    case 'monthlyRevenue':
    case 'customers':
    case 'debt':
    case 'marketingBudget':
      // 조건 기준값은 표준 규모로 쓰여 있으므로 소액 창업은 표준 규모로 환산해 비교한다.
      return s[metric] / scaleOf(s);
    default:
      return s[metric];
  }
}

export function evalCond(s: SimState, cond: Cond): boolean {
  if ('flag' in cond) return s.flags.includes(cond.flag) === cond.has;
  const v = metricValue(s, cond.metric);
  switch (cond.op) {
    case '>=':
      return v >= cond.value;
    case '<=':
      return v <= cond.value;
    case '>':
      return v > cond.value;
    case '<':
      return v < cond.value;
  }
}

export function evalConds(s: SimState, conds?: Cond[]): boolean {
  return !conds || conds.every((c) => evalCond(s, c));
}

// ---------- 스냅샷 ----------
export function snapshot(s: SimState): MetricSnapshot {
  return {
    month: s.month,
    cash: s.cash,
    monthlyRevenue: s.monthlyRevenue,
    customers: s.customers,
    quality: Math.round(s.quality),
    morale: Math.round(s.morale),
    reputation: Math.round(s.reputation),
    headcount: s.headcount,
  };
}

export function monthRecord(s: SimState): MonthRecord {
  return {
    month: s.month,
    cash: s.cash,
    revenue: s.monthlyRevenue,
    customers: s.customers,
    quality: Math.round(s.quality),
    morale: Math.round(s.morale),
    reputation: Math.round(s.reputation),
    headcount: s.headcount,
  };
}

// ---------- 월간 계산 ----------
export interface MonthResult {
  state: SimState;
  notes: string[];
  bankrupt: boolean;
  profit: number;
}

export function isBankrupt(s: SimState): boolean {
  return (
    s.insolvencyMonths >= BANKRUPT_MONTHS ||
    s.cash < -(s.initialCapital * BANKRUPT_CASH_FLOOR_RATIO)
  );
}

export function advanceMonth(s: SimState): MonthResult {
  const notes: string[] = [];
  const u = utilization(s);

  const acquired = Math.round(acquisitionRate(s));
  const churned = Math.round(s.customers * effectiveChurn(s));
  const customers = Math.max(0, s.customers + acquired - churned);

  const revenue = Math.round(((s.customers + customers) / 2) * s.arpu);
  const cogs = Math.round(revenue * s.cogsRatio);
  const costs = payroll(s) + s.overhead + s.marketingBudget + monthlyInterest(s) + cogs;
  const profit = revenue - costs;
  const cash = s.cash + profit;

  const overload = Math.max(0, u - 1);
  let quality = clamp(s.quality - 0.3 - Math.min(4, 3 * overload), 0, 100);
  let morale = clamp(
    s.morale +
      (60 - s.morale) * 0.03 +
      (profit > 0 ? 0.5 : 0) -
      (cash < 0 ? 2 : 0) -
      Math.min(5, 4 * overload),
    0,
    100,
  );
  const reputation = clamp(s.reputation + (quality - s.reputation) * 0.03, 0, 100);

  let headcount = s.headcount;
  if (morale < 20 && headcount > 1) {
    headcount -= 1;
    quality = clamp(quality - 3, 0, 100);
    morale = clamp(morale + 5, 0, 100);
    notes.push('사기가 바닥으로 떨어져 핵심 인력 1명이 팀을 떠났습니다.');
  }
  if (u > 1) {
    notes.push(`인력 부족: 고객 응대 가동률이 ${Math.round(u * 100)}%까지 올라 품질·사기가 떨어졌습니다.`);
  }
  if (cash < 0) {
    notes.push('현금이 마이너스입니다. 2개월 연속이면 파산합니다.');
  }

  const next: SimState = {
    ...s,
    month: s.month + 1,
    cash,
    monthlyRevenue: revenue,
    customers,
    quality: r1(quality),
    morale: r1(morale),
    reputation: r1(reputation),
    headcount,
    churnRate: clamp(s.churnRate + MARKET_CHURN_DRIFT * (s.pressure ?? 1), 0.01, 0.5),
    acqBase: Math.round(s.acqBase * (1 - MARKET_ACQ_DECAY * (s.pressure ?? 1)) * 100) / 100,
    insolvencyMonths: cash < 0 ? s.insolvencyMonths + 1 : 0,
  };
  const bankrupt = isBankrupt(next);
  if (bankrupt) {
    notes.push(
      next.cash < -(next.initialCapital * BANKRUPT_CASH_FLOOR_RATIO)
        ? '부채가 감당 범위를 넘어 채권자가 회사를 압류했습니다. (파산)'
        : '현금이 2개월 연속 마이너스여서 회사가 파산했습니다.',
    );
  }
  return { state: next, notes, bankrupt, profit };
}

// ---------- 결정 효과 ----------
export function applyEffects(s: SimState, e: Effects): SimState {
  let customers = s.customers;
  if (e.customersPct) customers = Math.round(customers * (1 + e.customersPct));
  if (e.customersAdd) customers += scaleMoney(s, e.customersAdd);
  customers = Math.max(0, Math.round(customers));

  let headcount = s.headcount;
  let avgSalary = s.avgSalary;
  if (e.headcount && e.headcount > 0) {
    avgSalary = (avgSalary * headcount + HIRE_SALARY * scaleOf(s) * e.headcount) / (headcount + e.headcount);
    headcount += e.headcount;
  } else if (e.headcount && e.headcount < 0) {
    headcount = Math.max(1, headcount + e.headcount);
  }

  const flags = e.flags ? Array.from(new Set([...s.flags, ...e.flags])) : s.flags;

  return {
    ...s,
    cash: s.cash + scaleMoney(s, e.cash ?? 0) + Math.round((e.cashMonths ?? 0) * monthlyFixedCost(s)),
    customers,
    quality: r1(clamp(s.quality + (e.quality ?? 0), 0, 100)),
    morale: r1(clamp(s.morale + (e.morale ?? 0), 0, 100)),
    reputation: r1(clamp(s.reputation + (e.reputation ?? 0), 0, 100)),
    headcount,
    avgSalary: Math.round(avgSalary * 10) / 10,
    marketingBudget: Math.max(0, s.marketingBudget + scaleMoney(s, e.marketingBudget ?? 0)),
    overhead: Math.max(0, s.overhead + scaleMoney(s, e.overhead ?? 0)),
    arpu: Math.round(s.arpu * (1 + (e.arpuPct ?? 0)) * 100) / 100,
    churnRate: clamp(s.churnRate + (e.churnRate ?? 0), 0.01, 0.5),
    acqBase: Math.round(s.acqBase * (1 + (e.acqBasePct ?? 0)) * 100) / 100,
    cogsRatio: clamp(s.cogsRatio + (e.cogsRatio ?? 0), 0, 0.95),
    capPerHead: Math.max(1, Math.round(s.capPerHead * (1 + (e.capPerHeadPct ?? 0)))),
    debt: Math.max(0, s.debt + scaleMoney(s, e.debt ?? 0)),
    dilution: clamp(s.dilution + (e.dilution ?? 0), 0, 90),
    flags,
    // 매출 표시는 다음 월 계산 전까지 현재 고객 수 기준으로 갱신
    monthlyRevenue: Math.round(customers * Math.round(s.arpu * (1 + (e.arpuPct ?? 0)) * 100) / 100),
  };
}

export function pickOutcome(s: SimState, option: EventOption): Outcome {
  const found = option.outcomes.find((o) => evalConds(s, o.when));
  // 데이터 검증 테스트가 마지막 outcome에 조건이 없음을 보장한다.
  return found ?? option.outcomes[option.outcomes.length - 1];
}

// ---------- 대안 사용 가능 여부 ----------
export function evaluateOption(
  s: SimState,
  option: EventOption,
): { available: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const cost = scaleMoney(s, option.cost ?? 0);
  if (cost > 0 && cost > s.cash) {
    reasons.push(`현금 부족 (필요 ${formatMoney(cost)}, 보유 ${formatMoney(s.cash)})`);
  }
  if (option.minHeadcount && s.headcount < option.minHeadcount) {
    reasons.push(`인력 ${option.minHeadcount}명 이상 필요 (현재 ${s.headcount}명)`);
  }
  if (!evalConds(s, option.requires)) {
    reasons.push(option.requiresText ?? '선행 조건을 충족하지 못했습니다');
  }
  return { available: reasons.length === 0, reasons };
}

/** 이벤트 사이에 흐르는 개월 수. 합이 항상 12가 된다. */
export function monthsAllocation(eventCount: number): number[] {
  const n = Math.max(1, eventCount);
  const base = Math.floor(12 / n);
  const rem = 12 - base * n;
  return Array.from({ length: n }, (_, i) => {
    const extra = Math.floor(((i + 1) * rem) / n) - Math.floor((i * rem) / n);
    return base + extra;
  });
}

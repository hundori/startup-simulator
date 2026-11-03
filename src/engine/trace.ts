// 선택 하나를 "직전 → 직후 → 기간 종료"로 나눠 기록하기 위한 계산 도우미.
// 모두 순수 함수이며, 값은 엔진 계산 함수(rules.ts)의 결과를 그대로 옮긴 것이다. 보고서에서 역산하지 않는다.

import type {
  Cond,
  CondMetric,
  DecisionRules,
  DecisionTrace,
  EventOption,
  MonthCash,
  RuleCheck,
  SimState,
  StateMetrics,
} from './types';
import { formatMoney } from './format';
import { withJosa } from './josa';
import {
  acquisitionRate,
  advanceMonth,
  computeRunway,
  effectiveChurn,
  evalCond,
  evalConds,
  metricValue,
  monthlyFixedCost,
  projectedMonthlyProfit,
  scaleOf,
  snapshot,
} from './rules';

/** 한 시점의 지표(화면 지표 + 월 고정비·월 이익·런웨이·신규 고객·이탈률) */
export function stateMetrics(s: SimState): StateMetrics {
  return {
    ...snapshot(s),
    fixedCost: monthlyFixedCost(s),
    monthlyProfit: projectedMonthlyProfit(s),
    runway: computeRunway(s),
    debt: s.debt,
    dilution: s.dilution,
    newCustomers: Math.round(acquisitionRate(s)),
    churnRate: effectiveChurn(s),
  };
}

export interface PeriodRun {
  state: SimState;
  monthly: MonthCash[];
  totals: Omit<MonthCash, 'month'>;
  netCash: number;
  notes: string[];
  elapsed: number;
  bankrupt: boolean;
  records: SimState[]; // 매달 끝의 상태(기록용)
}

/** 선택 직후 상태에서 months개월을 흘린다. 선택 시점의 일회성 비용은 여기에 들어가지 않는다. */
export function runPeriod(start: SimState, months: number): PeriodRun {
  let sim = start;
  const monthly: MonthCash[] = [];
  const totals = { revenue: 0, cogs: 0, payroll: 0, overhead: 0, marketing: 0, interest: 0, net: 0 };
  const notes: string[] = [];
  const records: SimState[] = [];
  let bankrupt = false;
  let elapsed = 0;
  for (let i = 0; i < months; i++) {
    const r = advanceMonth(sim);
    sim = r.state;
    const row: MonthCash = { month: sim.month, ...r.parts, net: r.profit };
    monthly.push(row);
    for (const k of Object.keys(totals) as (keyof typeof totals)[]) totals[k] += row[k];
    records.push(sim);
    elapsed += 1;
    for (const n of r.notes) if (!notes.includes(n)) notes.push(n);
    if (r.bankrupt) {
      bankrupt = true;
      break;
    }
  }
  return { state: sim, monthly, totals, netCash: totals.net, notes, elapsed, bankrupt, records };
}

// ---------- 판정 규칙을 사람이 읽는 문장으로 ----------

type MetricFmt = { label: string; fmt: (v: number) => string };
const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const num = (v: number) => Math.round(v).toLocaleString('ko-KR');
const FIN_LABEL = ['현금 위기', '적자', '흑자'];

const METRICS: Record<CondMetric, MetricFmt> = {
  cash: { label: '현금', fmt: (v) => formatMoney(v) },
  finStatus: { label: '재무 상태', fmt: (v) => FIN_LABEL[Math.max(0, Math.min(2, Math.round(v)))] },
  cashTrend3: { label: '최근 현금 증감', fmt: (v) => `${v >= 0 ? '+' : '−'}${formatMoney(Math.abs(v))}` },
  salaryCutMonths: { label: '급여 삭감 기간', fmt: (v) => `${num(v)}개월` },
  monthlyRevenue: { label: '월 매출', fmt: (v) => formatMoney(v) },
  customers: { label: '고객 수', fmt: (v) => `${num(v)}명` },
  quality: { label: '제품 품질', fmt: (v) => `${num(v)}점` },
  morale: { label: '팀 사기', fmt: (v) => `${num(v)}점` },
  reputation: { label: '평판', fmt: (v) => `${num(v)}점` },
  headcount: { label: '인원', fmt: (v) => `${num(v)}명` },
  utilization: { label: '인력 가동률', fmt: (v) => pct(v) },
  runway: { label: '런웨이', fmt: (v) => (v >= 999 ? '흑자 구조' : `${v.toFixed(1)}개월`) },
  debt: { label: '부채', fmt: (v) => formatMoney(v) },
  dilution: { label: '지분 희석', fmt: (v) => `${num(v)}%` },
  marketingBudget: { label: '월 마케팅비', fmt: (v) => formatMoney(v) },
  monthlyProfit: { label: '월 이익', fmt: (v) => `${v >= 0 ? '' : '−'}${formatMoney(Math.abs(v))}` },
  aiShare: { label: 'AI 자동화 가능 비율', fmt: (v) => pct(v) },
  aiLevel: { label: 'AI 도입 정도', fmt: (v) => pct(v) },
  growth6: { label: '최근 매출 성장률', fmt: (v) => pct(v) },
  churnRate: { label: '월 이탈률', fmt: (v) => pct(v, 1) },
  grossMargin: { label: '매출총이익률', fmt: (v) => pct(v) },
  share: { label: '시장 점유', fmt: (v) => pct(v, 1) },
  month: { label: '진행 개월', fmt: (v) => `${num(v)}개월` },
};

const OP_TEXT = { '>=': '이상', '<=': '이하', '>': '초과', '<': '미만' } as const;

/** 조건 하나를 문장으로 풀고, 결정 당시의 실제 값을 함께 돌려준다. */
export function describeCond(s: SimState, c: Cond): RuleCheck {
  if ('flag' in c) {
    return {
      text: c.has ? '이전에 관련 선택을 한 기록이 있음' : '이전에 관련 선택을 한 기록이 없음',
      actual: s.flags.includes(c.flag) ? '기록 있음' : '기록 없음',
      met: evalCond(s, c),
    };
  }
  const m = METRICS[c.metric];
  // finStatus는 0·1·2 값이라 "적자 이상" 같은 읽기 어려운 문장이 되므로 상태 이름으로 푼다.
  if (c.metric === 'finStatus') {
    const actual = m.fmt(metricValue(s, 'finStatus'));
    const need =
      c.op === '>=' ? `${FIN_LABEL[c.value]} 이상(위기 < 적자 < 흑자 순)` : c.op === '<=' ? `${FIN_LABEL[c.value]} 이하(위기 < 적자 < 흑자 순)` : `${m.label} ${OP_TEXT[c.op]} ${m.fmt(c.value)}`;
    return { text: `${m.label} ${need}`, actual: `당시 ${actual}`, met: evalCond(s, c) };
  }
  return {
    text: `${m.label} ${m.fmt(c.value)} ${OP_TEXT[c.op]}`,
    actual: `당시 ${m.fmt(metricValue(s, c.metric))}`,
    met: evalCond(s, c),
  };
}

/** 이 대안의 모든 결과가 같은 판정이면 회사 상태와 관계없이 고정된 등급이다. */
export function hasFixedGrade(option: EventOption): boolean {
  return new Set(option.outcomes.map((o) => o.verdict)).size === 1;
}

/**
 * 결과가 어떤 규칙으로 정해졌는지 기록한다. pickOutcome과 같은 순서(앞에서부터 처음 맞는 결과, 없으면 마지막)를 따른다.
 * 기본 결과가 적용됐다면 앞선 결과마다 충족하지 못한 첫 조건을 실제 값과 함께 남긴다(최대 3개).
 */
export function describeRules(s: SimState, option: EventOption): DecisionRules {
  const idx = option.outcomes.findIndex((o) => evalConds(s, o.when));
  const outcomeIndex = idx >= 0 ? idx : option.outcomes.length - 1;
  const chosen = option.outcomes[outcomeIndex];
  const isDefault = !chosen.when || chosen.when.length === 0;
  let checks: RuleCheck[] = [];
  if (!isDefault) {
    checks = (chosen.when ?? []).map((c) => describeCond(s, c));
  } else {
    for (let i = 0; i < outcomeIndex && checks.length < 3; i++) {
      const failed = (option.outcomes[i].when ?? []).map((c) => describeCond(s, c)).find((r) => !r.met);
      if (failed) checks.push(failed);
    }
  }
  return {
    outcomeIndex,
    outcomeCount: option.outcomes.length,
    isDefault,
    fixedGrade: hasFixedGrade(option),
    checks,
    scaled: scaleOf(s) < 1,
  };
}

/** 규칙 기록을 학생이 읽는 한두 문장으로 옮긴다. 판정이 고정이면 상황 분석처럼 쓰지 않는다. */
export function explainRules(r: DecisionRules): string {
  if (r.fixedGrade) {
    return '이 대안은 회사 상태와 관계없이 항상 같은 결과·판정이 정해져 있습니다. 상황을 분석해 내린 평가가 아니라 교육용으로 미리 정한 값입니다.';
  }
  const list = r.checks.map((c) => `${c.text}(${c.actual})`).join(', ');
  const scale = r.scaled ? ' 소액 창업은 표준 규모(5,000만원)로 환산해 비교했습니다.' : '';
  if (!r.isDefault) return `당시 회사 상태가 다음 조건을 충족해 이 결과가 적용됐습니다: ${list}.${scale}`;
  if (r.checks.length === 0) return '더 좋은 결과로 이어지는 조건이 없는 대안이어서 기본 결과가 적용됐습니다.';
  return `더 나은 결과에 필요한 조건을 충족하지 못해 기본 결과가 적용됐습니다. 충족하지 못한 조건: ${list}.${scale}`;
}

/** 현금 관계 검산: 선택 직전 + 선택 직접 + 이후 운영 = 기간 종료 */
export function cashBridge(t: DecisionTrace): { start: number; direct: number; period: number; end: number; matches: boolean } {
  const start = t.before.cash;
  const direct = t.direct.netCash;
  const period = t.period.netCash;
  const end = t.afterPeriod.cash;
  return { start, direct, period, end, matches: start + direct + period === end };
}

/**
 * 변화량과 "유의미한 변화 판정 기준"을 분리해 쓴다. 허용 오차는 증가·감소 사실을 지우는 용도가 아니라,
 * 시스템이 위험·개선으로 판정하는 최소 폭을 알려 주는 용도다.
 */
export function describeChange(
  label: string,
  before: number,
  after: number,
  opts: { format: (v: number) => string; tolerance?: number },
): string {
  const d = after - before;
  const fmt = opts.format;
  if (d === 0) return `${withJosa(label, '은/는')} ${fmt(before)}로 같았습니다.`;
  const base = `${withJosa(label, '이/가')} ${fmt(Math.abs(d))} ${d > 0 ? '늘었습니다' : '줄었습니다'}(${fmt(before)} → ${fmt(after)}).`;
  if (opts.tolerance !== undefined && Math.abs(d) <= opts.tolerance) {
    return `${base} 다만 시스템의 유의미한 변화 판정 기준(${fmt(opts.tolerance)}) 이내입니다.`;
  }
  return base;
}

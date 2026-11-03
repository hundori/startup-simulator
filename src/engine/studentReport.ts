// 학생용 요약 보고서(A 최종 결과 · B 핵심 결정 · C 다시 고민할 결정 · D 토론 질문).
// 규칙 기반이며 같은 게임이면 항상 같은 보고서가 나온다. 숫자는 결정 기록(DecisionRecord.trace)에 엔진이 저장한 값만 쓴다.
// 기록에 없는 값(옛 저장본의 직접 효과 등)은 만들어 채우지 않고 "기록 없음"으로 둔다.

import type { DecisionRecord, Game, StateMetrics, Verdict } from './types';
import { formatMoney, monthToLabel } from './format';
import { withJosa } from './josa';
import { explainRules } from './trace';
import { projectedMonthlyProfit, normalSalaryProfit, isSalaryCut } from './rules';
import { scoreGame } from './scoring';

export const LEGACY_NOTICE = '이전 기록에는 선택 직후 수치가 없어, 아래 변화에는 이후 운영 결과가 포함되어 있습니다.';
export const HEDGE_NOTICE = '이후 기간의 변화에는 시장 경쟁·이미 늘어난 고정비 등 다른 요인도 섞여 있어, 이 선택만의 효과라고 단정할 수 없습니다.';

// ---------- 표기 도우미 ----------
export const sgMoney = (v: number): string => (v === 0 ? '0만원' : `${v > 0 ? '+' : '−'}${formatMoney(Math.abs(v))}`);
export const sgNum = (v: number, unit: string): string => (v === 0 ? `0${unit}` : `${v > 0 ? '+' : '−'}${Math.abs(Math.round(v)).toLocaleString('ko-KR')}${unit}`);
export const money = (v: number): string => formatMoney(v).replace('-', '−');
export const when = (m: number): string => (m === 0 ? '창업 직후' : monthToLabel(m).replace(/ 시점$/, ''));
export const FIN_WORD = { crunch: '현금 위기', deficit: '적자', surplus: '흑자' } as const;

export function runwayWord(r: number | null): string {
  if (r === null) return '흑자 구조';
  if (r >= 60) return '5년 이상';
  return r < 1 ? '1개월 미만' : `약 ${r.toFixed(1)}개월`;
}

export function finOf(d: DecisionRecord): 'crunch' | 'deficit' | 'surplus' | null {
  if (d.finStatusBefore) return d.finStatusBefore;
  const t = d.trace?.before;
  if (!t) return null;
  if (t.cash <= 0) return 'crunch';
  if (t.monthlyProfit >= 0) return 'surplus';
  return t.cash / -t.monthlyProfit < 4 ? 'crunch' : 'deficit';
}

// ---------- A. 최종 결과 ----------
export interface KeyFigure {
  label: string;
  value: string;
  sub?: string;
}

export interface FinalResult {
  sentence: string;
  figures: KeyFigure[];
  score: { total: number; grade: string; parts: { label: string; value: number }[] };
}

export function finalResult(game: Game): FinalResult {
  const { sim, history, setup } = game;
  const bankrupt = game.status === 'bankrupt';
  const start = history[0];
  const profit = projectedMonthlyProfit(sim);
  const normal = normalSalaryProfit(sim);
  const sc = scoreGame(game);

  let lowest = history[0];
  for (const h of history) if (h.cash < lowest.cash) lowest = h;
  const negMonths = history.filter((h) => h.month > 0 && h.cash < 0).length;

  const head = bankrupt
    ? `${when(sim.month)}에 월말 현금이 0원 이하가 되어 파산했습니다. ${profit >= 0 ? '마지막 시점 계산으로는 월 이익이 났지만 현금을 지키지 못했습니다.' : '마지막 시점에도 월 손실이 이어지고 있었습니다.'}`
    : `3년을 버텼고, ${profit >= 0 ? '마지막 시점 기준으로 월 이익을 냈습니다.' : '마지막 시점 기준으로는 월 손실이 이어지고 있습니다.'}`;
  const dips: string[] = [];
  if (bankrupt) {
    /* 파산한 게임은 현금 0원 이하가 곧 종료 사유이므로 별도 설명을 붙이지 않는다 */
  } else if (negMonths > 0) dips.push(`중간에 현금이 마이너스였던 달이 ${negMonths}개월 있었습니다.`);
  else if (lowest.month > 0 && lowest.month < sim.month && lowest.cash < start.cash * 0.3 && lowest.cash < sim.cash)
    dips.push(`${when(lowest.month)}에는 현금이 ${money(lowest.cash)}까지 줄었습니다.`);
  if (profit >= 0 && normal < 0 && isSalaryCut(sim)) dips.push('급여를 삭감한 상태라 정상 급여로 계산하면 월 손실입니다.');
  const sentence = dips.length ? `${head} 다만 ${dips.join(' ')}` : head;

  const figures: KeyFigure[] = [
    { label: '생존 여부', value: bankrupt ? '파산' : '생존', sub: bankrupt ? `${sim.month}개월 만에 종료` : `${sim.month}개월(3년) 진행` },
    { label: '남은 현금', value: money(sim.cash), sub: sim.debt > 0 ? `부채 ${money(sim.debt)}` : `시작 ${money(start.cash)}` },
    {
      label: profit >= 0 ? '월 이익' : '월 손실',
      value: `${profit >= 0 ? '+' : '−'}${formatMoney(Math.abs(profit))}`,
      sub: '마지막 시점 기준(매출−원가·고정비)',
    },
    { label: '고객 수', value: `${Math.round(sim.customers).toLocaleString('ko-KR')}명`, sub: `시작 ${Math.round(start.customers).toLocaleString('ko-KR')}명` },
  ];
  void setup;
  return {
    sentence,
    figures,
    score: {
      total: sc.total,
      grade: sc.grade,
      parts: [
        { label: '재무', value: sc.parts.finance },
        { label: '성장', value: sc.parts.growth },
        { label: '제품 품질', value: sc.parts.quality },
        { label: '팀', value: sc.parts.team },
        { label: '평판', value: sc.parts.reputation },
      ],
    },
  };
}

// ---------- 결정 카드 ----------
export type EvidenceTier = 'direct' | 'period';

export interface MetricRow {
  label: string;
  before: string;
  afterDirect: string | null; // 선택 직후(옛 기록은 null)
  afterPeriod: string;
  note?: string;
}

export interface EffectRow {
  label: string;
  direct: string; // 선택 직후 변화(선택이 직접 바꾼 값)
  time: string | null; // 시간이 흐르며 생긴 변화(시장 요인 제외). 옛 기록은 null
  market: string | null; // 시장 경쟁 압력 요인. 옛 기록은 null
  total: string;
}

export interface EffectSplit {
  rows: EffectRow[];
  months: number;
  note: string;
}

export interface DecisionCard {
  index: number; // game.decisions 인덱스
  anchor: string;
  kind: string; // 카드 제목(선정 이유가 드러나는 제목)
  tier: EvidenceTier | 'legacy';
  whenLabel: string;
  eventTitle: string;
  situation: string; // 당시 상황 한 줄(재무 상태·현금·런웨이)
  chosen: string;
  directLines: string[]; // 선택이 직접 바꾼 것
  periodLines: string[]; // 이후 기간에 나타난 결과
  gained: string[];
  paid: string[];
  rows: MetricRow[]; // 직전·직후·기간 종료 비교(주요 지표 3개)
  gradeNote: string; // 판정 문구 + 이유
  notices: string[];
  months: number;
  scenario: string; // 시나리오 서술(교육용 설명). 계산으로 검증된 원인이 아니다
  effects: EffectSplit | null; // 선택 직후 / 시간 경과 / 시장 요인으로 나눈 변화
}

type Cat = 'cash-relief' | 'customer' | 'customer-period' | 'quality' | 'quality-period' | 'recurring-cost';

const VERDICT_WORD: Record<Verdict, string> = { strong: '좋음', ok: '보통', weak: '아쉬움' };

/** 판정 문구. 상황 조건으로 정해진 경우에만 이유를 붙이고, 고정 판정은 분석 결과처럼 쓰지 않는다. */
export function gradeNote(d: DecisionRecord): string {
  const r = d.trace?.rules;
  if (!r) return `판정: ${VERDICT_WORD[d.verdict]}. 이전 기록이라 판정에 쓰인 규칙·당시 조건이 저장돼 있지 않습니다.`;
  if (r.fixedGrade) return `${explainRules(r)} (사전 설정 값: ${VERDICT_WORD[d.verdict]})`;
  return `상황 적합성 판정: ${VERDICT_WORD[d.verdict]}. ${explainRules(r)}`;
}

function situationLine(d: DecisionRecord): string {
  const b = d.trace?.before;
  const fin = finOf(d);
  if (!b || !fin) return `현금 ${money(d.before.cash)} · 고객 ${Math.round(d.before.customers).toLocaleString('ko-KR')}명`;
  const profit = b.monthlyProfit >= 0 ? `월 이익 +${formatMoney(b.monthlyProfit)}` : `월 손실 ${formatMoney(-b.monthlyProfit)}`;
  return `${FIN_WORD[fin]} · ${profit} · 현금 ${money(b.cash)} · 런웨이 ${runwayWord(b.runway)}`;
}

interface Delta {
  cash: number;
  customers: number;
  quality: number;
  morale: number;
  reputation: number;
  headcount: number;
  fixed: number;
  profit: number;
  debt: number;
  dilution: number;
}
const diff = (a: StateMetrics, b: StateMetrics): Delta => ({
  cash: b.cash - a.cash,
  customers: b.customers - a.customers,
  quality: b.quality - a.quality,
  morale: b.morale - a.morale,
  reputation: b.reputation - a.reputation,
  headcount: b.headcount - a.headcount,
  fixed: b.fixedCost - a.fixedCost,
  profit: b.monthlyProfit - a.monthlyProfit,
  debt: b.debt - a.debt,
  dilution: b.dilution - a.dilution,
});

interface Fact {
  text: string;
  good: boolean;
  mag: number; // 0~ 비교용 크기
  tier: EvidenceTier;
}

/** 직접 효과·기간 변화를 "얻은 것/치른 대가" 후보 문장으로 만든다. 기록된 변화만 쓴다. */
function factsOf(d: DecisionRecord): Fact[] {
  const t = d.trace;
  const out: Fact[] = [];
  if (t) {
    const dir = diff(t.before, t.afterDirect);
    const per = diff(t.afterDirect, t.afterPeriod);
    const fb = Math.max(1, t.before.fixedCost);
    if (t.direct.oneTimeCost > 0) out.push({ text: `일회성 지출 ${formatMoney(t.direct.oneTimeCost)}(선택 즉시 한 번)`, good: false, mag: t.direct.oneTimeCost / (fb * 12), tier: 'direct' });
    if (t.direct.inflow > 0) out.push({ text: `자금 유입 ${formatMoney(t.direct.inflow)}`, good: true, mag: t.direct.inflow / (fb * 12), tier: 'direct' });
    if (dir.fixed !== 0) out.push({ text: `월 고정비 ${sgMoney(dir.fixed)}(매달 반복)`, good: dir.fixed < 0, mag: Math.abs(dir.fixed) / fb, tier: 'direct' });
    if (dir.customers !== 0) out.push({ text: `고객 ${sgNum(dir.customers, '명')}(선택 직후)`, good: dir.customers > 0, mag: Math.abs(dir.customers) / Math.max(10, t.before.customers), tier: 'direct' });
    (['quality', 'morale', 'reputation'] as const).forEach((k) => {
      if (dir[k] !== 0) out.push({ text: `${{ quality: '품질', morale: '팀 사기', reputation: '평판' }[k]} ${sgNum(dir[k], '점')}(선택 직후)`, good: dir[k] > 0, mag: Math.abs(dir[k]) / 20, tier: 'direct' });
    });
    if (dir.dilution > 0) out.push({ text: `지분 희석 +${Math.round(dir.dilution)}%p(창업팀 몫이 줄어듦)`, good: false, mag: dir.dilution / 15, tier: 'direct' });
    if (dir.debt > 0) out.push({ text: `부채 +${formatMoney(dir.debt)}(매달 이자가 월 고정비에 더해짐)`, good: false, mag: dir.debt / (fb * 12), tier: 'direct' });
    if (dir.headcount !== 0) out.push({ text: `인원 ${sgNum(dir.headcount, '명')}`, good: dir.headcount > 0, mag: Math.abs(dir.headcount) / Math.max(2, t.before.headcount), tier: 'direct' });
    if (per.customers !== 0) out.push({ text: `이후 고객 ${sgNum(per.customers, '명')}`, good: per.customers > 0, mag: (Math.abs(per.customers) / Math.max(10, t.afterDirect.customers)) * 0.7, tier: 'period' });
    if (per.profit !== 0) out.push({ text: `이후 월 이익 ${sgMoney(per.profit)}`, good: per.profit > 0, mag: (Math.abs(per.profit) / fb) * 0.7, tier: 'period' });
    (['quality', 'reputation'] as const).forEach((k) => {
      if (Math.abs(per[k]) >= 2) out.push({ text: `이후 ${k === 'quality' ? '품질' : '평판'} ${sgNum(per[k], '점')}`, good: per[k] > 0, mag: (Math.abs(per[k]) / 20) * 0.7, tier: 'period' });
    });
  } else {
    const c = d.afterPeriod.cash - d.before.cash;
    const cu = d.afterPeriod.customers - d.before.customers;
    const q = d.afterPeriod.quality - d.before.quality;
    if (cu !== 0) out.push({ text: `고객 ${sgNum(cu, '명')}(기간 전체)`, good: cu > 0, mag: Math.abs(cu) / Math.max(10, d.before.customers), tier: 'period' });
    if (c !== 0) out.push({ text: `현금 ${sgMoney(c)}(기간 전체, 선택 비용과 운영 결과가 합쳐진 값)`, good: c > 0, mag: Math.abs(c) / Math.max(1000, Math.abs(d.before.cash)), tier: 'period' });
    if (q !== 0) out.push({ text: `품질 ${sgNum(q, '점')}(기간 전체)`, good: q > 0, mag: Math.abs(q) / 20, tier: 'period' });
  }
  return out;
}

function pickRows(d: DecisionRecord, kind: Cat | 'other'): MetricRow[] {
  const t = d.trace;
  const n = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}명`;
  const p = (v: number) => `${Math.round(v)}점`;
  if (!t) {
    const rows: MetricRow[] = [{ label: '현금', before: money(d.before.cash), afterDirect: null, afterPeriod: money(d.afterPeriod.cash), note: '선택 비용과 운영 결과가 합쳐진 값' }];
    rows.push({ label: '고객 수', before: n(d.before.customers), afterDirect: null, afterPeriod: n(d.afterPeriod.customers) });
    rows.push({ label: '제품 품질', before: p(d.before.quality), afterDirect: null, afterPeriod: p(d.afterPeriod.quality) });
    return rows;
  }
  const row = (label: string, f: (m: StateMetrics) => string): MetricRow => ({ label, before: f(t.before), afterDirect: f(t.afterDirect), afterPeriod: f(t.afterPeriod) });
  const cash = row('현금', (m) => money(m.cash));
  const fixed = row('월 고정비', (m) => money(m.fixedCost));
  const profit = row('월 이익', (m) => `${m.monthlyProfit >= 0 ? '+' : '−'}${formatMoney(Math.abs(m.monthlyProfit))}`);
  const cust = row('고객 수', (m) => n(m.customers));
  const qual = row('품질·평판', (m) => `${Math.round(m.quality)}·${Math.round(m.reputation)}점`);
  if (kind === 'recurring-cost' || (kind === 'cash-relief' && t.direct.fixedDelta !== 0)) return [cash, fixed, profit];
  if (kind === 'customer' || kind === 'customer-period') return [cash, cust, profit];
  if (kind === 'quality' || kind === 'quality-period') return [cash, qual, profit];
  return [cash, profit, cust];
}

function effectSplit(d: DecisionRecord): EffectSplit | null {
  const t = d.trace;
  if (!t || t.period.months === 0) return null;
  const m = t.period.market;
  const cust = (v: number) => sgNum(v, '명');
  const row = (label: string, dir: number, per: number, mk: number | undefined, f: (v: number) => string): EffectRow => ({
    label,
    direct: f(dir),
    time: mk === undefined ? null : f(per - mk),
    market: mk === undefined ? null : f(mk),
    total: f(dir + per),
  });
  const rows = [
    row('고객 수', t.afterDirect.customers - t.before.customers, t.afterPeriod.customers - t.afterDirect.customers, m?.customers, cust),
    row('현금', t.afterDirect.cash - t.before.cash, t.afterPeriod.cash - t.afterDirect.cash, m?.cash, sgMoney),
  ];
  return {
    rows,
    months: t.period.months,
    note: m
      ? '“시장 요인”은 같은 기간을 시장 경쟁 압력(이탈 증가·신규 유입 감소 가정)이 없다고 보고 다시 계산한 값과의 차이입니다. “시간 경과”는 나머지(고객 응대 여력, 품질 변화, 이미 늘어난 고정비 등)이며, 선택만의 효과가 아닙니다. 선택과 시장이 서로 영향을 주므로 이 구분은 계산상 구분이지 인과관계가 검증된 것은 아닙니다.'
      : '이전 기록이라 시간 경과와 시장 요인을 나눌 수 없습니다. 이후 변화에는 시장 경쟁 등 다른 요인이 섞여 있습니다.',
  };
}

export function buildCard(game: Game, index: number, kind: Cat | 'other', title: string, tier: EvidenceTier | 'legacy'): DecisionCard {
  const d = game.decisions[index];
  const t = d.trace;
  const allFacts = factsOf(d);
  // 얻은 것·치른 대가는 선택이 직접 바꾼 값만 쓴다(이후 기간 변화는 선택만의 효과로 단정할 수 없다).
  const facts = t ? allFacts.filter((f) => f.tier === 'direct') : allFacts;
  const good = facts.filter((f) => f.good).sort((a, b) => b.mag - a.mag).slice(0, 2).map((f) => f.text);
  const bad = facts.filter((f) => !f.good).sort((a, b) => b.mag - a.mag).slice(0, 2).map((f) => f.text);

  const directLines: string[] = [];
  if (t) {
    directLines.push(`일회성 지출 ${t.direct.oneTimeCost > 0 ? formatMoney(t.direct.oneTimeCost) : '없음'}${t.direct.inflow > 0 ? `, 자금 유입 ${formatMoney(t.direct.inflow)}` : ''} → 선택 직후 현금 ${money(t.afterDirect.cash)}`);
    directLines.push(t.direct.fixedDelta === 0 ? '월 고정비 변화 없음' : `월 고정비 ${sgMoney(t.direct.fixedDelta)}(${t.direct.fixedDelta > 0 ? '매달 늘어난 비용' : '매달 줄어든 비용'})`);
  }
  const periodLines: string[] = [];
  const months = t ? t.period.months : d.monthsElapsed;
  if (t && months > 0) {
    periodLines.push(`이후 ${months}개월 영업 현금흐름 ${sgMoney(t.period.netCash)}(매출−원가−인건비−운영비−마케팅−이자)`);
  }
  const notices: string[] = [];
  if (!t) notices.push(LEGACY_NOTICE);
  else if (t.period.months > 0) notices.push(HEDGE_NOTICE);

  return {
    index,
    anchor: `decision-${index}`,
    kind: title,
    tier,
    whenLabel: when(d.month),
    eventTitle: d.eventTitle,
    situation: situationLine(d),
    chosen: d.optionLabel,
    directLines,
    periodLines,
    gained: good,
    paid: bad,
    rows: pickRows(d, kind),
    gradeNote: gradeNote(d),
    notices,
    months,
    scenario: d.outcomeText,
    effects: effectSplit(d),
  };
}

export function reconsiderQuestion(d: DecisionRecord): string {
  const t = d.trace;
  if (t && t.direct.fixedDelta > 0)
    return `${withJosa(`‘${d.optionLabel}’`, '으로/로')} 매달 늘어난 비용 ${withJosa(formatMoney(t.direct.fixedDelta), '을/를')} 이후 매출이 따라잡았나요? 같은 효과를 한 번만 쓰는 비용으로 얻을 방법은 없었을까요?`;
  if (t && t.direct.oneTimeCost > 0)
    return `‘${d.optionLabel}’에 쓴 ${formatMoney(t.direct.oneTimeCost)}만큼의 효과가 실제로 나타났나요? 같은 돈으로 다른 대안을 골랐다면 무엇이 달라졌을까요?`;
  return `${withJosa(`‘${d.optionLabel}’`, '을/를')} 고를 때 우리가 가장 중요하게 본 근거는 무엇이었고, 그 근거는 이후 숫자와 맞았나요?`;
}

// ---------- 보고서 전체 ----------
export interface YearRow {
  year: number;
  endMonth: number;
  cash: number;
  revenue: number;
  customers: number;
  headcount: number;
  decisionIndexes: number[];
  /** 전년(또는 시작)보다 고객이 줄었을 때만: 기록된 신규 유입·이탈 수치로 이유를 설명한다 */
  customerNote: string | null;
}

export function yearRows(game: Game): YearRow[] {
  const rows: YearRow[] = [];
  const last = game.history[game.history.length - 1];
  let prevCustomers = game.history[0].customers;
  for (const year of [1, 2, 3]) {
    const end = Math.min(year * 12, last.month);
    const h = [...game.history].reverse().find((r) => r.month <= end);
    if (!h || (year > 1 && end <= (rows[rows.length - 1]?.endMonth ?? 0))) continue;
    const idxs = game.decisions.map((d, i) => ({ d, i })).filter(({ d }) => d.month > (year - 1) * 12 && d.month <= year * 12).map(({ i }) => i);
    let customerNote: string | null = null;
    if (h.customers < prevCustomers) {
      const withTrace = idxs.map((i) => game.decisions[i].trace).filter((t): t is NonNullable<typeof t> => !!t && t.period.months > 0);
      const t = withTrace[withTrace.length - 1];
      const head = `고객이 ${Math.round(prevCustomers).toLocaleString('ko-KR')}명에서 ${Math.round(h.customers).toLocaleString('ko-KR')}명으로 줄었습니다.`;
      if (t) {
        const lost = Math.round(t.afterPeriod.customers * t.afterPeriod.churnRate);
        customerNote = `${head} 이 해의 마지막 결정 기간이 끝난 시점 기록으로는 한 달에 새로 오는 고객이 약 ${t.afterPeriod.newCustomers}명, 떠나는 고객이 약 ${lost}명(월 이탈률 ${(t.afterPeriod.churnRate * 100).toFixed(1)}%)입니다. 떠나는 고객이 더 많으면 고객이 줄어듭니다. 이 시뮬레이션은 시간이 갈수록 경쟁 때문에 이탈이 늘고 신규 유입이 줄도록 설정돼 있어, 품질·평판·마케팅·인력(고객 응대 여력)으로 막지 못하면 고객이 줄 수 있습니다.`;
      } else {
        customerNote = `${head} 이전 기록이라 신규 유입·이탈 수치가 저장돼 있지 않아 이유를 나눠 보여 줄 수 없습니다.`;
      }
    }
    rows.push({ year, endMonth: h.month, cash: h.cash, revenue: h.revenue, customers: h.customers, headcount: h.headcount, decisionIndexes: idxs, customerNote });
    prevCustomers = h.customers;
  }
  return rows;
}

// ---------- D. 토론 질문 ----------
export function brief(d: DecisionRecord): string {
  const t = d.trace;
  if (!t) return `기간 전체로 현금 ${sgMoney(d.afterPeriod.cash - d.before.cash)}, 고객 ${sgNum(d.afterPeriod.customers - d.before.customers, '명')}`;
  const parts: string[] = [];
  if (t.direct.fixedDelta !== 0) parts.push(`월 고정비 ${sgMoney(t.direct.fixedDelta)}`);
  if (t.direct.oneTimeCost > 0) parts.push(`일회성 ${formatMoney(t.direct.oneTimeCost)}`);
  if (t.direct.inflow > 0) parts.push(`자금 유입 ${formatMoney(t.direct.inflow)}`);
  if (parts.length === 0) parts.push(`직후 현금 변화 ${sgMoney(t.direct.netCash)}`);
  return parts.join(', ');
}

export function afterBrief(d: DecisionRecord): string {
  const t = d.trace;
  if (!t) return `고객 ${Math.round(d.before.customers)}명에서 ${Math.round(d.afterPeriod.customers)}명`;
  return `현금 ${money(t.afterDirect.cash)}에서 ${money(t.afterPeriod.cash)}, 고객 ${Math.round(t.afterDirect.customers)}명에서 ${Math.round(t.afterPeriod.customers)}명`;
}

// ---------- 결정 직후 피드백(기간 결과는 아직 발생하지 않았다) ----------
export interface FeedbackView {
  chosen: string;
  eventTitle: string;
  numbers: { label: string; before: string; after: string; note?: string }[]; // 즉시 달라진 수치 2~3개
  why: string;
  gained: string[];
  paid: string[];
  watch: string; // 다음에 확인할 지표 한 개
  months: number;
}

/** 선택 직후(직접 효과만)의 짧은 피드백. 이후 기간의 결과·서술은 넣지 않는다. */
export function feedbackView(game: Game): FeedbackView | null {
  const p = game.pending;
  if (!p) return null;
  const d = p.draft;
  const b = p.traceBase.before;
  const a = p.traceBase.afterDirect;
  const dir = p.traceBase.direct;
  const n = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}명`;
  const pts = (v: number) => `${Math.round(v)}점`;
  const cand: { label: string; before: string; after: string; note?: string; mag: number }[] = [];
  if (dir.netCash !== 0) cand.push({ label: '현금', before: money(b.cash), after: money(a.cash), note: dir.oneTimeCost > 0 ? `일회성 지출 ${formatMoney(dir.oneTimeCost)}${dir.inflow > 0 ? `, 자금 유입 ${formatMoney(dir.inflow)}` : ''}` : `자금 유입 ${formatMoney(dir.inflow)}`, mag: 2 });
  if (dir.fixedDelta !== 0) cand.push({ label: '월 고정비(매달)', before: money(b.fixedCost), after: money(a.fixedCost), note: `${sgMoney(dir.fixedDelta)}씩 매달 ${dir.fixedDelta > 0 ? '더 나감' : '덜 나감'}`, mag: 3 });
  if (a.customers !== b.customers) cand.push({ label: '고객 수', before: n(b.customers), after: n(a.customers), mag: Math.abs(a.customers - b.customers) / Math.max(10, b.customers) });
  if (a.newCustomers !== b.newCustomers) cand.push({ label: '월 신규 고객(예상)', before: n(b.newCustomers), after: n(a.newCustomers), mag: Math.abs(a.newCustomers - b.newCustomers) / Math.max(5, b.newCustomers) });
  (['quality', 'morale', 'reputation'] as const).forEach((k) => {
    if (a[k] !== b[k]) cand.push({ label: { quality: '제품 품질', morale: '팀 사기', reputation: '평판' }[k], before: pts(b[k]), after: pts(a[k]), mag: Math.abs(a[k] - b[k]) / 20 });
  });
  if (a.headcount !== b.headcount) cand.push({ label: '인원', before: n(b.headcount), after: n(a.headcount), mag: Math.abs(a.headcount - b.headcount) / Math.max(2, b.headcount) });
  const numbers = cand.sort((x, y) => y.mag - x.mag).slice(0, 3).map(({ mag: _m, ...r }) => (void _m, r));
  if (numbers.length === 0) numbers.push({ label: '현금', before: money(b.cash), after: money(a.cash), note: '직접 바뀐 지표가 없습니다' });

  const pseudo: DecisionRecord = { ...d, trace: { ...p.traceBase, afterPeriod: a, period: { months: 0, monthly: [], totals: { revenue: 0, cogs: 0, payroll: 0, overhead: 0, marketing: 0, interest: 0, net: 0 }, netCash: 0 } } };
  const facts = factsOf(pseudo).filter((f) => f.tier === 'direct');
  const gained = facts.filter((f) => f.good).sort((x, y) => y.mag - x.mag).slice(0, 2).map((f) => f.text);
  const paid = facts.filter((f) => !f.good).sort((x, y) => y.mag - x.mag).slice(0, 2).map((f) => f.text);

  let watch = '현금 — 선택 직후 수치가 이후 운영에서 어떻게 바뀌는지 가장 먼저 확인하세요.';
  if (dir.fixedDelta > 0) watch = '월 이익 — 매달 늘어난 고정비를 이후 매출이 따라잡는지 확인하세요.';
  else if (dir.fixedDelta < 0) watch = '고객 수 — 비용을 줄인 대가가 고객·사기에서 나타나는지 확인하세요.';
  else if (a.newCustomers !== b.newCustomers || a.customers !== b.customers) watch = '고객 수 — 직후 변화가 이후에도 이어지는지 확인하세요.';
  else if (a.quality !== b.quality || a.reputation !== b.reputation) watch = '고객 수와 이탈률 — 품질·평판 변화가 고객에게 이어지는지 확인하세요.';
  else if (dir.inflow > 0) watch = '월 이익 — 들어온 자금이 이익 개선으로 이어지는지 확인하세요.';

  return {
    chosen: d.optionLabel,
    eventTitle: d.eventTitle,
    numbers,
    why: explainRules(p.traceBase.rules),
    gained,
    paid,
    watch,
    months: p.months,
  };
}

/** 결정 하나를 카드로 만든다(결과 화면·전체 결정 기록용). 제목은 선정 이유가 아닌 이벤트 이름이다. */
export function cardForDecision(game: Game, index: number): DecisionCard {
  const d = game.decisions[index];
  return buildCard(game, index, 'other', d.eventTitle, d.trace ? 'direct' : 'legacy');
}

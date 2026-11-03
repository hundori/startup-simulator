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
const sgMoney = (v: number): string => (v === 0 ? '0만원' : `${v > 0 ? '+' : '−'}${formatMoney(Math.abs(v))}`);
const sgNum = (v: number, unit: string): string => (v === 0 ? `0${unit}` : `${v > 0 ? '+' : '−'}${Math.abs(Math.round(v)).toLocaleString('ko-KR')}${unit}`);
const money = (v: number): string => formatMoney(v).replace('-', '−');
const when = (m: number): string => (m === 0 ? '창업 직후' : monthToLabel(m).replace(/ 시점$/, ''));
const FIN_WORD = { crunch: '현금 위기', deficit: '적자', surplus: '흑자' } as const;

function runwayWord(r: number | null): string {
  if (r === null) return '흑자 구조';
  if (r >= 60) return '5년 이상';
  return r < 1 ? '1개월 미만' : `약 ${r.toFixed(1)}개월`;
}

function finOf(d: DecisionRecord): 'crunch' | 'deficit' | 'surplus' | null {
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
    ? `${when(sim.month)}에 파산했습니다. ${profit >= 0 ? '마지막 시점 계산으로는 월 이익이 났지만 현금을 지키지 못했습니다.' : '마지막 시점에도 월 손실이 이어지고 있었습니다.'}`
    : `3년을 버텼고, ${profit >= 0 ? '마지막 시점 기준으로 월 이익을 냈습니다.' : '마지막 시점 기준으로는 월 손실이 이어지고 있습니다.'}`;
  const dips: string[] = [];
  if (negMonths > 0) dips.push(`중간에 현금이 마이너스였던 달이 ${negMonths}개월 있었습니다.`);
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
}

type Cat = 'cash-relief' | 'customer' | 'customer-period' | 'quality' | 'quality-period' | 'recurring-cost';
const CAT_TITLE: Record<Cat, string> = {
  'cash-relief': '현금 부담을 줄인 결정',
  customer: '고객 확보에 도움이 된 결정',
  'customer-period': '이후 고객이 늘어난 시기의 결정',
  quality: '품질과 신뢰를 높인 결정',
  'quality-period': '이후 품질·평판이 올라간 시기의 결정',
  'recurring-cost': '반복 비용을 늘린 결정',
};

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

function buildCard(game: Game, index: number, kind: Cat | 'other', title: string, tier: EvidenceTier | 'legacy'): DecisionCard {
  const d = game.decisions[index];
  const t = d.trace;
  const facts = factsOf(d);
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
    periodLines.push(d.outcomeText);
  } else if (!t) {
    periodLines.push(d.outcomeText);
  }
  const notices: string[] = [];
  if (!t) notices.push(LEGACY_NOTICE);
  else if (good.length + bad.length > 0 && facts.some((f) => f.tier === 'period')) notices.push(HEDGE_NOTICE);

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
  };
}

// ---------- C. 다시 고민할 결정 ----------
export interface Reconsider {
  card: DecisionCard;
  reasons: string[];
  question: string;
  forced: boolean; // 뚜렷한 후보가 없어 "대가를 논의할 만한 결정"을 골랐는가
}

interface RcCand {
  index: number;
  reasons: string[];
  score: number;
}

function reconsiderCandidates(game: Game): RcCand[] {
  const out: RcCand[] = [];
  game.decisions.forEach((d, index) => {
    const t = d.trace;
    const reasons: string[] = [];
    let score = 0;
    let severity = 0;
    if (t) {
      const fb = Math.max(1, t.before.fixedCost);
      const fin = finOf(d);
      // (a) 현금 여유가 부족한데 반복 비용을 늘렸는가
      const tight = t.before.cash <= 0 || (t.before.runway !== null && t.before.runway < 9);
      if (fin && tight && t.direct.fixedDelta >= Math.max(1, fb * 0.03)) {
        reasons.push(`현금 여유가 얇은 때(${FIN_WORD[fin]}, 런웨이 ${runwayWord(t.before.runway)} — 기준: 9개월 미만)에 월 고정비를 ${sgMoney(t.direct.fixedDelta)} 늘렸습니다.`);
        score += 1;
        severity += t.direct.fixedDelta / fb;
      }
      // (b) 직접 효과와 이후 결과가 반대 방향이었는가(선택 직후 개선 → 이후 악화)
      const dir = diff(t.before, t.afterDirect);
      const per = diff(t.afterDirect, t.afterPeriod);
      const gaps: { text: string; size: number }[] = [];
      if (dir.customers >= 2 && per.customers <= -Math.max(2, t.afterDirect.customers * 0.05))
        gaps.push({ text: `선택 직후 고객이 ${sgNum(dir.customers, '명')} 늘었지만, 이후 ${t.period.months}개월 동안 ${sgNum(per.customers, '명')} 줄었습니다.`, size: -per.customers / Math.max(10, t.afterDirect.customers) });
      if (dir.profit > 0 && per.profit <= -Math.max(1, fb * 0.05))
        gaps.push({ text: `선택 직후 월 이익이 ${sgMoney(dir.profit)} 좋아졌지만, 이후 ${t.period.months}개월 동안 ${sgMoney(per.profit)} 나빠졌습니다.`, size: -per.profit / fb });
      if (dir.quality + dir.reputation >= 3 && per.quality + per.reputation <= -4)
        gaps.push({ text: `선택 직후 품질·평판이 ${sgNum(dir.quality + dir.reputation, '점')}(합) 올랐지만, 이후 ${sgNum(per.quality + per.reputation, '점')}(합) 내려갔습니다.`, size: -(per.quality + per.reputation) / 20 });
      if (gaps.length) {
        const g = gaps.sort((x, y) => y.size - x.size)[0];
        reasons.push(g.text);
        score += 1;
        severity += g.size;
      }
      // (c) 중요한 대가나 위험이 발생했는가
      const risk: string[] = [];
      if (t.afterPeriod.cash < 0) risk.push(`이후 기간 끝에 현금이 ${money(t.afterPeriod.cash)}로 마이너스였습니다`);
      if (t.afterPeriod.headcount < t.afterDirect.headcount) risk.push(`인원이 ${t.afterDirect.headcount}명에서 ${t.afterPeriod.headcount}명으로 줄었습니다`);
      if (per.morale <= -8) risk.push(`팀 사기가 ${sgNum(per.morale, '점')} 떨어졌습니다`);
      if (d.notes.length > 0 && risk.length === 0) risk.push(`운영 알림이 있었습니다(${d.notes[0].replace(/\.$/, '')})`);
      if (risk.length) {
        reasons.push(`이후 ${t.period.months}개월 동안 ${risk.slice(0, 2).join(', ')}.`);
        score += 1;
        severity += 0.5;
      }
    } else {
      // 옛 기록: 기간 종료 스냅샷에서 확인되는 대가만 본다
      const risk: string[] = [];
      if (d.afterPeriod.cash < 0) risk.push(`기간 끝에 현금이 ${money(d.afterPeriod.cash)}로 마이너스였습니다`);
      if (d.afterPeriod.headcount < d.afterImmediate.headcount) risk.push('기간 중 인원이 줄었습니다');
      if (d.afterPeriod.morale - d.afterImmediate.morale <= -8) risk.push('기간 중 팀 사기가 크게 떨어졌습니다');
      if (risk.length) {
        reasons.push(`${risk.slice(0, 2).join(', ')}.`);
        score += 1;
        severity += 0.5;
      }
    }
    if (reasons.length) out.push({ index, reasons, score: score + Math.min(0.99, severity / 10) });
  });
  return out.sort((a, b) => b.score - a.score || a.index - b.index);
}

function reconsiderQuestion(d: DecisionRecord): string {
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
}

export interface StudentReport {
  result: FinalResult;
  key: DecisionCard[];
  keyEmptyNote: string | null;
  reconsider: Reconsider | null;
  reconsiderEmptyNote: string | null;
  questions: string[];
  years: YearRow[];
  legacyCount: number;
  totalDecisions: number;
}

interface KeyCand {
  index: number;
  cat: Cat;
  tier: EvidenceTier;
  score: number;
}

function keyCandidates(game: Game): KeyCand[] {
  const out: KeyCand[] = [];
  game.decisions.forEach((d, index) => {
    const t = d.trace;
    if (!t) {
      // 옛 기록: 기간 전체 변화만 알 수 있으므로 시기 표현의 제목만 쓴다
      const dc = d.afterPeriod.customers - d.before.customers;
      if (dc >= Math.max(3, d.before.customers * 0.1)) out.push({ index, cat: 'customer-period', tier: 'period', score: (dc / Math.max(10, d.before.customers)) * 0.6 });
      const dq = d.afterPeriod.quality - d.before.quality + (d.afterPeriod.reputation - d.before.reputation);
      if (dq >= 3) out.push({ index, cat: 'quality-period', tier: 'period', score: (dq / 40) * 0.6 });
      return;
    }
    const fb = Math.max(1, t.before.fixedCost);
    const dir = diff(t.before, t.afterDirect);
    const per = diff(t.afterDirect, t.afterPeriod);
    const thr = Math.max(1, fb * 0.03);
    if (dir.fixed <= -thr) out.push({ index, cat: 'cash-relief', tier: 'direct', score: -dir.fixed / fb });
    else if (t.direct.netCash >= Math.max(1, Math.abs(t.before.cash) * 0.25) && t.direct.inflow > 0) out.push({ index, cat: 'cash-relief', tier: 'direct', score: t.direct.netCash / (fb * 12) });
    if (dir.fixed >= thr) out.push({ index, cat: 'recurring-cost', tier: 'direct', score: dir.fixed / fb });
    const newDelta = t.afterDirect.newCustomers - t.before.newCustomers;
    if (dir.customers >= Math.max(2, t.before.customers * 0.05) || newDelta >= Math.max(1, t.before.newCustomers * 0.1)) {
      out.push({ index, cat: 'customer', tier: 'direct', score: Math.max(dir.customers / Math.max(10, t.before.customers), newDelta / Math.max(5, t.before.newCustomers)) });
    } else if (per.customers >= Math.max(3, t.afterDirect.customers * 0.1)) {
      out.push({ index, cat: 'customer-period', tier: 'period', score: (per.customers / Math.max(10, t.afterDirect.customers)) * 0.6 });
    }
    if (dir.quality + dir.reputation >= 4) out.push({ index, cat: 'quality', tier: 'direct', score: (dir.quality + dir.reputation) / 40 });
    else if (per.quality + per.reputation >= 3) out.push({ index, cat: 'quality-period', tier: 'period', score: ((per.quality + per.reputation) / 40) * 0.6 });
  });
  return out.sort((a, b) => b.score - a.score || a.index - b.index);
}

/** 한 결정을 한 번만 쓰고, 같은 제목을 되도록 피해 최대 3개를 고른다. 시간 순으로 돌려준다. */
function selectKey(cands: KeyCand[], excluded: Set<number>): KeyCand[] {
  const chosen: KeyCand[] = [];
  const usedIdx = new Set<number>(excluded);
  const usedCat = new Set<Cat>();
  for (const c of cands) {
    if (chosen.length >= 3) break;
    if (usedIdx.has(c.index) || usedCat.has(c.cat)) continue;
    chosen.push(c);
    usedIdx.add(c.index);
    usedCat.add(c.cat);
  }
  return chosen.sort((a, b) => a.index - b.index);
}

function yearRows(game: Game): YearRow[] {
  const rows: YearRow[] = [];
  const last = game.history[game.history.length - 1];
  for (const year of [1, 2, 3]) {
    const end = Math.min(year * 12, last.month);
    const h = [...game.history].reverse().find((r) => r.month <= end);
    if (!h || (year > 1 && end <= (rows[rows.length - 1]?.endMonth ?? 0))) continue;
    rows.push({
      year,
      endMonth: h.month,
      cash: h.cash,
      revenue: h.revenue,
      customers: h.customers,
      headcount: h.headcount,
      decisionIndexes: game.decisions.map((d, i) => ({ d, i })).filter(({ d }) => d.month > (year - 1) * 12 && d.month <= year * 12).map(({ i }) => i),
    });
  }
  return rows;
}

export function buildStudentReport(game: Game): StudentReport {
  const result = finalResult(game);
  const decisions = game.decisions;

  // C를 먼저 고르고, B는 C와 같은 결정을 쓰지 않는다(같은 결정이 두 번 설명되지 않게).
  const rc = reconsiderCandidates(game);
  let reconsider: Reconsider | null = null;
  let reconsiderEmptyNote: string | null = null;
  if (rc.length > 0) {
    const top = rc[0];
    const d = decisions[top.index];
    reconsider = { card: buildCard(game, top.index, 'other', '다시 검토해 볼 결정', d.trace ? 'direct' : 'legacy'), reasons: top.reasons, question: reconsiderQuestion(d), forced: false };
  } else if (decisions.length > 0) {
    // 뚜렷한 후보가 없으면 '잘못된 결정'을 만들지 않고, 대가를 가장 크게 치른 선택을 논의 대상으로 둔다.
    const ranked = decisions
      .map((d, index) => ({ d, index, price: (d.trace ? d.trace.direct.oneTimeCost + Math.max(0, d.trace.direct.fixedDelta) * d.trace.period.months : d.cost) / Math.max(1, Math.abs(d.before.cash)) }))
      .filter((x) => x.price > 0)
      .sort((a, b) => b.price - a.price || a.index - b.index);
    if (ranked.length) {
      const x = ranked[0];
      const t = x.d.trace;
      const price = t
        ? `일회성 지출 ${t.direct.oneTimeCost > 0 ? formatMoney(t.direct.oneTimeCost) : '없음'}, 월 고정비 ${sgMoney(t.direct.fixedDelta)}`
        : `일회성 비용 ${x.d.cost > 0 ? formatMoney(x.d.cost) : '없음'}`;
      reconsider = {
        card: buildCard(game, x.index, 'other', '대가를 논의해 볼 결정', t ? 'direct' : 'legacy'),
        reasons: [`뚜렷하게 다시 검토를 권할 신호는 없었습니다. 다만 우리가 가장 큰 대가를 치른 선택이라 효과와 비교해 볼 만합니다(${price}).`],
        question: reconsiderQuestion(x.d),
        forced: true,
      };
    } else {
      reconsiderEmptyNote = '이번 기록에서는 다시 검토를 권할 신호도, 눈에 띄는 대가를 치른 선택도 없었습니다.';
    }
  }

  const cands = keyCandidates(game);
  const exclude = new Set<number>(reconsider ? [reconsider.card.index] : []);
  const picked = selectKey(cands, exclude);
  const key = picked.map((c) => buildCard(game, c.index, c.cat, CAT_TITLE[c.cat], c.tier));
  const keyEmptyNote = key.length === 0 ? '결과를 바꾼 결정으로 분류할 만큼 뚜렷한 변화가 기록되지 않았습니다. 아래 전체 결정 기록에서 각 선택을 확인해 보세요.' : null;

  const used = [...key.map((k) => k.index), ...(reconsider ? [reconsider.card.index] : [])];
  const questions = buildQuestions(game, key, reconsider, used);

  return {
    result,
    key,
    keyEmptyNote,
    reconsider,
    reconsiderEmptyNote,
    questions,
    years: yearRows(game),
    legacyCount: decisions.filter((d) => !d.trace).length,
    totalDecisions: decisions.length,
  };
}

// ---------- D. 토론 질문 ----------
function brief(d: DecisionRecord): string {
  const t = d.trace;
  if (!t) return `기간 전체로 현금 ${sgMoney(d.afterPeriod.cash - d.before.cash)}, 고객 ${sgNum(d.afterPeriod.customers - d.before.customers, '명')}`;
  const parts: string[] = [];
  if (t.direct.fixedDelta !== 0) parts.push(`월 고정비 ${sgMoney(t.direct.fixedDelta)}`);
  if (t.direct.oneTimeCost > 0) parts.push(`일회성 ${formatMoney(t.direct.oneTimeCost)}`);
  if (t.direct.inflow > 0) parts.push(`자금 유입 ${formatMoney(t.direct.inflow)}`);
  if (parts.length === 0) parts.push(`직후 현금 변화 ${sgMoney(t.direct.netCash)}`);
  return parts.join(', ');
}

function afterBrief(d: DecisionRecord): string {
  const t = d.trace;
  if (!t) return `고객 ${Math.round(d.before.customers)}명에서 ${Math.round(d.afterPeriod.customers)}명`;
  return `현금 ${money(t.afterDirect.cash)}에서 ${money(t.afterPeriod.cash)}, 고객 ${Math.round(t.afterDirect.customers)}명에서 ${Math.round(t.afterPeriod.customers)}명`;
}

function buildQuestions(game: Game, key: DecisionCard[], rc: Reconsider | null, used: number[]): string[] {
  const ds = game.decisions;
  const idxs = Array.from(new Set(used));
  const qs: string[] = [];
  if (idxs.length >= 2) {
    // 서로 다른 두 결정의 효과와 대가를 비교한다
    const a = ds[idxs[0]];
    const b = ds[idxs[1]];
    qs.push(
      `${when(a.month)} ${withJosa(`‘${a.optionLabel}’(${brief(a)})`, '과/와')} ${when(b.month)} ‘${b.optionLabel}’(${brief(b)}) 중, 회사의 현금 여유에 더 크게 영향을 준 것은 무엇이었나요? 둘 중 하나만 다시 고를 수 있다면 어느 쪽을 바꾸겠습니까?`,
    );
  }
  const focusIdx = rc ? rc.card.index : idxs[0];
  if (focusIdx !== undefined) {
    const d = ds[focusIdx];
    qs.push(
      `${when(d.month)} ${withJosa(`‘${d.optionLabel}’`, '을/를')} 고른 직후에는 ${withJosa(brief(d), '이/가')} 반영됐고, 이후 ${d.monthsElapsed}개월 동안 ${withJosa(afterBrief(d), "으로/로")} 바뀌었습니다. 이 변화 가운데 이 선택 때문인 부분과 시간이 흐르며 생긴 부분은 무엇인가요?`,
    );
  }
  if (qs.length < 2 && ds.length > 0) {
    const d = ds[ds.length - 1];
    qs.push(`마지막 결정 ‘${d.optionLabel}’ 이후 현금이 ${money(d.before.cash)}에서 ${withJosa(money(d.afterPeriod.cash), '이/가')} 되었습니다. 이 결정 대신 다른 대안을 골랐다면 어떤 숫자가 가장 달라졌을까요?`);
  }
  return qs.slice(0, 2);
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

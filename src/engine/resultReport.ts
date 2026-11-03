// 학생용 결과보고서(최종 결과 → 파산 원인 → 결정적 의사결정 2개 → 다시 선택할 대안 → 토론 질문).
// 규칙 기반이며 같은 게임이면 항상 같은 보고서가 나온다. 숫자는 결정 기록(trace)과 엔진 재계산에서만 가져온다.
// 원인은 "기록된 숫자의 구성"으로 보여 주고, 검증되지 않은 인과관계는 단정하지 않는다.

import type { DecisionRecord, Game } from './types';
import { BANKRUPTCY_RULE } from './rules';
import { formatMoney } from './format';
import { withJosa } from './josa';
import {
  type DecisionCard,
  type FinalResult,
  type YearRow,
  brief,
  buildCard,
  finalResult,
  money,
  reconsiderQuestion,
  sgMoney,
  when,
  yearRows,
} from './studentReport';
import { alternativesFor, canCompare, compareAlternative, type PeriodOutcome } from './whatif';

// ---------- 파산 원인 / 위험 시기 ----------
export interface CashPart {
  label: string;
  value: string;
}

export interface CauseSection {
  title: string; // 파산 원인 | 가장 위험했던 시기
  sentence: string;
  rule: string[]; // 파산 판정 규칙(유예 여부 포함)
  facts: string[]; // 기록된 숫자의 구성
  parts: CashPart[]; // 시작 현금 → 선택 직접 변화 합 → 영업 현금흐름 합 → 최종 현금
  bridgeOk: boolean | null; // 합계 검산(옛 기록은 null)
  caution: string;
  legacyRule: boolean; // 이전 규칙으로 끝난 기록인가
}

function firstNonPositive(game: Game): { month: number; cash: number } | null {
  const h = game.history.find((r) => r.month > 0 && r.cash <= 0);
  return h ? { month: h.month, cash: h.cash } : null;
}

function buildCause(game: Game): CauseSection {
  const bankrupt = game.status === 'bankrupt';
  const traced = game.decisions.length > 0 && game.decisions.every((d) => d.trace);
  const start = game.history[0].cash;
  const rule = [BANKRUPTCY_RULE.when, BANKRUPTCY_RULE.threshold, BANKRUPTCY_RULE.grace, BANKRUPTCY_RULE.notBefore, BANKRUPTCY_RULE.earlyWarning];

  let direct = 0;
  let operating = 0;
  const tot = { revenue: 0, cogs: 0, payroll: 0, overhead: 0, marketing: 0, interest: 0 };
  let oneTime = 0;
  let inflow = 0;
  if (traced) {
    for (const d of game.decisions) {
      const t = d.trace!;
      direct += t.direct.netCash;
      operating += t.period.netCash;
      oneTime += t.direct.oneTimeCost;
      inflow += t.direct.inflow;
      for (const k of Object.keys(tot) as (keyof typeof tot)[]) tot[k] += t.period.totals[k];
    }
  }
  const bridgeOk = traced ? start + direct + operating === game.sim.cash : null;
  const parts: CashPart[] = traced
    ? [
        { label: '시작 현금', value: money(start) },
        { label: '선택으로 직접 바뀐 현금 합계(일회성 지출 −, 자금 유입 +)', value: sgMoney(direct) },
        { label: '운영 기간의 영업 현금흐름 합계(매출−원가−인건비−운영비−마케팅−이자)', value: sgMoney(operating) },
        { label: bankrupt ? '파산 시점 현금' : '종료 시점 현금', value: money(game.sim.cash) },
      ]
    : [];
  const costTotal = tot.cogs + tot.payroll + tot.overhead + tot.marketing + tot.interest;
  const facts: string[] = [];
  if (traced) {
    facts.push(`운영 기간 동안 매출 합계 ${formatMoney(tot.revenue)}, 비용 합계 ${formatMoney(costTotal)}(인건비 ${formatMoney(tot.payroll)}, 운영비 ${formatMoney(tot.overhead)}, 마케팅 ${formatMoney(tot.marketing)}, 원가 ${formatMoney(tot.cogs)}, 이자 ${formatMoney(tot.interest)})입니다.`);
    if (oneTime > 0 || inflow > 0) facts.push(`선택으로 쓴 일회성 지출 합계 ${formatMoney(oneTime)}, 들어온 자금 합계 ${formatMoney(inflow)}입니다.`);
    const parts2 = [['인건비', tot.payroll], ['마케팅', tot.marketing], ['운영비', tot.overhead], ['원가', tot.cogs]] as const;
    const biggest = [...parts2].sort((a, b) => b[1] - a[1])[0];
    if (tot.revenue > 0) facts.push(`비용 중 가장 큰 항목은 ${biggest[0]} ${withJosa(formatMoney(biggest[1]), '으로/로')} 매출의 ${Math.round((biggest[1] / tot.revenue) * 100)}%였습니다.`);
  }

  if (bankrupt) {
    const b = game.bankruptcy;
    const first = firstNonPositive(game);
    const last = game.decisions[game.decisions.length - 1];
    const legacyRule = !b;
    let sentence: string;
    if (b) {
      sentence = `${when(b.month)} 말 현금이 ${money(b.cash)}으로 처음 0원 이하가 되어 그 달에 파산했습니다. 직전 달 말 현금은 ${money(b.cashBefore)}, 그 달의 영업 현금흐름은 ${sgMoney(b.monthlyNet)}이었습니다.`;
      facts.unshift(`파산은 ‘${game.decisions[b.decisionIndex]?.optionLabel ?? last?.optionLabel ?? ''}’을 고른 뒤 흐른 기간 안에서 판정됐습니다. 이 선택이 파산의 원인이라는 뜻은 아니며, 같은 기간에 나타난 사실입니다.`);
    } else {
      sentence = first
        ? `${when(first.month)} 말 현금이 ${money(first.cash)}으로 처음 0원 이하가 되었고, 이후 파산으로 끝났습니다. 이 기록은 이전 규칙(2개월 연속 마이너스 등)으로 진행돼, 실제 파산 판정은 그보다 늦은 ${when(game.sim.month)}에 이뤄졌습니다.`
        : `${when(game.sim.month)}에 파산했습니다. 이전 규칙으로 진행된 기록이라 월별 판정 값은 저장돼 있지 않습니다.`;
    }
    return {
      title: '파산 원인',
      sentence,
      rule,
      facts,
      parts,
      bridgeOk,
      caution: '위 숫자는 기록된 구성이며, 한 가지 항목이 파산의 원인이라고 단정할 수는 없습니다. 아래 “결정적 의사결정”과 “다시 선택할 대안”에서 선택별로 비교해 보세요.',
      legacyRule,
    };
  }

  let low = game.history[0];
  for (const h of game.history) if (h.cash < low.cash) low = h;
  const sentence =
    low.month === 0
      ? `현금이 가장 적었던 때는 시작 시점(${money(low.cash)})이고, 이후 파산 기준인 월말 현금 0원 이하로 내려간 적은 없습니다.`
      : `현금이 가장 적었던 때는 ${when(low.month)} 말 ${money(low.cash)}으로, 시작 현금의 ${Math.round((low.cash / Math.max(1, start)) * 100)}% 수준이었습니다. 월말 현금이 0원 이하가 된 적은 없어 파산하지 않았습니다.`;
  return {
    title: '가장 위험했던 시기',
    sentence,
    rule,
    facts,
    parts,
    bridgeOk,
    caution: '위 숫자는 기록된 구성이며, 한 가지 항목이 결과의 원인이라고 단정할 수는 없습니다.',
    legacyRule: false,
  };
}

// ---------- 결정적 의사결정 2개 ----------
export interface DecisiveCard {
  card: DecisionCard;
  why: string; // 선정 이유(기록된 숫자)
}

function decisiveTitle(d: DecisionRecord): string {
  const t = d.trace;
  if (!t) return '현금을 쓴 결정';
  const fixed = t.direct.fixedDelta;
  const cash = t.direct.netCash;
  if (fixed > 0 && cash < 0) return '일회성 지출과 반복 비용을 함께 늘린 결정';
  if (fixed > 0) return '반복 비용을 늘린 결정';
  if (cash < 0 && fixed >= 0) return '현금을 크게 쓴 결정';
  if (cash > 0 && fixed <= 0) return '현금을 확보한 결정';
  if (fixed < 0) return '반복 비용을 줄인 결정';
  return '현금 구조를 바꾼 결정';
}

function buildDecisive(game: Game): DecisiveCard[] {
  const endMonth = game.sim.month;
  const bankrupt = game.status === 'bankrupt';
  const scored = game.decisions.map((d, index) => {
    const t = d.trace;
    const monthsLeft = Math.max(0, endMonth - d.month);
    const impact = t ? Math.abs(t.direct.netCash) + Math.abs(t.direct.fixedDelta) * monthsLeft : d.cost;
    // 파산한 게임에서는 현금을 쓰거나 반복 비용을 늘린 결정을 먼저 본다(자금을 들여온 결정은 부족하면 채운다).
    const drain = t ? t.direct.netCash < 0 || t.direct.fixedDelta > 0 : d.cost > 0;
    return { d, index, impact, drain };
  });
  const rank = (xs: typeof scored) => [...xs].filter((x) => x.impact > 0).sort((a, b) => b.impact - a.impact || a.index - b.index);
  let picked = bankrupt ? rank(scored.filter((x) => x.drain)).slice(0, 2) : rank(scored).slice(0, 2);
  if (picked.length < 2) {
    const rest = rank(scored.filter((x) => !picked.includes(x))).slice(0, 2 - picked.length);
    picked = [...picked, ...rest];
  }
  const top = picked.sort((a, b) => a.index - b.index);
  return top.map(({ d, index }) => {
    const t = d.trace;
    const left = Math.max(0, endMonth - d.month);
    let why: string;
    if (!t) why = `이전 기록이라 직접 효과는 없고, 일회성 비용 ${formatMoney(d.cost)} 기준으로 골랐습니다.`;
    else {
      const bits = [`선택 직후 현금 ${sgMoney(t.direct.netCash)}`];
      if (t.direct.fixedDelta !== 0) bits.push(`월 고정비 ${sgMoney(t.direct.fixedDelta)}(같은 비용이 ${left}개월 유지될 경우 ${formatMoney(Math.abs(t.direct.fixedDelta) * left)})`);
      why = `${bits.join(', ')}. ${bankrupt ? '파산한 게임이라 현금을 쓰거나 반복 비용을 늘린 결정 중' : '전체 결정 중'} 이 값이 큰 두 개를 골랐습니다. 이 결정이 결과의 원인이라는 뜻은 아닙니다.`;
    }
    return { card: { ...buildCard(game, index, 'other', decisiveTitle(d), t ? 'direct' : 'legacy') }, why };
  });
}

// ---------- 다시 선택할 대안 ----------
export interface AlternativeView {
  decisionIndex: number;
  whenLabel: string;
  eventTitle: string;
  original: PeriodOutcome;
  alternative: PeriodOutcome;
  months: number;
  cashGain: number; // 대안 − 실제(기간 종료 현금)
  prevents: boolean; // 실제 선택은 이 기간에 파산했고 대안은 파산하지 않았는가
  caveats: string[];
}

function buildAlternative(game: Game, decisive: DecisiveCard[]): { view: AlternativeView | null; note: string | null } {
  let best: AlternativeView | null = null;
  let checked = 0;
  for (const dc of decisive) {
    const i = dc.card.index;
    const d = game.decisions[i];
    if (!canCompare(d)) continue;
    checked += 1;
    for (const o of alternativesFor(game, d)) {
      if (o.isOriginal || !o.available) continue;
      const r = compareAlternative(game, i, o.id);
      if (!r.ok) continue;
      const gain = r.alternative.end.cash - r.original.end.cash;
      const cand: AlternativeView = {
        decisionIndex: i,
        whenLabel: when(d.month),
        eventTitle: d.eventTitle,
        original: r.original,
        alternative: r.alternative,
        months: r.original.months,
        cashGain: gain,
        prevents: r.original.bankrupt && !r.alternative.bankrupt,
        caveats: [],
      };
      const better = !best || (cand.prevents && !best.prevents) || (cand.prevents === best.prevents && cand.cashGain > best.cashGain);
      if (better) best = cand;
    }
  }
  if (!best || (best.cashGain <= 0 && !best.prevents)) {
    return {
      view: null,
      note: checked === 0 ? '이전 기록이라 선택 직전 상태가 저장돼 있지 않아 같은 조건으로 다시 계산할 수 없습니다. 임의의 결과는 만들지 않습니다.' : '두 결정 모두, 그 시점에 고를 수 있던 다른 대안이 기간 종료 현금을 더 많이 남기지는 못했습니다. 현금만 기준이며 고객·품질 등 다른 지표는 따로 봐야 합니다.',
    };
  }
  best.caveats = [
    '같은 선택 직전 상태에서 이 결정 하나만 바꾸고 이후 기간을 같은 계산 규칙으로 다시 돌린 값입니다. 이후의 다른 결정은 새로 생기지 않는다고 보고 계산했습니다.',
    '기간 종료 현금이 더 많았다는 뜻이며 더 좋은 선택이라는 뜻은 아닙니다. 고객 수·품질·팀 사기도 함께 확인하세요.',
    '저장된 실제 기록은 바뀌지 않았습니다.',
  ];
  return { view: best, note: null };
}

// ---------- 토론 질문 ----------
function buildQuestions(game: Game, decisive: DecisiveCard[], alt: AlternativeView | null, cause: CauseSection): string[] {
  const ds = game.decisions;
  const qs: string[] = [];
  if (game.status === 'bankrupt') {
    const withRunway = [...ds].reverse().find((d) => d.trace);
    if (withRunway?.trace) {
      const t = withRunway.trace;
      const r = t.before.runway === null ? '흑자 구조' : `약 ${t.before.runway.toFixed(1)}개월`;
      qs.push(`파산한 기간을 시작한 ${when(withRunway.month)}의 ${withJosa('‘' + withRunway.optionLabel + '’', '을/를')} 고르기 전 런웨이(현재 속도로 현금이 소진될 때까지 남은 기간)는 ${r}, 현금은 ${money(t.before.cash)}이었습니다. 그때 우리 팀은 이 숫자를 보고 어떤 판단을 했고, 무엇을 다르게 볼 수 있었을까요?`);
    }
  } else if (decisive.length >= 2) {
    const [a, b] = [ds[decisive[0].card.index], ds[decisive[1].card.index]];
    qs.push(`${when(a.month)} ${withJosa(`‘${a.optionLabel}’(${brief(a)})`, '과/와')} ${when(b.month)} ‘${b.optionLabel}’(${brief(b)}) 중, 회사의 현금 여유에 더 크게 영향을 준 것은 무엇이었나요? 둘 중 하나만 다시 고를 수 있다면 어느 쪽을 바꾸겠습니까?`);
  }
  if (alt) {
    qs.push(`${alt.whenLabel} ‘${alt.original.label}’ 대신 ${withJosa(`‘${alt.alternative.label}’`, '을/를')} 골랐다면 ${alt.months}개월 뒤 현금이 ${money(alt.original.end.cash)}에서 ${money(alt.alternative.end.cash)}으로 달라졌습니다. 이 차이 말고 우리 팀이 확인해야 할 숫자(고객·품질·사기)는 무엇이고, 그 숫자는 어떻게 달랐나요?`);
  } else if (decisive[0]) {
    qs.push(reconsiderQuestion(ds[decisive[0].card.index]));
  }
  if (qs.length < 2 && decisive[1]) qs.push(reconsiderQuestion(ds[decisive[1].card.index]));
  if (qs.length < 2 && ds.length > 0) qs.push(`이 게임에서 가장 먼저 확인했어야 할 숫자 하나를 고르고, ${cause.title === '파산 원인' ? '파산' : '현금 위기'}를 피하려면 어느 시점에 무엇을 바꿔야 했을지 이야기해 보세요.`);
  return qs.slice(0, 2);
}

// ---------- 상세 계산표(펼쳐보기) ----------
export interface MonthlyCash {
  month: number;
  cash: number;
  atOrBelowZero: boolean;
}

export interface ResultReport {
  result: FinalResult;
  cause: CauseSection;
  decisive: DecisiveCard[];
  alternative: AlternativeView | null;
  alternativeNote: string | null;
  questions: string[];
  details: { years: YearRow[]; monthlyCash: MonthlyCash[]; legacyCount: number };
}

export function buildResultReport(game: Game): ResultReport {
  const result = finalResult(game);
  const cause = buildCause(game);
  const decisive = buildDecisive(game);
  const alt = buildAlternative(game, decisive);
  const questions = buildQuestions(game, decisive, alt.view, cause);
  return {
    result,
    cause,
    decisive,
    alternative: alt.view,
    alternativeNote: alt.note,
    questions,
    details: {
      years: yearRows(game),
      monthlyCash: game.history.filter((h) => h.month > 0).map((h) => ({ month: h.month, cash: h.cash, atOrBelowZero: h.cash <= 0 })),
      legacyCount: game.decisions.filter((d) => !d.trace).length,
    },
  };
}

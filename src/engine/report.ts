// 규칙 기반 최종 학습 보고서. AI를 쓰지 않으며 같은 게임이면 항상 같은 보고서가 나온다.

import type { CbReasonId, DecisionRecord, Game, Score, Verdict } from './types';
import { CB_REASONS, DISCLAIMER_LONG, reasonLabel } from './constants';
import { formatMoney, monthToLabel } from './format';
import { BUSINESS_TYPES, CUSTOMER_TYPES, REVENUE_MODELS } from './templates';
import { scoreGame } from './scoring';
import { withJosa } from './josa';
import { createInitialState } from './templates';
import { isSalaryCut, monthlyFixedCost, normalSalaryProfit, projectedMonthlyProfit, salaryGapPerMonth, unitEconomics, aiAutomated } from './rules';
import { EMERGENCY_EVENT_ID, SALARY_EVENT_ID } from './events';

export interface TurningPoint {
  kind: 'best' | 'worst';
  decision: DecisionRecord;
  impact: number;
  /** 상황 적합성(결정 당시 회사 상태에 맞는 선택이었는가) */
  fit: Verdict;
  /** 재무 결과(결정 직후부터 다음 결정까지 현금 증감, 만원). 기록이 없으면 null */
  cashChange: number | null;
  /** 두 판단이 다를 때나 주의할 점을 설명하는 문장 */
  note: string;
}

/** 무급여·급여 삭감이 있었을 때의 이익 구분 */
export interface SalaryReport {
  months: number; // 삭감 상태로 보낸 개월 수
  burden: number; // 팀이 개인적으로 떠안은 누적 금액(회사 현금에서 차감하지 않음)
  active: boolean; // 종료 시점에도 삭감 상태인가
  currentProfit: number; // 현재 급여 기준 월 이익
  normalProfit: number; // 정상 급여를 지급한다고 가정한 월 이익
}

export interface ReasonStat {
  reason: CbReasonId;
  label: string;
  strong: number;
  ok: number;
  weak: number;
  titles: string[];
  comment: string;
}

export interface Insight {
  title: string;
  text: string;
  tag?: string; // 예: 월 고정비 +250만원
  eyebrow?: string; // 예: 2년 차 · 인력 채용
}

export interface Report {
  score: Score;
  headline: string;
  summary: string[];
  turningPoints: TurningPoint[];
  turningCriteria: string[]; // 전환점 선정 기준(설명)
  salary: SalaryReport | null;
  learning: { verdicts: Record<Verdict, number>; note: string }; // 학습·의사결정 기록(회사 성과 점수와 별개)
  reasons: ReasonStat[];
  discussion: { total: number; avgLength: number; withDissent: number; shortLabel: string };
  choiceInsights: Insight[]; // 팀이 실제로 고른 대안을 직접 짚은 것
  insights: Insight[]; // 우리 팀의 결과에서 읽을 수 있는 것
  principles: Insight[]; // 이 시뮬레이션이 주는 일반 원칙
  questions: string[];
  endNotes: string[];
}

/** 결정 하나의 영향도: 품질·사기·평판 변화(0~100 기준), 고객 수 변화율, 월 매출 변화율의 합 */
export function decisionImpact(d: DecisionRecord): number {
  const dq = d.afterPeriod.quality - d.before.quality;
  const dm = d.afterPeriod.morale - d.before.morale;
  const dr = d.afterPeriod.reputation - d.before.reputation;
  const dc = (d.afterPeriod.customers - d.before.customers) / Math.max(20, d.before.customers);
  const dv =
    (d.afterPeriod.monthlyRevenue - d.before.monthlyRevenue) / Math.max(50, d.before.monthlyRevenue);
  return (dq + dm + dr) / 100 + dc + dv;
}

function reasonComment(strong: number, ok: number, weak: number): string {
  const total = strong + ok + weak;
  if (total === 0) return '';
  if (weak === 0 && strong > 0) return '이 위험을 잘 다뤘습니다. 선택의 근거도 함께 점검해 보세요.';
  if (weak > strong) return '이 위험에 취약했습니다. 어떤 정보가 있었다면 다른 선택을 했을지 토론해 보세요.';
  return '절반은 맞고 절반은 아쉬운 대응이었습니다. 어디서 갈렸는지 비교해 보세요.';
}

const QUESTION_BY_PART: Record<keyof Score['parts'], string[]> = {
  finance: [
    '우리 회사의 현금이 줄어드는 속도를 가장 빨리 늦출 수 있었던 결정은 무엇이었나?',
    '투자·대출·비용 절감 중 어떤 선택이 가장 후회되는가? 그 이유는?',
  ],
  growth: [
    '고객이 늘어도 매출이 늘지 않았다면 가격·이탈·고객 유형 중 무엇이 원인이었나?',
    '성장을 위해 썼던 비용 중 실제로 고객을 남긴 것은 무엇인가?',
  ],
  quality: [
    '품질이 떨어지기 시작한 시점은 언제이며, 그 전에 어떤 신호가 있었나?',
    '인력 부족과 품질 저하는 어떤 순서로 연결되었나?',
  ],
  team: [
    '팀 사기를 올린 결정과 떨어뜨린 결정은 각각 무엇이었나?',
    '의견이 갈렸을 때 우리 팀은 어떻게 결론을 냈으며, 다음엔 무엇을 바꾸겠는가?',
  ],
  reputation: [
    '평판은 어떤 결정 직후에 가장 크게 변했나? 고객은 무엇을 보고 판단했을까?',
    '평판을 지키기 위해 단기 비용을 감수한 적이 있는가?',
  ],
};

export const PRINCIPLES: Insight[] = [
  {
    title: '일회성 비용과 월 고정비는 완전히 다른 돈입니다',
    text: '외주비 300만원은 한 번 나가고 끝나지만, 월 250만원짜리 채용이나 구독은 12개월이면 3,000만원이 됩니다. 같은 "비용"이어도 런웨이를 줄이는 속도가 다릅니다. 결정 전에 "이 돈은 한 번인가, 매달인가"를 먼저 물어야 합니다.',
  },
  {
    title: '런웨이는 현금이 아니라 속도의 문제입니다',
    text: '현금이 1억원이어도 매달 2,000만원씩 새면 5개월입니다. 매출이 늘어도 고정비가 더 빨리 늘면 런웨이는 오히려 짧아집니다. 투자는 시간을 사는 것이지 문제를 해결하는 것이 아닙니다.',
  },
  {
    title: '고객이 늘어도 고객 하나가 남기는 돈이 중요합니다',
    text: '고객 확보 비용보다 고객 생애 가치가 3배 이상 커야 마케팅을 늘릴수록 이익이 남습니다. 이탈률이 높은 사업에서 광고를 늘리면 구멍 난 독에 물을 붓는 셈이 됩니다.',
  },
  {
    title: '위기는 갑자기 오지 않고, 신호가 먼저 옵니다',
    text: '런웨이가 6개월 아래로 내려갈 때 선택지는 많고, 1개월 아래에서는 지분·팀·신뢰를 갈아 넣는 선택만 남습니다. 늦게 움직일수록 같은 결정의 비용이 커집니다.',
  },
  {
    title: '좋은 결정은 결과가 아니라 근거로 평가합니다',
    text: '같은 선택도 회사 상태에 따라 다른 결과가 나옵니다. 그래서 "무엇을 골랐나"보다 "어떤 수치와 가정을 보고 골랐나"를 남기는 것이 실제 창업에서도 가장 재사용 가능한 자산입니다.',
  },
];

const runwayText = (r: number | null | undefined): string => (r === null ? '흑자 구조' : (r as number) >= 60 ? '5년 이상' : `${(r as number).toFixed(1)}개월`);
const signed = (v: number): string => `${v >= 0 ? '+' : '−'}${formatMoney(Math.abs(Math.round(v)))}`;

/** 팀이 실제로 고른 대안에서 월 고정비·런웨이가 어떻게 달라졌는지 직접 짚는다. 저장된 옛 기록은 건너뛴다. */
function buildChoiceInsights(game: Game): Insight[] {
  type D = DecisionRecord & { fixedBefore: number; fixedAfter: number; runwayBefore: number | null; runwayAfter: number | null };
  const ds = game.decisions.filter(
    (d): d is D => d.fixedBefore !== undefined && d.fixedAfter !== undefined && d.runwayBefore !== undefined && d.runwayAfter !== undefined,
  );
  const picked: Insight[] = [];
  const used = new Set<string>();
  const head = (d: D) => `${d.stage}년 차 '${d.eventTitle}'에서 ${withJosa(`'${d.optionLabel}'`, '을/를')} 택해`;
  const eyebrow = (d: D) => `${d.stage}년 차 · ${d.eventTitle}`;
  const add = (d: D | undefined, text: string, tag: string) => {
    if (!d || used.has(d.eventId)) return;
    used.add(d.eventId);
    picked.push({ title: `선택: ${d.optionLabel}`, eyebrow: eyebrow(d), text, tag });
  };
  const runwayChange = (d: D): string => {
    if (d.runwayBefore === d.runwayAfter) return `런웨이는 ${runwayText(d.runwayAfter)} 그대로였습니다`;
    const down = d.runwayBefore === null || (d.runwayAfter !== null && d.runwayAfter < d.runwayBefore);
    return `그 뒤 런웨이는 ${runwayText(d.runwayBefore)}에서 ${withJosa(runwayText(d.runwayAfter), '으로/로')} ${down ? '줄었습니다' : '늘었습니다'}`;
  };

  // 0) 긴급 생존 카드
  const em = ds.find((d) => d.eventId === EMERGENCY_EVENT_ID);
  if (em) {
    const cashIn = em.afterImmediate.cash - em.before.cash + em.cost;
    add(
      em,
      `런웨이가 ${runwayText(em.runwayBefore)}까지 떨어진 상황에서 ${withJosa(`'${em.optionLabel}'`, '을/를')} 택했습니다. 월 고정비는 ${em.fixedAfter === em.fixedBefore ? '그대로였고' : em.fixedAfter < em.fixedBefore ? `${formatMoney(em.fixedBefore - em.fixedAfter)} 줄었고` : `${formatMoney(em.fixedAfter - em.fixedBefore)} 늘었고`}, 즉시 들어온 현금은 ${cashIn > 0 ? formatMoney(cashIn) : '없었으며'}, ${runwayChange(em)}. 지분·팀·신뢰 중 무엇을 내주고 시간을 샀는지 토론해 보세요.`,
      '긴급 생존 카드',
    );
  }

  // 1) 월 고정비를 가장 많이 늘린 선택
  const up = [...ds].filter((d) => d.fixedAfter - d.fixedBefore > 0).sort((a, b) => b.fixedAfter - b.fixedBefore - (a.fixedAfter - a.fixedBefore))[0];
  if (up) {
    const delta = up.fixedAfter - up.fixedBefore;
    add(
      up,
      `${head(up)} 월 고정비가 ${signed(delta)} 늘었고(${formatMoney(up.fixedBefore)}→${formatMoney(up.fixedAfter)}), ${runwayChange(up)}. 이 증가분은 1년이면 ${withJosa(formatMoney(delta * 12), '이/가')} 됩니다${up.cost > 0 ? `. 같은 결정의 일회성 비용 ${formatMoney(up.cost)}보다 훨씬 오래 부담이 이어집니다` : ''}. 이 고정비를 매출이 따라잡았는지 확인해 보세요.`,
      `월 고정비 ${signed(delta)}`,
    );
  }

  // 2) 월 고정비를 가장 많이 줄인 선택
  const down = [...ds].filter((d) => d.fixedAfter - d.fixedBefore < 0).sort((a, b) => a.fixedAfter - a.fixedBefore - (b.fixedAfter - b.fixedBefore))[0];
  if (down) {
    const delta = down.fixedAfter - down.fixedBefore;
    add(
      down,
      `${head(down)} 월 고정비를 ${formatMoney(-delta)} 줄였고(${formatMoney(down.fixedBefore)}→${formatMoney(down.fixedAfter)}), ${runwayChange(down)}. 비용을 줄인 대가로 고객·팀·품질에서 잃은 것은 없는지도 함께 보세요(결과: ${VERDICT_WORD[down.verdict]}).`,
      `월 고정비 ${signed(delta)}`,
    );
  }

  // 3) 런웨이를 가장 많이 깎은 선택 (고정비 변화와 상관없이)
  const drop = (d: D): number =>
    d.runwayBefore === null ? (d.runwayAfter === null ? 0 : 99 - d.runwayAfter) : d.runwayAfter === null ? 0 : d.runwayBefore - d.runwayAfter;
  const worst = [...ds].filter((d) => drop(d) > 1).sort((a, b) => drop(b) - drop(a))[0];
  if (worst) {
    add(
      worst,
      `${head(worst)} 일회성 비용 ${worst.cost > 0 ? formatMoney(worst.cost) : '없이'}${worst.fixedAfter !== worst.fixedBefore ? `, 월 고정비 ${signed(worst.fixedAfter - worst.fixedBefore)}로` : ''} 진행했고, ${runwayChange(worst)}. 다음 결정 시점까지 런웨이가 가장 크게 줄어든 구간입니다. 결정 자체의 효과와 그 사이 흘러간 시간이 함께 반영된 수치입니다(결과: ${VERDICT_WORD[worst.verdict]}).`,
      `런웨이 ${runwayText(worst.runwayBefore)}→${runwayText(worst.runwayAfter)}`,
    );
  }

  // 5) 고정비 변화가 하나도 없었다면, 일회성 비용이 가장 컸던 선택을 짚는다
  if (picked.length === 0) {
    const big = [...ds].sort((a, b) => b.cost - a.cost)[0];
    if (big && big.cost > 0) {
      add(
        big,
        `${head(big)} 일회성 비용 ${withJosa(formatMoney(big.cost), '을/를')} 한 번 썼고 월 고정비는 변하지 않았습니다. ${runwayChange(big)}. 한 번 쓰고 끝나는 돈이라 부담이 일시적이었는지, 그만한 효과가 있었는지 보세요.`,
        `일회성 ${formatMoney(big.cost)}`,
      );
    }
  }
  return picked.slice(0, 4);
}

const VERDICT_WORD: Record<Verdict, string> = { strong: '좋음', ok: '보통', weak: '아쉬움' };

/** 인원·채용·외주·AI 도입을 실제 결정 이력에서 읽는다. 이력으로 뒷받침되는 사실만 문장으로 만든다. */
function staffingFacts(game: Game) {
  const { decisions, sim, history } = game;
  const start = history[0].headcount;
  const end = sim.headcount;
  const chose = (ids: string[]) => decisions.filter((d) => ids.includes(d.optionId));
  const hired = chose(['hire-two', 'hire-and-automate', 'first-hire']);
  const outsourced = chose(['freelance', 'outsource', 'outsourced']);
  const aiDecisions = chose(['hire-and-automate', 'ai-first']);
  const reduced = chose(['cut-costs', 'stop-loss', 'unpaid-founders']);
  const left = decisions.filter((d) => /떠났|이탈|퇴사/.test(d.outcomeText) && d.afterPeriod.headcount < d.before.headcount);
  return { start, end, hired, outsourced, aiDecisions, reduced, left, aiLevel: sim.aiLevel ?? 0 };
}

function buildInsights(game: Game): Insight[] {
  const { setup, sim, history, decisions } = game;
  const list: Insight[] = [];
  const m = (v: number) => formatMoney(Math.round(v));

  // 1) 고정비 구조
  const startFixed = monthlyFixedCost(createInitialState(setup));
  const endFixed = monthlyFixedCost(sim);
  const fixedChange = endFixed - startFixed;
  list.push({
    title: '고정비가 어떻게 변했나',
    text: `월 고정비는 ${m(startFixed)}에서 ${m(endFixed)}으로 ${fixedChange >= 0 ? '늘었습니다' : '줄었습니다'}(${fixedChange >= 0 ? '+' : '−'}${m(Math.abs(fixedChange))}). ${
      fixedChange > 0
        ? '한 번 늘린 채용·운영비·마케팅비는 줄이기 어렵습니다. 결정할 때 일회성 비용과 월 고정비 변동을 따로 계산했는지 돌아보세요.'
        : '고정비가 늘지 않은 대신 어떤 기회를 포기했는지도 함께 돌아보세요.'
    }${isSalaryCut(sim) ? ' 단, 종료 시점에도 급여 삭감 상태라 정상 급여 기준 고정비는 이보다 큽니다.' : ''}`,
  });

  // 2) 현금이 가장 얕았던 순간 — 마이너스와 고갈 이전을 구분한다
  let low = history[0];
  for (const h of history) if (h.cash < low.cash) low = h;
  const negMonths = history.filter((h) => h.month > 0 && h.cash < 0).length;
  const usedEmergency = decisions.some((d) => d.eventId === EMERGENCY_EVENT_ID);
  const lowLabel = monthToLabel(low.month).replace(/ 시점$/, '');
  list.push({
    title: '현금이 가장 얕았던 순간',
    text: `현금이 가장 적었던 때는 ${lowLabel}로 ${low.cash < 0 ? `마이너스 ${m(-low.cash)}` : m(low.cash)}이었습니다${negMonths > 0 ? `. 현금이 마이너스였던 달이 ${negMonths}개월 있었습니다` : ''}. ${
      usedEmergency
        ? '런웨이가 1개월 아래로 내려가 긴급 생존 카드를 사용했습니다. 그 전 어느 결정에서 위험 신호를 볼 수 있었는지 짚어 보세요.'
        : low.cash < 0
          ? '긴급 생존 카드가 열릴 만큼의 기준(런웨이 1개월 미만)은 지나갔는데도 사용 기록이 없다면, 현금이 마이너스가 된 시점의 결정을 다시 보세요.'
          : '현금이 마이너스까지 내려가지는 않았습니다. 그 여유가 어느 결정에서 만들어졌는지 확인해 보세요.'
    }`,
  });

  // 3) 단위경제
  const ue = unitEconomics(sim);
  if (ue.ratio !== null) {
    list.push({
      title: '고객 한 명이 남긴 돈',
      text: `마지막 시점 고객 확보 비용은 약 ${ue.cac < 1 ? '1만원 미만' : m(ue.cac)}, 고객 생애 가치는 약 ${m(ue.ltv)}으로 ${ue.ratio.toFixed(1)}배입니다. ${
        ue.ratio >= 3 ? '3배를 넘어 마케팅을 늘릴 여지가 있는 구조입니다.' : '3배에 못 미쳐 마케팅을 늘리기 전에 이탈률과 고객당 이익부터 손봐야 하는 구조입니다.'
      }`,
    });
  }

  // 4) 성장과 수익 — 급여 삭감이 있었다면 정상 급여 기준을 함께 보여 준다
  const end = history[history.length - 1];
  const start = history[0];
  const profit = projectedMonthlyProfit(sim);
  const normal = normalSalaryProfit(sim);
  const gap = salaryGapPerMonth(sim);
  list.push({
    title: '성장과 수익의 균형',
    text: `월 매출은 ${m(start.revenue)}에서 ${m(end.revenue)}으로 ${end.revenue >= start.revenue ? '늘었지만' : '줄었고'}, 마지막 시점 월 이익은 ${profit >= 0 ? '+' : '−'}${m(Math.abs(profit))}입니다. ${
      gap > 0
        ? `다만 급여 삭감 상태라 정상 급여를 지급했다면 월 이익은 ${normal >= 0 ? '+' : '−'}${m(Math.abs(normal))}입니다. ${normal >= 0 ? '정상 급여로 되돌려도 흑자가 유지됩니다.' : '정상 급여로 되돌리면 적자가 됩니다. 현재의 이익은 팀의 개인 부담으로 만들어진 것입니다.'}`
        : profit >= 0
          ? '매출이 고정비를 넘어서 시간이 회사 편이 된 상태입니다.'
          : '매출이 아직 비용을 따라가지 못해, 이 상태가 길어지면 런웨이가 다시 줄어듭니다.'
    }`,
  });

  // 5) 인력 구성과 자동화 — 실제 결정 이력으로만 서술한다
  const f = staffingFacts(game);
  const bits: string[] = [];
  bits.push(`인원은 ${f.start}명에서 ${f.end}명으로 ${f.end > f.start ? '늘었습니다' : f.end < f.start ? '줄었습니다' : '그대로였습니다'}`);
  bits.push(f.hired.length > 0 ? `정규 채용 결정은 ${f.hired.length}번(${f.hired.map((d) => `'${d.optionLabel}'`).join(', ')})이었습니다` : '정규 채용을 선택한 결정은 없었습니다');
  if (f.outsourced.length > 0) bits.push(`프리랜서·외주를 ${f.outsourced.length}번 활용했습니다`);
  if (f.end < f.start) {
    const why = [...f.reduced, ...f.left].map((d) => `'${d.optionLabel}'`);
    bits.push(why.length > 0 ? `인원 감소는 ${Array.from(new Set(why)).join(', ')}와 관련된 결정 이후에 일어났습니다` : '인원 감소는 기록된 결정 외에 운영 중 이탈로 일어났습니다');
  }
  const aiNow = Math.round(aiAutomated(sim) * 100);
  bits.push(
    f.aiLevel > 0 || f.aiDecisions.length > 0
      ? `사내 업무 자동화는 ${aiNow}%(상한 ${Math.round((sim.aiShare ?? 0.3) * 100)}%)까지 도입했습니다`
      : '사내 업무 자동화는 도입하지 않았습니다(제품 자체의 AI 기능은 이 수치와 별개입니다)',
  );
  list.push({
    title: '인력 구성과 자동화',
    text: `${bits.join('. ')}. 이 기록을 바탕으로 사람·외주·자동화 중 어떤 방식으로 병목을 풀었는지, 고정비 부담과 비교해 어땠는지 토론해 보세요.`,
  });

  // 6) 무급여·급여 삭감
  if (sim.salaryCut) {
    const c = sim.salaryCut;
    const asked = decisions.filter((d) => d.eventId === SALARY_EVENT_ID);
    list.push({
      title: '무급여·급여 삭감의 비용',
      text: `급여 삭감 상태로 ${c.months}개월을 보냈고, 팀이 개인적으로 떠안은 부담은 누적 약 ${m(c.burden)}입니다(회사 현금에서는 차감하지 않았습니다). ${
        asked.length > 0 ? `급여 복원 결정은 ${asked.length}번 내렸고 마지막 선택은 '${asked[asked.length - 1].optionLabel}'이었습니다.` : '급여 복원 결정을 내릴 시점까지는 이어지지 않았습니다.'
      } ${isSalaryCut(sim) ? '종료 시점에도 정상 급여로 돌아오지 못했습니다.' : '종료 시점에는 정상 급여 수준으로 돌아왔습니다.'}`,
    });
  }

  // 7) 가장 약했던 영역
  const weakest = (Object.entries(scoreGame(game).parts) as [string, number][]).sort((a, b) => a[1] - b[1])[0];
  const label: Record<string, string> = { finance: '재무', growth: '성장', quality: '제품 품질', team: '팀', reputation: '평판' };
  list.push({
    title: '다음에 가장 먼저 보완할 영역',
    text: `점수가 가장 낮은 영역은 ${label[weakest[0]]}(${weakest[1]}점)입니다. 이 영역을 끌어올릴 수 있었던 결정은 무엇이었는지 팀이 함께 골라 보세요.`,
  });

  return list;
}

export function generateReport(game: Game): Report {
  const score = scoreGame(game);
  const { setup, sim, decisions, history } = game;
  const start = history[0];
  const end = history[history.length - 1];
  const bankrupt = game.status === 'bankrupt';
  const bt = BUSINESS_TYPES[setup.businessType];

  const headline = bankrupt
    ? `${setup.companyName}: ${monthToLabel(sim.month)}에 파산했습니다 (종합 ${score.total}점, 등급 ${score.grade})`
    : `${setup.companyName}: 3년을 버텼습니다 (종합 ${score.total}점, 등급 ${score.grade})`;

  const summary = [
    `${bt.label} · ${CUSTOMER_TYPES[setup.customerType].label} · ${REVENUE_MODELS[setup.revenueModel].label} 모델로 ${withJosa(formatMoney(setup.capital), '을/를')} 들여 시작했습니다.`,
    `${withJosa(bt.customerWord, '은/는')} ${start.customers.toLocaleString('ko-KR')}명에서 ${withJosa(`${end.customers.toLocaleString('ko-KR')}명`, '으로/로')}, 월 매출은 ${formatMoney(start.revenue)}에서 ${withJosa(formatMoney(end.revenue), '으로/로')} 변했습니다.`,
    `현금은 ${formatMoney(start.cash)}에서 ${withJosa(formatMoney(end.cash), '이/가')} 되었고, 부채는 ${formatMoney(sim.debt)}, 지분 희석은 ${sim.dilution}%입니다.`,
    `제품 품질 ${start.quality}→${end.quality}, 팀 사기 ${start.morale}→${end.morale}, 평판 ${start.reputation}→${withJosa(String(end.reputation), "으로/로")} 마쳤습니다.`,
  ];

  const ranked = decisions
    .map((d) => ({ d, impact: decisionImpact(d) }))
    .sort((a, b) => b.impact - a.impact);
  const turningPoints: TurningPoint[] = [];
  const mk = (kind: 'best' | 'worst', d: DecisionRecord, impact: number): TurningPoint => {
    const cash = d.cashFlow ? d.cashFlow.total : null;
    let note = '';
    if (kind === 'worst' && d.verdict !== 'weak') {
      note = `결정 당시 상황에는 맞는 선택이었다는 판정(${VERDICT_WORD[d.verdict]})이지만, 결정 이후 품질·사기·평판·고객·매출 변화의 합은 낮았습니다. 맞는 선택이어도 비용이나 시간 때문에 결과가 좋지 않을 수 있습니다.`;
    } else if (kind === 'best' && cash !== null && cash < 0) {
      note = `상황에 맞는 좋은 선택이었지만 현금은 ${formatMoney(-cash)} 줄었습니다. 좋은 대응이라도 비용 때문에 현금 위기를 앞당길 수 있다는 점을 함께 보세요.`;
    } else if (kind === 'worst') {
      note = '결정 당시 상황에 비춰서도 아쉬웠다는 판정이며, 결정 이후 지표 변화도 낮았습니다.';
    }
    return { kind, decision: d, impact, fit: d.verdict, cashChange: cash, note };
  };
  const bestC = ranked.find((x) => x.impact > 0 && x.d.verdict !== 'weak');
  if (bestC) turningPoints.push(mk('best', bestC.d, bestC.impact));
  const worstC = [...ranked].reverse().find((x) => (x.d.verdict === 'weak' || x.impact < -0.05) && x.d.eventId !== bestC?.d.eventId);
  if (worstC) turningPoints.push(mk('worst', worstC.d, worstC.impact));
  const turningCriteria = [
    '가장 좋았던 결정: 판정이 "아쉬움"이 아니면서, 결정 이후 품질·사기·평판 변화(0~100 기준)와 고객 수·월 매출 변화율의 합이 가장 높은 결정입니다. 후보가 없으면 표시하지 않습니다.',
    '가장 아쉬웠던 결정: 판정이 "아쉬움"이거나 위 합이 음수인 결정 중 가장 낮은 것입니다. 타당한 후보가 없으면 억지로 고르지 않습니다.',
    '판정(좋음·보통·아쉬움)은 결정 당시 회사 상태에 비춰 적합했는지를, 위 합과 현금 증감은 결정 뒤의 재무·지표 결과를 뜻합니다. 두 기준은 서로 다를 수 있습니다.',
  ];
  if (!worstC) turningCriteria.push('이번 게임에서는 뚜렷하게 아쉬웠던 결정이 없어 표시하지 않았습니다.');

  const salary: SalaryReport | null = game.sim.salaryCut
    ? {
        months: game.sim.salaryCut.months,
        burden: game.sim.salaryCut.burden,
        active: isSalaryCut(game.sim),
        currentProfit: projectedMonthlyProfit(game.sim),
        normalProfit: normalSalaryProfit(game.sim),
      }
    : null;
  const verdicts = { strong: 0, ok: 0, weak: 0 } as Record<Verdict, number>;
  for (const d of decisions) verdicts[d.verdict] += 1;
  const learning = {
    verdicts,
    note: '학습·의사결정 기록은 회사 성과 점수에 합산되지 않습니다. 판정은 결정 당시 상황에 적합했는지를 규칙으로 계산한 것이고, 근거 입력은 글자 수(20자 이상)만 확인할 뿐 내용의 타당성은 평가하지 않습니다.',
  };

  const byReason = new Map<CbReasonId, ReasonStat>();
  for (const d of decisions) {
    const cur =
      byReason.get(d.reason) ??
      ({
        reason: d.reason,
        label: reasonLabel(d.reason),
        strong: 0,
        ok: 0,
        weak: 0,
        titles: [],
        comment: '',
      } as ReasonStat);
    cur[d.verdict as Verdict] += 1;
    cur.titles.push(d.eventTitle);
    byReason.set(d.reason, cur);
  }
  const reasons = Array.from(byReason.values()).map((r) => ({
    ...r,
    label: CB_REASONS[r.reason].label,
    comment: reasonComment(r.strong, r.ok, r.weak),
  }));

  const lengths = decisions.map((d) => d.rationale.length);
  const avg = lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0;
  const withDissent = decisions.filter((d) => d.dissent.length > 0).length;
  const discussion = {
    total: decisions.length,
    avgLength: avg,
    withDissent,
    shortLabel:
      withDissent === 0
        ? '반대 의견을 기록한 결정이 없습니다. 다음에는 소수 의견도 남겨 보세요.'
        : `${decisions.length}개 결정 중 ${withDissent}개에 반대 의견·검토한 다른 대안을 남겼습니다.`,
  };

  const lowest = (Object.entries(score.parts) as [keyof Score['parts'], number][]).sort(
    (a, b) => a[1] - b[1],
  )[0][0];
  const questions = QUESTION_BY_PART[lowest];

  const endNotes: string[] = [];
  if (bankrupt) {
    const last = decisions[decisions.length - 1];
    endNotes.push(
      `파산은 "${last?.eventTitle ?? '창업 직후'}" 결정 이후 ${last?.monthsElapsed ?? 0}개월 안에 일어났습니다. 현금이 마이너스가 되기 전 어느 시점에 무엇을 바꿀 수 있었는지 되짚어 보세요.`,
    );
  }
  if (sim.debt > 0) endNotes.push(`종료 시점 부채가 ${formatMoney(sim.debt)} 남아 있습니다.`);
  endNotes.push(DISCLAIMER_LONG);

  const insights = buildInsights(game);
  const choiceInsights = buildChoiceInsights(game);
  return { score, headline, summary, turningPoints, turningCriteria, salary, learning, reasons, discussion, choiceInsights, insights, principles: PRINCIPLES, questions, endNotes };
}

export function reportToMarkdown(game: Game, report: Report): string {
  const lines: string[] = [];
  lines.push(`# ${game.setup.companyName} — Startup Simulator 학습 보고서`, '');
  lines.push(`> ${report.headline}`, '');
  lines.push('## 사업 아이디어', '', game.setup.idea, '', `대상 고객: ${game.setup.targetCustomer}`, '');
  lines.push('## 결과 요약', '', ...report.summary.map((s) => `- ${s}`), '');
  lines.push(
    '## 점수',
    '',
    `종합 ${report.score.total}점 (${report.score.grade}) — 재무 ${report.score.parts.finance}, 성장 ${report.score.parts.growth}, 품질 ${report.score.parts.quality}, 팀 ${report.score.parts.team}, 평판 ${report.score.parts.reputation}`,
    '',
  );
  lines.push(
    `> 성장 점수 산식 변경: 이전 산식(월 매출 ÷ 초기 자본의 15%)이면 성장 ${report.score.legacy.growth}점, 종합 ${report.score.legacy.total}점. 현재는 매출의 비용 충당률과 매출 규모로 계산합니다. 이 점수는 회사 성과이며 학습·의사결정 평가와 별개입니다.`,
    '',
  );
  if (report.turningPoints.length) {
    lines.push('## 주요 전환점', '');
    for (const t of report.turningPoints) {
      lines.push(
        `- ${t.kind === 'best' ? '가장 좋았던 결정' : '가장 아쉬웠던 결정'}: ${t.decision.eventTitle} → ${t.decision.optionLabel}`,
        `  - 상황 적합성: ${VERDICT_WORD[t.fit]}${t.cashChange !== null ? ` / 현금 증감: ${formatMoney(t.cashChange)}` : ''}`,
      );
      if (t.note) lines.push(`  - ${t.note}`);
    }
    lines.push('', ...report.turningCriteria.map((c) => `  - 기준: ${c}`), '');
  }
  if (report.salary) {
    lines.push(
      '## 무급여·급여 삭감 이력',
      '',
      `- 삭감 상태 ${report.salary.months}개월 (${report.salary.active ? '종료 시점에도 삭감 중' : '종료 전 복원'}), 팀 개인 부담 ${formatMoney(report.salary.burden)} (회사 현금 미차감)`,
      `- 현재 급여 기준 월 이익 ${formatMoney(report.salary.currentProfit)} / 정상 급여 가정 월 이익 ${formatMoney(report.salary.normalProfit)}`,
      '',
    );
  }
  lines.push(
    '## 학습·의사결정 기록 (회사 성과 점수와 별개)',
    '',
    `- 좋음 ${report.learning.verdicts.strong} · 보통 ${report.learning.verdicts.ok} · 아쉬움 ${report.learning.verdicts.weak}`,
    `- ${report.learning.note}`,
    '',
  );
  if (report.choiceInsights.length) {
    lines.push('## 우리가 실제로 고른 선택으로 본 인사이트', '');
    for (const i of report.choiceInsights) lines.push(`- [${i.eyebrow}] ${i.title} — ${i.text}`);
    lines.push('');
  }
  lines.push('## 이 시뮬레이션에서 얻은 인사이트', '');
  for (const i of report.insights) lines.push(`- ${i.title}: ${i.text}`);
  lines.push('', '## 창업에 가져갈 원칙', '');
  for (const i of report.principles) lines.push(`- ${i.title}: ${i.text}`);
  lines.push('');
  lines.push('## 실패 요인별 대응', '');
  for (const r of report.reasons) {
    lines.push(`- ${r.label}: 잘함 ${r.strong}, 보통 ${r.ok}, 아쉬움 ${r.weak}. ${r.comment}`);
  }
  lines.push('', '## 의사결정 기록', '');
  game.decisions.forEach((d, i) => {
    const snap = (s: DecisionRecord['before']) => `현금 ${formatMoney(s.cash)}, 월 매출 ${formatMoney(s.monthlyRevenue)}, 고객 ${s.customers}, 품질 ${s.quality}, 사기 ${s.morale}, 평판 ${s.reputation}, 인원 ${s.headcount}`;
    const cf = d.cashFlow;
    const block = [
      `### ${i + 1}. ${d.eventTitle} (${monthToLabel(d.month)})`,
      '',
      d.situation ? `- 질문: ${d.situation}` : '',
      `- 결정 직전 재무 상태: ${d.finStatusBefore === 'surplus' ? '흑자' : d.finStatusBefore === 'deficit' ? '적자' : d.finStatusBefore === 'crunch' ? '현금 위기' : '(기록 없음)'}`,
      '- 제시된 선택지:',
      ...(d.optionsShown ?? []).map(
        (o) => `  - ${o.label}: 일회성 비용 ${formatMoney(o.cost)}, 월 고정비 변화 ${o.fixedMin}~${o.fixedMax}만원${o.available ? '' : ` [선택 제한: ${o.reasons.join(' / ')}]`}`,
      ),
      `- 선택: ${d.optionLabel} (판정: ${VERDICT_WORD[d.verdict]})`,
      `- 토론 근거(글자 수만 검사, 내용 타당성은 평가하지 않음): ${d.rationale}`,
      d.dissent ? `- 반대 의견·검토한 대안: ${d.dissent}` : '- 반대 의견: (기록 없음)',
      `- 결과: ${d.outcomeText}`,
      `- 지표 변화: 결정 전 [${snap(d.before)}] → 기간 종료 [${snap(d.afterPeriod)}] (${d.monthsElapsed}개월)`,
      cf
        ? `- 현금 변화 분해: 일회성 ${formatMoney(cf.oneTime)} + 자금 유입 ${formatMoney(cf.inflow)} + 영업 현금흐름 ${formatMoney(cf.operating)} + 기타 ${formatMoney(cf.other)} = ${formatMoney(cf.total)}`
        : '',
      '',
    ];
    lines.push(...block.filter((l, k) => l !== '' || k === block.length - 1 || k === 1));
  });
  lines.push('## 다음 토론 질문', '', ...report.questions.map((q) => `- ${q}`), '');
  lines.push('---', '', ...report.endNotes.map((n) => `*${n}*`));
  return lines.join('\n');
}

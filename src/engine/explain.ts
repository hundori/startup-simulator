import type { DecisionRecord, Game, ResolvedEvent, Stage } from './types';
import { BUSINESS_TYPES, CUSTOMER_TYPES, REVENUE_MODELS } from './templates';
import {
  BANKRUPT_CASH_FLOOR_RATIO,
  BANKRUPT_MONTHS,
  INTEREST_RATE,
  MARKET_ACQ_DECAY,
  MARKET_CHURN_DRIFT,
  MKT_REF,
  SCALE_BASE_CAPITAL,
  acquisitionRate,
  aiAutomated,
  computeRunway,
  effectiveChurn,
  metricValue,
  monthlyFixedCost,
  payroll,
  projectedMonthlyProfit,
  unitEconomics,
  utilization,
} from './rules';
import { SCORE_WEIGHTS, scoreGame } from './scoring';
import { formatMoney, formatNumber } from './format';
import { reasonLabel } from './constants';
import { revenueStructure } from './structure';
import { CRUNCH_RUNWAY_MONTHS, financialStatus, normalSalaryProfit, isSalaryCut } from './rules';

/** 화면에 보여 주는 "가정과 계산 근거" 한 줄 */
export interface BasisRow {
  label: string;
  value: string;
  how: string;
}
export interface Basis {
  title: string;
  note: string;
  rows: BasisRow[];
}

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const NOTE =
  '아래 수치는 실제 업종 평균이 아니라 수업용으로 세운 교육용 가정입니다. 같은 입력과 같은 선택이면 항상 같은 결과가 나옵니다.';

/** 1단계 안내: 출발 조건이 어디서 나왔는가 */
export function explainStart(game: Game): Basis {
  const { setup, sim } = game;
  const t = BUSINESS_TYPES[setup.businessType];
  const rm = REVENUE_MODELS[setup.revenueModel];
  const ct = CUSTOMER_TYPES[setup.customerType];
  const st = revenueStructure(setup.businessType, setup.customerType, setup.revenueModel);
  const k = sim.scale ?? 1;
  const runway = computeRunway(sim);
  const margin = sim.monthlyRevenue * (1 - sim.cogsRatio);
  const fixed = monthlyFixedCost(sim);

  return {
    title: '출발 조건의 가정과 계산 근거',
    note: NOTE,
    rows: [
      {
        label: '규모 보정',
        value: `${k.toFixed(2)}배`,
        how: `초기 자본 ${formatMoney(setup.capital)} ÷ ${formatMoney(SCALE_BASE_CAPITAL)}(최대 1배). 자본이 작으면 월 비용·시작 고객·시장 크기·이벤트 금액을 같은 비율로 줄입니다. 고객당 매출, 처리 가능 고객 수, 이탈률은 줄이지 않습니다.`,
      },
      {
        label: '인건비',
        value: formatMoney(payroll(sim)),
        how: `1인당 250만원 × 규모 ${k.toFixed(2)} = ${sim.avgSalary}만원, ${sim.headcount}명. 창업 초기에는 월급을 낮게 가져간다고 가정했습니다.`,
      },
      {
        label: '운영비',
        value: formatMoney(sim.overhead),
        how: `${t.label} 기본 ${formatMoney(t.overhead)} × 규모 ${k.toFixed(2)} (임대·서버·사무 등).`,
      },
      {
        label: '마케팅비',
        value: formatMoney(sim.marketingBudget),
        how: `기본 100만원 × 규모 ${k.toFixed(2)}.`,
      },
      {
        label: '월 고정비',
        value: formatMoney(fixed),
        how: `인건비 + 운영비 + 마케팅비 + 이자(부채 × 월 ${pct(INTEREST_RATE, 1)}).`,
      },
      {
        label: '이용자 · 공급자 · 지불자',
        value: `${st.user} / ${st.supplier ?? '없음'} / ${st.payer}`,
        how: `과금 기준: ${st.billing}. 이 정의는 가격 개편 같은 이벤트의 대안 문구에 그대로 쓰입니다.`,
      },
      {
        label: '고객 1명당 월 매출',
        value: `${sim.arpu}만원`,
        how: `${t.label} 기본 ${t.arpu}만원 × ${rm.label} ${rm.arpuMult}배 × ${ct.label} ${ct.arpuMult}배. ${st.formula}. ${st.limit}`,
      },
      {
        label: '매출 대비 원가율',
        value: pct(sim.cogsRatio),
        how: `${t.label} ${pct(t.cogsRatio)} ${rm.cogsAdd >= 0 ? '+' : '−'} ${rm.label} ${pct(Math.abs(rm.cogsAdd))}p (5~90% 범위).`,
      },
      {
        label: '월 이탈률(기본)',
        value: pct(sim.churnRate, 1),
        how: `${t.label} ${pct(t.churnRate, 1)} × ${rm.label} ${rm.churnMult}배 × ${ct.label} ${ct.churnMult}배. 품질이 낮거나 인력이 부족하면 실제 이탈은 더 커집니다.`,
      },
      {
        label: '시작 고객 수',
        value: `${formatNumber(sim.customers)}명`,
        how: `${t.label} 기본 ${t.initCustomers}명 × 수익모델 ${rm.initMult} × 고객유형 ${ct.initMult} × 규모 ${k.toFixed(2)} (최소 3명).`,
      },
      {
        label: '월 신규 고객(기본)',
        value: `${sim.acqBase}명`,
        how: `${t.label} 기본 ${t.acqBase}명 × 수익모델 ${rm.acqMult} × 고객유형 ${ct.acqMult} × 규모 ${k.toFixed(2)}. 실제 유입은 마케팅·평판·품질로 늘고 줄며, 매달 시장 경쟁으로 조금씩 줄어듭니다.`,
      },
      {
        label: '처리 가능한 고객 수',
        value: `${formatNumber(Math.round(sim.headcount * sim.capPerHead))}명`,
        how: `직원 ${sim.headcount}명 × 1인당 ${formatNumber(sim.capPerHead)}명(${t.label} 기본 ${formatNumber(t.capPerHead)}명 × ${ct.label} ${ct.capMult}배). 규모 보정을 하지 않으므로 소액 창업에서는 인력 부족이 늦게 나타납니다.`,
      },
      {
        label: '사내 업무 자동화 가능 비율',
        value: `최대 ${pct(sim.aiShare ?? 0.3)}`,
        how: `${t.label} 가정값. 응대·문서·검수 같은 사내 운영 업무를 AI가 맡는 비율의 상한입니다. 제품 자체의 AI 기능(예: AI 추천 서비스)은 이 수치에 들어가지 않으며, 이 수치가 0%여도 'AI를 쓰지 않는 사업'이라는 뜻이 아닙니다. 도입하면 처리 가능 고객 수가 1 ÷ (1 − 상한 × 도입 정도)배까지 늘어나고, 이용료와 품질 위험이 따릅니다.`,
      },
      {
        label: '겨냥 시장 크기',
        value: `${formatNumber(sim.tam ?? 0)}명`,
        how: `${t.label} 기본 ${formatNumber(t.tam)}명 × 규모 ${k.toFixed(2)}. 고객이 이 크기를 채울수록 신규 유입이 줄어듭니다.`,
      },
      {
        label: '시작 런웨이',
        value: runway === null ? '흑자 구조' : `약 ${runway.toFixed(1)}개월`,
        how: `현금 ${formatMoney(sim.cash)} ÷ 월 적자. 월 적자 = 월 고정비 ${formatMoney(fixed)} − 매출총이익 ${formatMoney(Math.round(margin))}.`,
      },
    ],
  };
}

const STAGE_INTRO: Record<Stage, string> = {
  1: '1년 차(생존)는 "현금이 바닥나기 전에 시장이 돈을 내는가"를 봅니다. 런웨이, 고객 반응, 자금 확보가 핵심 기준입니다.',
  2: '2년 차(성장)는 "키울수록 이익이 남는가"를 봅니다. 고객 확보 비용 대비 생애 가치, 인력 처리 한계, 경쟁 대응이 핵심 기준입니다.',
  3: '3년 차(확장)는 "더 키울 시장과 돈이 있는가"를 봅니다. 투자 조건, 시장 포화, 성장과 수익의 균형이 핵심 기준입니다.',
};

/** 이벤트 화면 안내: 이 결정이 어떤 가정 위에서 평가되는가 */
export function explainEvent(game: Game, event: Pick<ResolvedEvent, 'stage' | 'reason'>): Basis {
  const { sim } = game;
  const ue = unitEconomics(sim);
  const growth = metricValue(sim, 'growth6');
  const util = utilization(sim);
  const runway = computeRunway(sim);

  return {
    title: '이 결정의 가정과 계산 근거',
    note: `${STAGE_INTRO[event.stage]} ${NOTE}`,
    rows: [
      {
        label: '연결된 실패 원인',
        value: reasonLabel(event.reason),
        how: 'CB Insights가 정리한 스타트업 실패 원인 가운데 이 이벤트가 다루는 위험입니다. 효과 크기는 이를 바탕으로 세운 교육용 가정입니다.',
      },
      {
        label: '일회성 비용 vs 월 고정비',
        value: '한 번 vs 매달',
        how: `일회성 비용은 선택 즉시 현금에서 한 번 빠집니다. 채용·툴 구독·마케팅 증액·대출 이자는 월 고정비를 올려 매달 반복됩니다. 이벤트 금액은 표준 규모(5,000만원)로 쓰여 있고 현재 규모 ${(sim.scale ?? 1).toFixed(2)}배로 환산합니다. 오른쪽 현황판의 예상 런웨이에 둘 다 반영됩니다.`,
      },
      {
        label: '결과가 정해지는 방식',
        value: '운이 아니라 회사 상태',
        how: '각 대안에는 정해진 효과가 있고, 같은 대안도 현재 품질·평판·성장률·이탈률·현금·인력 상태에 따라 다른 결과로 갈립니다. 확률 요소는 없습니다. 결과는 결정한 뒤에 공개됩니다.',
      },
      {
        label: '지금 런웨이',
        value: runway === null ? '흑자 구조' : `약 ${runway.toFixed(1)}개월`,
        how: `현금 ${formatMoney(sim.cash)} ÷ 월 적자 ${formatMoney(Math.max(0, -projectedMonthlyProfit(sim)))}.`,
      },
      {
        label: '재무 상태 판정',
        value: { crunch: '현금 위기', deficit: '적자', surplus: '흑자' }[financialStatus(sim)],
        how: `현재 고객·비용 기준 월 이익이 0 이상이면 흑자, 미만이면 적자입니다. 현금이 0 이하이거나 적자인데 런웨이가 ${CRUNCH_RUNWAY_MONTHS}개월 미만이면 현금 위기입니다. 이벤트 도입문, 대안 노출, 수업용 모드의 이벤트 선정 점수가 이 판정을 함께 씁니다.${isSalaryCut(sim) ? ` 급여를 삭감한 상태라 정상 급여 기준 월 이익은 ${formatMoney(Math.round(normalSalaryProfit(sim)))}입니다.` : ''}`,
      },
      {
        label: '고객 확보 비용(CAC) / 생애 가치(LTV)',
        value: `${ue.cac < 1 ? '1만원 미만' : formatMoney(Math.round(ue.cac))} / ${formatMoney(Math.round(ue.ltv))}`,
        how: 'CAC = 마케팅비 ÷ 월 신규 고객, LTV = 고객당 월 이익 ÷ 이탈률. 둘 다 현재 값으로 추정한 값이며 LTV가 CAC의 3배 이상이면 마케팅을 늘려도 이익이 남는다고 봅니다.',
      },
      {
        label: '최근 매출 성장률 / 월 이탈률',
        value: `${pct(growth)} / ${pct(effectiveChurn(sim), 1)}`,
        how: '성장률은 최근 최대 7개월 월 매출의 마지막 ÷ 처음 − 1. 이탈률은 기본 이탈률을 품질·인력 부족으로 보정한 값입니다. 투자 이벤트에서 이 두 값이 조건이 됩니다.',
      },
      {
        label: '인력 가동률 / 사내 업무 자동화',
        value: `${pct(util)} / ${pct(aiAutomated(sim))}`,
        how: `가동률 = 고객 수 ÷ 처리 가능 고객 수. 100%를 넘으면 신규 유입이 줄고 이탈·사기 저하가 생깁니다. 사내 업무 자동화 ${pct(aiAutomated(sim))}는 업종 상한 ${pct(sim.aiShare ?? 0.3)} 안에서만 늘어납니다.`,
      },
      {
        label: '시장 점유',
        value: sim.tam ? `${pct(sim.customers / sim.tam)}` : '해당 없음',
        how: `고객 ${formatNumber(sim.customers)}명 ÷ 겨냥 시장 ${formatNumber(sim.tam ?? 0)}명. 높을수록 신규 유입이 줄어듭니다(최대 85% 감소).`,
      },
    ],
  };
}

/** 결과 화면 안내: 숫자가 어떻게 바뀌었는가 */
export function explainOutcome(game: Game, d: DecisionRecord): Basis {
  const { sim } = game;
  const acquired = Math.round(acquisitionRate(sim));
  const churn = effectiveChurn(sim);
  const pressure = sim.pressure ?? 1;

  return {
    title: '결과 숫자의 가정과 계산 근거',
    note: NOTE,
    rows: [
      {
        label: '결정 비용',
        value: formatMoney(d.cost),
        how: '선택 즉시 현금에서 빠집니다. 투자·보조금 같은 유입은 효과로 따로 더해지며, 투자금은 "현재 월 고정비 × 개월 수"로 계산합니다.',
      },
      {
        label: '결정 직후와 몇 개월 뒤',
        value: `${d.monthsElapsed}개월 경과`,
        how: '결정의 효과를 적용한 뒤 다음 이벤트 전까지 매달 자동 계산하고, 그 끝 시점을 "몇 개월 뒤" 값으로 기록합니다.',
      },
      {
        label: '월 매출 / 월 이익',
        value: `${formatMoney(sim.monthlyRevenue)} / ${formatMoney(Math.round(projectedMonthlyProfit(sim)))}`,
        how: '월 매출 = 고객 수 × 고객당 월 매출. 월 이익 = 매출 − 원가 − 인건비 − 운영비 − 마케팅비 − 이자.',
      },
      {
        label: '월 신규 고객',
        value: `${formatNumber(acquired)}명`,
        how: `기본 유입 × (1 + 마케팅비 ÷ ${MKT_REF}만원) × 평판 계수(0.6~1.4) × 품질 계수(0.6~1.4) × 인력 여유 × 시장 여유. 플랫폼은 고객이 많을수록 유입이 늘어나는 효과가 더해집니다.`,
      },
      {
        label: '월 이탈',
        value: `${pct(churn, 1)}`,
        how: '기본 이탈률 × (1.5 − 품질 ÷ 100) + 인력 과부하 가산. 품질이 높을수록 줄어듭니다.',
      },
      {
        label: '시장 경쟁(매달 누적)',
        value: `이탈 +${(MARKET_CHURN_DRIFT * pressure * 100).toFixed(2)}%p / 유입 −${(MARKET_ACQ_DECAY * pressure * 100).toFixed(2)}% (매달)`,
        how: `시간이 갈수록 경쟁이 커진다는 가정입니다. 수업용 모드는 결정 횟수가 적어 강도를 ${pressure}배로 낮췄습니다.`,
      },
      {
        label: '파산 판정',
        value: `현금 ${BANKRUPT_MONTHS}개월 연속 마이너스 또는 초기 자본의 −${pct(BANKRUPT_CASH_FLOOR_RATIO)} 미만`,
        how: '둘 중 하나라도 해당하면 회사가 문을 닫고 점수에 0.4를 곱합니다.',
      },
    ],
  };
}

/** 최종 보고서 안내: 점수 산식 */
export function explainReport(game: Game): Basis {
  const sc = scoreGame(game);
  const s = game.sim;
  const w = SCORE_WEIGHTS;
  return {
    title: '점수 산식과 가정',
    note: NOTE,
    rows: [
      {
        label: `성장 ${pct(w.growth)}`,
        value: `${sc.parts.growth}점`,
        how: `월 매출 ÷ (초기 자본 × 15%) × 100, 0~100점. 종료 월 매출 ${formatMoney(s.monthlyRevenue)}, 초기 자본 ${formatMoney(s.initialCapital)}.`,
      },
      {
        label: `재무 ${pct(w.finance)}`,
        value: `${sc.parts.finance}점`,
        how: `(순현금 ÷ 초기 자본) × 50 + 25, 흑자면 +15, 지분 희석 1%마다 −0.3. 종료 순현금 ${formatMoney(s.cash - s.debt)}.`,
      },
      { label: `제품 품질 ${pct(w.quality)}`, value: `${sc.parts.quality}점`, how: '종료 시점 품질 점수 그대로.' },
      { label: `팀 사기 ${pct(w.team)}`, value: `${sc.parts.team}점`, how: '종료 시점 사기 점수 그대로.' },
      { label: `평판 ${pct(w.reputation)}`, value: `${sc.parts.reputation}점`, how: '종료 시점 평판 점수 그대로.' },
      {
        label: '합계와 등급',
        value: `${sc.total}점 (${sc.grade})`,
        how: `다섯 항목의 가중 합계. 파산하면 0.4배. 80점 이상 A, 65 이상 B, 50 이상 C, 35 이상 D, 그 아래 F.${sc.bankrupt ? ' 이 회사는 파산해 0.4배가 적용됐습니다.' : ''}`,
      },
    ],
  };
}

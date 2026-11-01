import type { Effects, GameEvent, Outcome } from '../types';
import { gte } from './helpers';

export const EMERGENCY_EVENT_ID = 'x01-emergency';

// 어떤 결과든 "긴급 카드는 한 번만" 표시를 남긴다.
const E = (e: Effects): Effects => ({ ...e, flags: [...(e.flags ?? []), 'emergency-used'] });
const out = (o: Outcome): Outcome => ({ ...o, effects: E(o.effects) });
const plain = (o: Outcome): Outcome => o;

/**
 * 긴급 생존 카드. 런웨이가 1개월 미만이 되면 다음 이벤트 앞에 한 번 열린다.
 * 연차 이벤트 수·개월 배분에는 포함되지 않고, 시간을 흘리지 않고 즉시 적용된다.
 * 효과 수치는 교육용 가정이다.
 */
export const EMERGENCY_EVENT: GameEvent = {
  id: EMERGENCY_EVENT_ID,
  stage: 1,
  order: 99,
  isFallback: true,
  title: '긴급 생존 카드: 한 달 안에 현금이 바닥납니다',
  reason: 'ran-out-of-cash',
  weight: 0,
  situation:
    '{company}의 현금이 지금 속도로는 한 달도 버티지 못합니다. 정상적인 투자 유치나 성장 전략을 논의할 시간은 이미 지났습니다. 지금은 회사를 살리는 데 모든 것을 걸어야 하는 구간이며, 어떤 선택도 누군가에게 큰 희생을 요구합니다. 이 카드는 한 번만 열립니다.',
  discussionPrompts: [
    '이 선택으로 줄어드는 것은 월 고정비인가, 아니면 한 번 들어오는 현금인가? 둘은 런웨이에 어떻게 다르게 작용하는가?',
    '살아남는다면 무엇이 가장 크게 훼손되는가(지분, 팀, 고객, 신뢰)? 회복할 수 있는가?',
    '더 일찍 이 상황을 알아챌 수 있었던 신호는 무엇이었나?',
  ],
  options: [
    {
      id: 'unpaid-founders',
      label: '대표·창업팀 무급여 전환',
      description: '월급 대부분을 포기해 월 고정비를 크게 줄인다. 생활비는 개인 자금으로 버텨야 한다.',
      outcomes: [
        out({
          when: [gte('morale', 55)],
          effects: { salaryPct: -0.6, morale: -8, reputation: 1 },
          text: '팀이 위기를 공유하고 급여를 내려놓았습니다. 고정비는 크게 줄었지만 오래 끌 수 있는 방식은 아닙니다. 급여를 언제 되돌릴지 기준이 없다면 사기가 급격히 떨어집니다.',
          verdict: 'ok',
        }),
        out({
          effects: { salaryPct: -0.6, headcount: -1, morale: -18 },
          text: '사기가 낮은 상태에서 무급여 요구가 나오자 핵심 인력 한 명이 떠났습니다. 고정비는 줄었지만 남은 팀의 신뢰도 크게 흔들렸습니다.',
          verdict: 'weak',
        }),
      ],
    },
    {
      id: 'distress-equity',
      label: '헐값 지분 매각 (긴급 브리지 투자)',
      description: '기존 주주나 엔젤에게 낮은 가치로 지분을 넘기고 서둘러 현금을 받는다.',
      outcomes: [
        out({
          when: [gte('customers', 150), gte('reputation', 45)],
          effects: { cashMonths: 5, dilution: 12, morale: -1 },
          text: '고객과 평판이 있어 비교적 덜 불리한 조건으로 약 5개월치 고정비를 받았습니다. 지분은 넘어갔지만 시간을 벌었습니다.',
          verdict: 'ok',
        }),
        out({
          effects: { cashMonths: 3, dilution: 22, morale: -5 },
          text: '위기 상황을 간파한 투자자가 낮은 가치를 제시했습니다. 약 3개월치 고정비를 받았지만 지분을 크게 넘겨 이후 투자 유치가 어려워졌습니다.',
          verdict: 'weak',
        }),
      ],
    },
    {
      id: 'survival-mode',
      label: '생존 모드: 마케팅 중단과 운영비 최대 절감',
      description: '신규 고객 확보를 멈추고 운영비를 줄여 월 고정비를 바닥까지 낮추고, 쓰지 않는 자산·구독을 정리해 현금을 조금 확보한다.',
      outcomes: [
        out({
          when: [gte('quality', 50)],
          effects: { cashMonths: 2.5, marketingBudget: -100000, overhead: -60, acqBasePct: -0.2, morale: -4 },
          text: '마케팅을 끊고 운영비를 줄여 고정비가 크게 내려갔고, 쓰지 않는 장비·구독을 정리해 현금도 일부 확보했습니다. 신규 유입이 줄었지만 기존 고객이 남아 있어 현금 소진 속도를 늦췄습니다.',
          verdict: 'ok',
        }),
        out({
          effects: { cashMonths: 1.2, marketingBudget: -100000, overhead: -60, acqBasePct: -0.3, customersPct: -0.05, quality: -3, morale: -7 },
          text: '품질이 낮은 상태에서 비용을 줄이자 고객 이탈이 겹쳤습니다. 고정비는 줄고 정리로 약간의 현금이 생겼지만 매출도 함께 줄었습니다.',
          verdict: 'weak',
        }),
      ],
    },
    {
      id: 'family-loan',
      label: '가족·지인 단기 차입',
      description: '개인 관계를 이용해 빠르게 빌린다. 빚이 늘어 매달 이자가 나간다.',
      outcomes: [
        out({
          when: [gte('reputation', 40)],
          effects: { cashMonths: 4, debtMonths: 4, morale: 1 },
          text: '약 4개월치 고정비를 빌려 급한 불을 껐습니다. 이자가 매달 나가므로 고정비는 늘었고, 갚지 못하면 개인 관계에도 상처가 남습니다.',
          verdict: 'ok',
        }),
        out({
          effects: { cashMonths: 2, debtMonths: 2, morale: -2 },
          text: '신뢰가 충분하지 않아 빌릴 수 있는 금액이 작았습니다. 시간은 벌었지만 부채와 이자 부담이 생겼습니다.',
          verdict: 'weak',
        }),
      ],
    },
    {
      id: 'prepay-push',
      label: '기존 고객 선결제 유도 (할인 제공)',
      description: '장기 이용을 조건으로 할인해 주고 이용료를 미리 받는다. 앞으로 받을 돈을 당겨 쓰는 선택이다.',
      outcomes: [
        out({
          when: [gte('customers', 150), gte('quality', 50)],
          effects: { cashMonths: 3.5, arpuPct: -0.1, churnRate: -0.01 },
          text: '만족한 고객이 선결제에 응했습니다. 현금은 들어왔고 이탈도 줄었지만, 할인 때문에 고객당 매출이 낮아졌습니다.',
          verdict: 'ok',
        }),
        out({
          effects: { cashMonths: 1.5, arpuPct: -0.1, reputation: -2 },
          text: '선결제에 응한 고객이 적어 현금은 조금만 들어왔고, 할인만 남았습니다. 돈이 급하다는 신호가 고객에게 알려져 평판이 흔들렸습니다.',
          verdict: 'weak',
        }),
      ],
    },
    {
      id: 'hold-on',
      label: '아무 조치 없이 한 달 더 버틴다',
      description: '구조를 바꾸지 않고 다음 결정까지 기다린다.',
      outcomes: [
        out({
          effects: { morale: -4 },
          text: '아무것도 바꾸지 않았습니다. 현금은 계속 줄고, 팀은 불안을 느끼기 시작했습니다. 이 선택은 다음 결정을 더 어렵게 만듭니다.',
          verdict: 'weak',
        }),
      ],
    },
  ],
};

export const SALARY_EVENT_ID = 'x02-salary-restore';

/**
 * 급여 복원 후속 결정. 급여 삭감(무급여 전환 등)이 6개월 이상 이어지면 다음 이벤트 앞에 최대 두 번 열린다.
 * 긴급 카드와 마찬가지로 연차 이벤트 수(수업용 9개/전체 19개)와 개월 배분에는 포함되지 않고, 시간을 흘리지 않고 즉시 적용된다.
 * 개인 생활비는 회사 현금에서 빼지 않는다. 팀이 떠안은 개인 부담은 salaryCut.burden에 따로 기록한다.
 */
export const SALARY_EVENT: GameEvent = {
  id: SALARY_EVENT_ID,
  stage: 1,
  order: 98,
  isFallback: true,
  title: '급여 복원: 삭감이 길어지고 있습니다',
  reason: 'wrong-team',
  weight: 0,
  situation:
    '{company}의 팀은 {months}개월째 급여를 삭감한 채 일하고 있습니다. 그동안 회사 손익은 버텼지만, 팀원들이 개인적으로 떠안은 부담은 약 {burden}입니다. 지금의 이익에는 이 부담이 빠져 있어 실제보다 좋게 보입니다. 정상 급여를 지급했다면 월 이익은 {normalProfit}입니다.',
  discussionPrompts: [
    '삭감한 급여를 언제, 어떤 조건에서 되돌리겠다고 팀과 약속했는가?',
    '지금 보이는 흑자(또는 적자)는 정상 급여를 지급해도 유지되는가?',
    '팀원이 떠나면 회사가 잃는 것과, 급여를 복원하면 회사가 잃는 것을 비교하면?',
  ],
  options: [
    {
      id: 'restore-full',
      label: '정상 급여로 전액 복원',
      description: '삭감 전 급여로 되돌린다. 월 고정비가 그만큼 늘어난다.',
      outcomes: [
        plain({
          effects: { salaryRestorePct: 1, morale: 8, quality: 1 },
          text: '약속한 대로 급여를 복원하자 팀의 신뢰가 회복되고 사기가 올랐습니다. 월 고정비는 늘었고, 이제 회사 손익이 정상 급여 기준의 진짜 수익성입니다.',
          verdict: 'ok',
        }),
      ],
    },
    {
      id: 'restore-half',
      label: '절반만 단계적으로 복원',
      description: '삭감분의 절반을 돌려주고 나머지는 지표가 개선되면 복원한다고 약속한다.',
      outcomes: [
        plain({
          when: [gte('morale', 45)],
          effects: { salaryRestorePct: 0.5, morale: 3 },
          text: '단계적 복원 일정이 합리적이라고 받아들여졌습니다. 부담을 나누면서도 최소한의 신뢰를 지켰습니다.',
          verdict: 'ok',
        }),
        plain({
          effects: { salaryRestorePct: 0.5, morale: -2, headcount: -1 },
          text: '이미 사기가 낮은 상태여서 절반 복원으로는 부족했고, 핵심 인력 한 명이 떠났습니다.',
          verdict: 'weak',
        }),
      ],
    },
    {
      id: 'equity-bonus',
      label: '급여는 유지하고 스톡옵션·성과급을 약속',
      description: '현금 대신 지분과 성과급으로 보상한다. 회사 현금은 아끼지만 지분이 희석된다.',
      outcomes: [
        plain({
          when: [gte('reputation', 40), gte('morale', 45)],
          effects: { dilution: 3, morale: 4 },
          text: '회사의 가능성을 믿는 팀원들이 스톡옵션을 받아들였습니다. 현금은 지켰지만 약속한 성과가 나오지 않으면 불만이 더 커집니다.',
          verdict: 'ok',
        }),
        plain({
          effects: { dilution: 3, morale: -3 },
          text: '불확실한 지분 약속만으로는 생활비 압박을 달래지 못했습니다. 지분만 희석되고 팀의 불만은 남았습니다.',
          verdict: 'weak',
        }),
      ],
    },
    {
      id: 'reduce-hours',
      label: '근무 시간 축소(주 4일)와 겸업 허용',
      description: '급여는 그대로 두되 근무를 줄여 팀이 다른 수입을 구할 수 있게 한다. 처리 능력과 품질이 떨어진다.',
      outcomes: [
        plain({
          effects: { capPerHeadPct: -0.2, morale: 4, quality: -2 },
          text: '팀의 생활 부담은 줄었지만 일 처리 속도와 품질이 떨어졌습니다. 회사의 현금 지출은 그대로입니다.',
          verdict: 'ok',
        }),
      ],
    },
    {
      id: 'keep-cut',
      label: '삭감 유지',
      description: '당분간 지금처럼 간다. 회사 현금은 지키지만 팀의 부담과 이탈 위험이 계속 커진다.',
      outcomes: [
        plain({
          when: [gte('morale', 60)],
          effects: { morale: -8 },
          text: '팀이 한 번 더 참아 주었지만 사기가 크게 떨어졌습니다. 다음에도 같은 선택을 하면 이탈이 현실이 됩니다.',
          verdict: 'weak',
        }),
        plain({
          effects: { morale: -14, headcount: -1, quality: -3 },
          text: '더는 버티기 어렵다는 팀원이 회사를 떠났습니다. 남은 팀의 업무가 늘고 품질이 떨어졌습니다.',
          verdict: 'weak',
        }),
      ],
    },
  ],
};

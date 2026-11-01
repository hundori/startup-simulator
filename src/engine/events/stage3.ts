import type { GameEvent } from '../types';
import { CRUNCH, DEFICIT, NOT_SURPLUS, SURPLUS, gte, lte } from './helpers';

// 3년 차 — 확장. 효과 수치는 교육용 가정이다.
export const STAGE3_EVENTS: GameEvent[] = [
  {
    id: 'e11-series-a',
    stage: 3,
    order: 11,
    title: '투자 제안과 조건',
    reason: 'no-financing',
    weight: 3,
    boosts: [{ when: [lte('runway', 10)], add: 2 }],
    situation:
      '{company}의 성장세를 본 투자자가 투자의향서(텀시트)를 보내왔습니다. 금액은 크지만 조건에는 이사회 의석, 청산 우선권, 높은 성장 목표가 포함되어 있습니다. 다른 투자자도 관심은 있지만 아직 답이 없습니다.',
    discussionPrompts: [
      '지금 투자가 필요한가, 아니면 받을 수 있어서 받으려는가?',
      '조건 중 협상할 수 있는 것과 없는 것은 무엇인가?',
      '지분이 희석된 뒤 팀의 동기는 어떻게 유지할 것인가?',
    ],
    options: [
      {
        id: 'accept-terms',
        label: '제시된 조건 그대로 수락',
        description: '법무 검토만 거치고 가장 빨리 자금을 확보한다.',
        cost: 300,
        outcomes: [
          {
            when: [gte('customers', 300), gte('quality', 50), gte('growth6', 0.2), lte('churnRate', 0.07)],
            effects: { cashMonths: 24, dilution: 25, morale: 4, flags: ['seriesA', 'aggressive-target'] },
            text: '대규모 자금을 확보했지만 높은 성장 목표가 걸려 있어 이후 의사결정의 자유가 줄었습니다.',
            verdict: 'ok',
          },
          {
            when: [gte('customers', 200)],
            effects: { cashMonths: 14, dilution: 28, morale: -2, flags: ['seriesA', 'milestone-tranche'] },
            text: '성장률·이탈률이 기준에 못 미쳐 목표를 달성하면 나눠서 입금하는 조건부 투자가 됐습니다. 금액은 줄고 희석은 컸습니다.',
            verdict: 'weak',
          },
          {
            effects: { cashMonths: 10, dilution: 32, morale: -3, flags: ['seriesA', 'aggressive-target'] },
            text: '지표 대비 높은 목표가 설정되어 이후 압박이 커졌고, 지분 희석도 컸습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'negotiate-terms',
        label: '조건 협상 (희석·이사회·목표 조정)',
        description: '전문가 도움을 받아 협상한다. 시간과 비용이 든다.',
        cost: 400,
        outcomes: [
          {
            when: [gte('reputation', 50), gte('customers', 200), gte('growth6', 0.1)],
            effects: { cashMonths: 20, dilution: 18, morale: 3, reputation: 3, acqBasePct: -0.04, flags: ['seriesA'] },
            text: '협상으로 희석과 목표를 낮추고도 투자를 받았습니다. 다만 협상에 매달린 두 달 동안 영업과 제품 개선이 느려졌습니다.',
            verdict: 'strong',
          },
          {
            effects: { cashMonths: 10, dilution: 20, morale: 1, flags: ['seriesA-small'] },
            text: '협상 끝에 금액은 줄었지만 조건이 더 합리적이었습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'bootstrap',
        label: '투자를 거절하고 수익으로 성장',
        description: '지분을 지키고 속도는 자체 현금흐름에 맞춘다.',
        cost: 0,
        outcomes: [
          {
            when: [gte('monthlyProfit', 1)],
            effects: { morale: 5, reputation: 2, flags: ['bootstrap'] },
            text: '수익이 나는 구조라 투자 없이도 성장 속도를 조절할 수 있었습니다.',
            verdict: 'strong',
          },
          {
            effects: { morale: -4, flags: ['bootstrap'] },
            text: '수익이 나지 않는 상태에서 투자를 거절해 앞으로의 선택지가 줄었습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'compare',
        label: '다른 투자자와 비교한 뒤 결정',
        description: '추가 제안을 기다리며 조건을 비교한다. 그동안 현금은 줄어든다.',
        cost: 100,
        outcomes: [
          {
            when: [lte('runway', 4)],
            effects: { cashMonths: 6, dilution: 22, morale: -4, flags: ['seriesA-late'] },
            text: '시간을 끄는 사이 현금이 줄어 협상력을 잃었고, 나쁜 조건으로 마무리했습니다.',
            verdict: 'weak',
          },
          {
            effects: { cashMonths: 18, dilution: 16, reputation: 1, flags: ['seriesA'] },
            text: '경쟁 제안 덕분에 더 나은 조건으로 투자를 받았습니다. 여유 있는 현금이 협상의 힘이 되었습니다.',
            verdict: 'strong',
          },
        ],
      },
    ],
  },
  {
    id: 'e12-expansion',
    stage: 3,
    order: 12,
    title: '해외·신규 지역 확장',
    reason: 'geo-expansion',
    weight: 2,
    situation:
      '{company}가 지금까지 공략해 온 {target} 시장의 성장이 둔화되면서 팀은 해외 또는 새로운 지역 진출을 검토하고 있습니다. 현지 시장은 크지만 언어, 규제, 결제 방식, 고객 습관이 달라 우리가 아는 방식이 그대로 통하지 않을 수 있습니다.',
    contextByType: {
      saas: '일본·동남아 시장이 후보입니다.',
      commerce: '해외 직구 플랫폼 입점과 현지 물류가 쟁점입니다.',
      offline: '서울 다른 상권과 지방 도시에 2호점을 낼지 검토합니다.',
      content: '영어·일본어 번역과 현지 파트너가 쟁점입니다.',
      platform: '인접 지역에서 공급자를 새로 모집해야 합니다.',
    },
    discussionPrompts: [
      '현지 고객이 우리 제품을 지금 방식 그대로 원한다는 증거가 있는가?',
      '현지 인력·파트너 없이 진출할 수 있는가?',
      '실패해도 본사 사업이 유지될 만큼의 여유가 있는가?',
    ],
    options: [
      {
        id: 'full-launch',
        label: '현지 법인 설립 + 전담팀 파견',
        description: '법인과 팀을 만들어 본격적으로 진출한다. 고정비가 크게 늘어난다.',
        cost: 3000,
        minHeadcount: 5,
        outcomes: [
          {
            when: [gte('customers', 300)],
            effects: { customersPct: 0.25, overhead: 250, morale: 2, reputation: 3, quality: -2, flags: ['expanded'] },
            text: '현지 팀이 빠르게 자리를 잡아 새 고객을 확보했지만 고정비가 크게 늘었습니다.',
            verdict: 'ok',
          },
          {
            effects: { customersPct: 0.05, overhead: 250, morale: -4, flags: ['expanded'] },
            text: '본진이 약한 상태에서 확장하자 어느 쪽에도 집중하지 못했습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'partner-pilot',
        label: '현지 파트너와 소규모 시범 진출',
        description: '파트너를 통해 작게 시작하고 반응을 확인한다.',
        cost: 800,
        minHeadcount: 3,
        outcomes: [
          {
            effects: { customersPct: 0.08, acqBasePct: 0.05, reputation: 1, flags: ['partner-expansion'] },
            text: '작은 실험으로 현지 반응을 확인했고 실패 비용을 낮췄습니다.',
            verdict: 'strong',
          },
        ],
      },
      {
        id: 'domestic-deepen',
        label: '국내 시장 깊이 파기 (지역·고객층 확대)',
        description: '익숙한 시장에서 점유율을 넓힌다.',
        cost: 400,
        outcomes: [
          {
            effects: { customersPct: 0.07, acqBasePct: 0.05, quality: 2, flags: ['domestic-deepen'] },
            text: '익숙한 시장에서 점유율을 조금씩 넓혔습니다. 성장 폭은 크지 않습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'stabilize',
        label: '확장을 보류하고 사업 안정화',
        description: '수익 구조와 팀 안정에 집중한다.',
        cost: 0,
        outcomes: [
          {
            effects: { morale: 3, quality: 3 },
            text: '확장 대신 수익 구조와 팀 안정에 집중했습니다. 기회비용은 있지만 위험을 줄였습니다.',
            verdict: 'ok',
          },
        ],
      },
    ],
  },
  {
    id: 'e13-model-shift',
    stage: 3,
    order: 13,
    title: '수익모델·가격 개편',
    reason: 'no-business-model',
    weight: 2,
    boosts: [{ when: [lte('monthlyProfit', 0)], add: 1.5 }],
    situation:
      '{company}의 고객 수는 늘었는데 이익이 따라오지 않습니다. 가격 구조를 다시 짜야 한다는 의견이 나옵니다. 가격을 올리면 이탈이 걱정되고, 올리지 않으면 성장할수록 적자가 커질 수 있습니다.',
    discussionPrompts: [
      '고객 한 명당 이익(단위 경제)은 양수인가?',
      '가격을 올렸을 때 떠날 고객과 남을 고객은 누구인가?',
      '요금 체계를 단순하게 둘 것인가, 세분화할 것인가?',
    ],
    variants: [
      {
        when: SURPLUS,
        title: '수익모델·가격 개편: 이익을 더 키울 구조인가',
        situation:
          '{company}는 고객이 늘면서 월 {profit}의 이익도 내고 있습니다. 지금 가격 개편은 위기 대응이 아니라 수익 구조를 더 키울 수 있는지의 문제입니다. 현재 돈을 내는 쪽은 {payer}이고, 과금 기준은 "{billing}"입니다. 단가를 올리면 성장이 둔해지고, 올리지 않으면 이익 증가가 고객 증가에 묶입니다.',
        discussionPrompts: [
          '지금의 이익은 정상 급여·정상 비용을 반영한 것인가?',
          '{payer}가 내는 돈에서 올릴 수 있는 부분과 건드리면 안 되는 부분은?',
          '이익이 나는 지금 가격을 바꾸는 것이 유리한가, 불리한가?',
        ],
      },
      {
        when: [lte('finStatus', 1)],
        situation:
          '{company}의 고객 수는 늘었는데 이익이 따라오지 않습니다(월 이익 {profit}). 가격 구조를 다시 짜야 한다는 의견이 나옵니다. 현재 돈을 내는 쪽은 {payer}이고, 과금 기준은 "{billing}"입니다. 가격을 올리면 이탈이 걱정되고, 올리지 않으면 성장할수록 적자가 커질 수 있습니다.',
      },
    ],
    options: [
      {
        id: 'raise-price',
        notForModel: ['commission'],
        label: '가격 인상 + 기존 {payer} 유예 기간',
        description: '신규 {payer}부터 올리고 기존 {payer}에게는 3개월 유예를 준다. 과금 기준: {billing}.',
        cost: 100,
        outcomes: [
          {
            when: [gte('quality', 55), gte('reputation', 45)],
            effects: { arpuPct: 0.15, churnRate: 0.005, customersPct: -0.03, flags: ['price-up'] },
            text: '품질에 대한 신뢰 덕분에 이탈이 작았고 수익성이 개선되었습니다.',
            verdict: 'strong',
          },
          {
            effects: { arpuPct: 0.12, churnRate: 0.02, customersPct: -0.1, reputation: -3, flags: ['price-up'] },
            text: '품질이 가격을 정당화하지 못해 이탈이 늘었습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'raise-take-rate',
        onlyForModel: ['commission'],
        label: '수수료율 인상 + 기존 공급자 유예 기간',
        description:
          '신규 거래부터 수수료율을 올리고 기존 {supplier}에게는 3개월 유예를 준다. 수수료를 내는 쪽은 {payer}이며, 이용자가 내는 금액은 그대로다.',
        cost: 100,
        outcomes: [
          {
            when: [gte('quality', 55), gte('reputation', 45)],
            effects: { arpuPct: 0.15, churnRate: 0.005, customersPct: -0.03, flags: ['price-up'] },
            text: '공급자가 플랫폼의 고객 유입 효과를 인정해 수수료 인상을 받아들였습니다. 이용자 쪽 이탈은 작았고 거래당 수익이 올랐습니다.',
            verdict: 'strong',
          },
          {
            effects: { arpuPct: 0.12, churnRate: 0.02, customersPct: -0.1, reputation: -3, flags: ['price-up'] },
            text: '공급자가 유입 효과에 비해 수수료가 높다고 느껴 일부가 다른 채널로 옮겼습니다. 공급이 줄면서 이용자 경험도 나빠졌습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'tiering',
        notForModel: ['commission'],
        label: '요금제 세분화 (기본·프리미엄)',
        description: '{payer}가 자신에게 맞는 가격대를 고르게 한다. 무엇에 대해 더 내는지(기능·한도·노출)를 명확히 나눈다.',
        cost: 400,
        outcomes: [
          {
            effects: { arpuPct: 0.1, customersPct: 0.02, quality: 1, flags: ['tiered'] },
            text: '{payer}가 자신에게 맞는 가격을 고를 수 있게 하자 평균 단가가 올랐습니다.',
            verdict: 'strong',
          },
        ],
      },
      {
        id: 'tier-commission',
        onlyForModel: ['commission'],
        label: '거래액·노출 등급별 수수료와 유료 노출 상품',
        description:
          '{supplier}가 거래액 구간에 따라 다른 수수료율을 내고, 상단 노출을 원하는 공급자는 노출 상품에 대해 추가로 지불한다. 이용자는 지금처럼 무료로 이용한다.',
        cost: 400,
        outcomes: [
          {
            effects: { arpuPct: 0.1, customersPct: 0.02, quality: 1, flags: ['tiered'] },
            text: '거래가 많은 공급자는 수수료 부담이 낮아지고, 노출이 필요한 공급자는 노출 상품을 샀습니다. 이용자 경험을 해치지 않으면서 거래당 평균 수익이 올랐습니다.',
            verdict: 'strong',
          },
        ],
      },
      {
        id: 'cost-down',
        label: '원가 구조 개선 (공급처·자동화)',
        description: '가격은 두고 원가를 낮춘다.',
        cost: 500,
        outcomes: [
          {
            effects: { cogsRatio: -0.06, quality: 1, flags: ['cost-down'] },
            text: '매출은 그대로지만 이익률이 개선되었습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'keep-model',
        label: '현행 유지 — 성장으로 규모의 경제를 기대',
        description: '구조는 그대로 두고 고객 수를 더 늘린다.',
        cost: 0,
        outcomes: [
          {
            when: [gte('monthlyProfit', 0)],
            effects: { morale: 1 },
            text: '이미 수익 구조가 괜찮아 큰 변화가 필요하지 않았습니다.',
            verdict: 'ok',
          },
          {
            effects: { morale: -3, flags: ['no-model'] },
            text: '성장할수록 적자가 쌓이는 구조를 바꾸지 못했습니다.',
            verdict: 'weak',
          },
        ],
      },
    ],
  },
  {
    id: 'e14-growth-vs-profit',
    stage: 3,
    order: 14,
    title: '성장과 수익성 사이',
    reason: 'ran-out-of-cash',
    weight: 2.5,
    boosts: [
      { when: [lte('runway', 9)], add: 3 },
      { when: [lte('monthlyProfit', 0)], add: 1 },
      { when: SURPLUS, add: -0.5 },
    ],
    situation:
      '{company}의 현금이 줄어드는 속도가 빨라졌습니다. 조언자들은 성장 지표를 요구하지만 현금 흐름은 더 위험해졌습니다. 앞으로 1년 동안 성장과 생존 중 무엇에 무게를 둘지 정해야 합니다.',
    discussionPrompts: [
      '줄이면 아픈 비용과 줄여도 티가 안 나는 비용은 무엇인가?',
      '성장 속도를 늦추면 투자 유치에 불리한가?',
      '현금이 6개월 미만일 때 어떤 결정을 해야 하는가?',
    ],
    variants: [
      {
        when: SURPLUS,
        title: '잉여 현금 재투자와 성장 속도',
        situation:
          '{company}는 지금 월 {profit}의 이익을 내고 있고, 현금은 {cash}입니다. 최근 현금도 늘어났습니다. 쟁점은 생존이 아니라 잉여 현금을 어디에 얼마나 재투자해 성장 속도를 높일지입니다. 속도를 높이면 이익이 줄 수 있고, 너무 아끼면 시장의 기회를 놓칠 수 있습니다.',
        discussionPrompts: [
          '재투자한 돈이 이익을 얼마나 키우는지 어떻게 확인할 것인가?',
          '지금의 이익은 정상 급여·정상 비용을 반영한 것인가?',
          '현금을 쌓아 두는 것과 성장에 쓰는 것 중 투자 유치에 더 유리한 것은?',
        ],
      },
      {
        when: DEFICIT,
        situation:
          '{company}는 매달 {loss}씩 적자가 나고 있고, 현금은 {cash}(약 {runway}개월분)입니다. 조언자들은 성장 지표를 요구하지만 적자가 이어지면 선택지가 줄어듭니다. 앞으로 1년 동안 성장과 생존 중 무엇에 무게를 둘지 정해야 합니다.',
      },
      {
        when: CRUNCH,
        situation:
          '{company}의 현금 {cash}은 매달 {loss}의 적자로 약 {runway}개월 안에 바닥납니다. 조언자들은 성장 지표를 요구하지만 지금은 생존이 먼저입니다. 앞으로 1년 동안 성장과 생존 중 무엇에 무게를 둘지 정해야 합니다.',
      },
    ],
    options: [
      {
        id: 'push-growth',
        label: '적극 성장 (마케팅·채용 확대)',
        description: '지금 더 쓰고 빠르게 키운다.',
        cost: 1000,
        outcomes: [
          {
            when: [gte('runway', 12)],
            effects: { marketingBudget: 300, headcount: 1, customersPct: 0.15, morale: 2, flags: ['growth-push'] },
            text: '여유 있는 현금 덕분에 성장 투자가 효과를 냈습니다.',
            verdict: 'strong',
          },
          {
            effects: { marketingBudget: 300, headcount: 1, customersPct: 0.1, morale: -3, flags: ['growth-push'] },
            text: '현금이 짧은 상태에서 지출을 늘려 위험이 커졌습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'profit-first',
        showWhen: NOT_SURPLUS,
        label: '수익성 우선 (적자 사업·채널 정리)',
        description: '성장률을 낮추더라도 현금 흐름부터 바로잡는다.',
        cost: 200,
        outcomes: [
          {
            when: [lte('runway', 9)],
            effects: { marketingBudget: -100, overhead: -40, quality: 2, customersPct: -0.05, morale: -2, flags: ['profit-first'] },
            text: '성장률은 줄었지만 현금 흐름이 눈에 띄게 개선되었고, 위험한 구간을 벗어났습니다.',
            verdict: 'strong',
          },
          {
            effects: { marketingBudget: -100, overhead: -40, quality: 2, customersPct: -0.05, morale: -2, flags: ['profit-first'] },
            text: '현금 여유가 있는 상태에서 성장을 줄여 기회를 일부 놓쳤습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'balanced',
        label: '균형 전략 (핵심 채널만 유지, 신규 채용 동결)',
        description: '성장 속도를 유지하되 비용 증가를 막는다.',
        cost: 0,
        outcomes: [
          {
            effects: { marketingBudget: -40, morale: -1, quality: 1, flags: ['balanced'] },
            text: '성장 속도를 크게 해치지 않으면서 비용을 통제했습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'bridge',
        showWhen: NOT_SURPLUS,
        label: '추가 자금 조달 (브릿지 대출 + 투자 협의)',
        description: '이자 부담을 지고 시간을 번다.',
        cost: 0,
        outcomes: [
          {
            effects: { cash: 4000, debt: 4000, morale: 1 },
            text: '이자 부담이 늘었지만 단기 위험은 넘겼습니다. 구조적인 문제는 그대로 남았습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'reinvest-surplus',
        showWhen: SURPLUS,
        label: '잉여 현금을 제품·품질 개선에 재투자 (채용 없이)',
        description: '이익으로 쌓인 현금의 일부를 품질·기능 개선과 고객 경험에 쓴다. 일회성 지출이라 월 고정비는 늘지 않는다.',
        cost: 600,
        outcomes: [
          {
            when: [gte('quality', 40)],
            effects: { quality: 5, reputation: 2, acqBasePct: 0.05, flags: ['reinvest'] },
            text: '쌓인 이익을 품질에 쓰자 이탈이 줄고 평판이 올랐습니다. 월 고정비를 늘리지 않아 이익 구조는 유지됐습니다.',
            verdict: 'strong',
          },
          {
            effects: { quality: 3, reputation: 1, flags: ['reinvest'] },
            text: '개선 효과는 있었지만 근본 문제를 풀지 못해 기대보다 작았습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'save-buffer',
        showWhen: SURPLUS,
        label: '현재 속도를 유지하며 현금을 비상 자금으로 쌓는다',
        description: '새 지출을 늘리지 않고 이익을 현금으로 쌓아 둔다. 안전하지만 성장 기회를 일부 놓칠 수 있다.',
        cost: 0,
        outcomes: [
          {
            effects: { morale: 1, acqBasePct: -0.03, flags: ['buffer'] },
            text: '현금 여유는 커졌지만 경쟁사가 먼저 시장을 넓혔습니다. 안정성과 속도 사이에서 안정성을 택한 결정입니다.',
            verdict: 'ok',
          },
        ],
      },
    ],
  },
  {
    id: 'e15-strategic-offer',
    stage: 3,
    order: 15,
    title: '인수·전략적 투자 제안',
    reason: 'bad-timing',
    weight: 2,
    situation:
      '{company}에 대기업 한 곳이 인수 또는 전략적 투자를 제안했습니다. 가격은 지금까지 투자한 금액을 회수할 정도이지만 "더 큰 성공"이라고 말하기는 어렵습니다. 팀은 계속 해 보자는 의견과 적절한 시점이라는 의견으로 나뉩니다.',
    discussionPrompts: [
      '계속 가면 3년 뒤 이 제안보다 나은 결과가 나올 가능성은 어느 정도인가?',
      '팀원과 고객에게 이 선택은 어떤 의미인가?',
      '성공의 기준은 매출, 지분 가치, 사명 중 무엇인가?',
    ],
    options: [
      {
        id: 'strategic-invest',
        label: '경영권을 유지하는 조건으로 지분 일부 매각',
        description: '전략적 투자를 받고 대기업의 채널과 신뢰를 활용한다.',
        cost: 0,
        outcomes: [
          {
            effects: { cash: 7000, dilution: 20, quality: 2, reputation: 3, flags: ['strategic'] },
            text: '대기업의 채널과 신뢰를 활용할 수 있게 되었지만 의사결정에 그쪽 의견이 반영됩니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'stay-independent',
        label: '독립 경영을 유지하며 제안 거절',
        description: '지금의 방향대로 계속 간다.',
        cost: 0,
        outcomes: [
          {
            when: [gte('monthlyProfit', 1)],
            effects: { morale: 6, reputation: 2, flags: ['independent'] },
            text: '수익 구조가 있어 독립 경영의 자신감이 생겼고, 팀의 동기도 높아졌습니다.',
            verdict: 'strong',
          },
          {
            effects: { morale: -2, flags: ['independent'] },
            text: '거절한 뒤 현금 흐름이 약해 팀의 불안이 커졌습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'partnership',
        label: '제안을 활용한 조건 협상 (제휴·공동 마케팅)',
        description: '인수 대신 장기 제휴로 협력 구조를 만든다.',
        cost: 200,
        outcomes: [
          {
            effects: { customersPct: 0.08, acqBasePct: 0.08, reputation: 3, flags: ['partnership'] },
            text: '인수 대신 장기 제휴로 협력 구조를 만들어 새로운 고객 유입이 생겼습니다.',
            verdict: 'strong',
          },
        ],
      },
      {
        id: 'wait',
        label: '결정을 보류하고 시장 반응을 본다',
        description: '시간을 두고 판단한다.',
        cost: 0,
        outcomes: [
          {
            effects: { morale: -1, flags: ['wait'] },
            text: '결정을 미루는 사이 제안 조건이 약해졌고, 팀 안에서도 불확실성이 커졌습니다.',
            verdict: 'weak',
          },
        ],
      },
    ],
  },
  {
    id: 'e12b-ai-shift',
    stage: 3,
    order: 12.5,
    title: 'AI 비용·규제 변화',
    reason: 'legal',
    weight: 2,
    boosts: [{ when: [gte('aiLevel', 0.3)], add: 3 }],
    situation:
      '{company}이 쓰는 AI 서비스의 가격이 오르고, 고객 데이터를 AI로 처리하는 방식에 대한 개인정보·저작권 규제 지침이 강화됐습니다. 경쟁사는 AI로 원가를 낮춰 가격을 내리고 있습니다. 우리 고객 정보가 어디서 어떻게 쓰이는지 점검해야 합니다.',
    discussionPrompts: [
      'AI가 실수하거나 정보가 새면 책임은 누가 지고 어떻게 되돌리는가?',
      '한 공급사에 의존하면 가격이 오를 때 무엇을 할 수 있는가?',
      'AI로 줄인 비용을 고객 신뢰와 맞바꾸고 있지는 않은가?',
    ],
    options: [
      {
        id: 'audit',
        label: '데이터 정책을 정비하고 사람 검수를 유지',
        description: '약관·개인정보 처리 방침을 고치고 중요한 판단은 사람이 확인한다. 비용과 시간이 든다.',
        cost: 300,
        outcomes: [
          {
            when: [gte('aiLevel', 0.3)],
            effects: { reputation: 3, overhead: 20, quality: 1, flags: ['ai-governance'] },
            text: 'AI를 많이 쓰는 회사로서 문제가 커지기 전에 기준과 책임 절차를 세웠습니다. 고객 신뢰가 올랐고 월 운영비가 조금 늘었습니다.',
            verdict: 'strong',
          },
          {
            effects: { reputation: 1, overhead: 20, flags: ['ai-governance'] },
            text: 'AI를 많이 쓰지 않아 급한 문제는 아니었지만, 미리 기준을 세워 둔 것이 신뢰에 도움이 됐습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'ai-deeper',
        label: 'AI를 더 넓게 도입해 비용을 줄인다',
        description: '규제는 나중에 대응하고 자동화 비율을 높여 원가와 인건비 부담을 낮춘다.',
        cost: 200,
        outcomes: [
          {
            when: [gte('aiLevel', 0.5)],
            effects: { aiLevel: 0.2, quality: -4, reputation: -6, churnRate: 0.01, flags: ['ai-overreach'] },
            text: '이미 많이 맡긴 상태에서 더 넓히자 오류와 정보 처리 문제가 불거졌습니다. 비용은 줄었지만 고객 신뢰를 크게 잃었습니다.',
            verdict: 'weak',
          },
          {
            effects: { aiLevel: 0.25, overhead: -10, quality: -1, flags: ['ai-deeper'] },
            text: '아직 여유가 있는 범위에서 자동화를 늘려 비용을 아꼈습니다. 다만 사람이 확인하는 절차가 얇아졌습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'multi-vendor',
        label: '공급사를 나누고 핵심 기능은 직접 갖춘다',
        description: '여러 AI 공급사를 병행하고 중요한 부분은 자체 개발한다. 비용이 늘지만 가격 인상과 장애에 덜 흔들린다.',
        cost: 500,
        outcomes: [
          {
            effects: { overhead: 50, aiLevel: 0.1, quality: 2, reputation: 2, flags: ['multi-vendor'] },
            text: '공급사 한 곳에 묶여 있지 않아 가격 인상에도 협상력이 생겼습니다. 대신 개발·운영 부담이 늘었습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'no-action',
        label: '당장은 대응하지 않고 지켜본다',
        description: '지침이 확정될 때까지 현재 방식을 유지한다. 비용은 들지 않는다.',
        cost: 0,
        outcomes: [
          {
            when: [gte('aiLevel', 0.3)],
            effects: { reputation: -5, churnRate: 0.01, quality: -2, flags: ['ai-risk-ignored'] },
            text: 'AI를 이미 많이 쓰고 있었는데 대응이 늦어 고객 불만과 정보 처리 논란이 생겼습니다. 규제는 기다려 주지 않았습니다.',
            verdict: 'weak',
          },
          {
            effects: { morale: 0 },
            text: 'AI 의존이 낮아 직접적인 영향은 적었습니다. 다만 경쟁사의 AI 원가 절감은 그대로 지켜봐야 했습니다.',
            verdict: 'ok',
          },
        ],
      },
    ],
  },
];

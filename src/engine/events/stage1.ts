import type { GameEvent } from '../types';
import { gte, lte, lt } from './helpers';

// 1년 차 — 생존. 효과 수치는 교육용 가정이다.
export const STAGE1_EVENTS: GameEvent[] = [
  {
    id: 'e01-market-need',
    stage: 1,
    order: 1,
    title: '첫 고객 반응: 정말 돈을 낼 사람이 있나',
    reason: 'no-market-need',
    weight: 3,
    situation:
      '{company}의 첫 버전이 나온 지 석 달이 지났습니다. 사용자 인터뷰 20건에서 "아이디어는 좋다"는 반응은 많았지만, 실제로 돈을 내겠다는 사람은 3명뿐입니다. 팀 안에서는 "기능이 부족해서 그렇다"는 의견과 "애초에 해결하려는 문제가 약한 게 아니냐"는 의견이 갈립니다.',
    contextByType: {
      saas: '무료 체험 가입자의 70%가 첫 주 이후 다시 로그인하지 않았습니다.',
      commerce: '첫 구매 후 재구매한 고객이 거의 없고, 후기에는 "예쁘지만 꼭 필요하진 않다"는 말이 많습니다.',
      offline: '방문 고객은 늘었지만 객단가가 낮고, 평일 낮 시간대는 거의 비어 있습니다.',
      content: '무료 콘텐츠 조회수는 나오는데 유료 전환은 거의 없습니다.',
      platform: '공급자는 모였지만 이용자 거래가 일어나지 않고, 이용자가 와도 찾을 공급자가 부족합니다.',
    },
    discussionPrompts: [
      '우리 고객이 이 문제 때문에 지금 실제로 쓰는 돈과 시간은 얼마인가?',
      '"좋다"는 말과 "돈을 낸다"는 행동의 차이를 어떻게 구분할 것인가?',
      '더 만들기 전에 가장 싸게 검증할 수 있는 가설은 무엇인가?',
    ],
    options: [
      {
        id: 'interview',
        label: '고객 30명 심층 인터뷰 + 가격 실험',
        description:
          '기능 개발을 2주 멈추고, 관심을 보인 사람과 거절한 사람을 직접 만나 지불 의사와 가격대를 확인한다.',
        cost: 300,
        outcomes: [
          {
            effects: { quality: 4, reputation: 2, customersPct: 0.05, arpuPct: 0.1, morale: 3, flags: ['validated'] },
            text: '인터뷰에서 "진짜 쓰는 상황"이 두 가지로 좁혀졌습니다. 가격 실험에서는 가장 급한 고객층이 기존 가격의 1.1배도 받아들였고, 핵심 고객 정의가 선명해졌습니다.',
            verdict: 'strong',
          },
        ],
      },
      {
        id: 'more-features',
        label: '기능 추가 개발에 집중',
        description: '요청이 많았던 기능 5개를 3개월 안에 추가한다.',
        cost: 800,
        outcomes: [
          {
            effects: { quality: 6, morale: -6, customersPct: 0.02, flags: ['feature-bloat'] },
            text: '기능은 늘었지만 지불 의사는 거의 달라지지 않았습니다. 개발에 몰입한 팀은 지쳤고 "시장이 원하는가"라는 질문은 그대로 남았습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'free-trial',
        label: '무료 체험을 넓혀 사용자부터 확보',
        description: '체험 기간과 무료 구간을 늘려 사용자 수를 먼저 키우고 유료 전환은 나중에 푼다.',
        cost: 500,
        outcomes: [
          {
            effects: { customersPct: 0.3, arpuPct: -0.1, churnRate: 0.01, reputation: 2, flags: ['free-heavy'] },
            text: '가입자 수는 눈에 띄게 늘었지만 유료로 넘어오는 비율은 낮았고, 무료 사용자를 응대하는 데 시간이 들었습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'narrow-target',
        label: '타깃 고객을 좁혀 다시 정의 (피벗)',
        description: '지금 가장 관심이 높은 하나의 고객군에 맞춰 서비스 설명과 메시지를 바꾼다.',
        cost: 0,
        outcomes: [
          {
            when: [gte('morale', 50)],
            effects: { customersPct: -0.15, acqBasePct: 0.15, churnRate: -0.01, quality: 2, reputation: 2, morale: 3, flags: ['pivoted'] },
            text: '기존 고객 일부는 떠났지만 남은 고객의 반응이 좋아졌습니다. 팀이 같은 방향을 보게 되어 실행 속도가 올랐습니다.',
            verdict: 'strong',
          },
          {
            effects: { customersPct: -0.2, acqBasePct: 0.05, morale: -5, flags: ['pivoted'] },
            text: '방향 전환을 두고 팀 안에서 의견이 갈리면서 실행이 느려졌습니다. 고객 정의는 좁아졌지만 확신은 부족합니다.',
            verdict: 'ok',
          },
        ],
      },
    ],
  },
  {
    id: 'e02-runway',
    stage: 1,
    order: 2,
    title: '런웨이 경고: 투자냐 비용 절감이냐',
    reason: 'ran-out-of-cash',
    weight: 2,
    boosts: [{ when: [lte('runway', 8)], add: 3 }],
    situation:
      '지금 속도로 쓰면 {company}의 현금은 몇 달 안에 바닥납니다. 투자자 두세 곳이 관심을 보였지만 "지표를 더 보고 싶다"고 말합니다. 비용을 줄이자니 성장이 멈출 것 같습니다.',
    discussionPrompts: [
      '우리가 투자를 받아야 하는 이유는 "성장"인가 "생존"인가?',
      '비용 절감은 어느 선부터 "살을 깎는" 수준인가?',
      '돈을 받는 대가(지분·이자·시간)를 팀이 감당할 수 있는가?',
    ],
    options: [
      {
        id: 'seed',
        label: '엔젤·시드 투자 유치 시도',
        description: '투자 자료(IR)를 만들어 투자자 미팅을 진행한다. 준비 비용과 시간이 든다.',
        cost: 200,
        outcomes: [
          {
            when: [gte('customers', 150), gte('quality', 50)],
            effects: { cash: 7000, dilution: 15, reputation: 3, morale: 6, flags: ['seed'] },
            text: '지표가 투자자의 기준을 넘어 시드 라운드를 마쳤습니다. 대신 지분 일부를 내주고 분기별 보고 의무가 생겼습니다.',
            verdict: 'strong',
          },
          {
            when: [gte('customers', 60)],
            effects: { cash: 3000, dilution: 12, morale: 2, flags: ['seed-small'] },
            text: '기대보다 작은 금액으로 브릿지 투자를 받았습니다. 숨통은 트였지만 여유는 크지 않습니다.',
            verdict: 'ok',
          },
          {
            effects: { morale: -6, flags: ['fundraise-failed'] },
            text: '투자 설명을 여러 번 했지만 "아직 이르다"는 답만 돌아왔고, 준비하는 동안 제품은 멈춰 있었습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'grant',
        label: '정부 지원사업·보조금 신청',
        description: '지분을 내주지 않는 대신 서류 준비와 사용처 제한, 보고 의무가 따른다.',
        cost: 100,
        outcomes: [
          {
            when: [gte('quality', 45)],
            effects: { cash: 2500, morale: -1, overhead: 20, flags: ['grant'] },
            text: '심사를 통과해 지원금을 받았습니다. 지분은 그대로지만 보고서 작성과 사용처 제한으로 행정 부담이 늘었습니다.',
            verdict: 'ok',
          },
          {
            effects: { cash: 1000, morale: -2, flags: ['grant'] },
            text: '서류 완성도가 낮아 소액만 선정되었습니다. 준비에 쓴 시간에 비해 얻은 것이 적습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'cut-costs',
        label: '비용 구조 재편 (마케팅·인력 감축)',
        description: '마케팅비를 줄이고 인력 1명을 줄여 월 고정비를 낮춘다.',
        cost: 0,
        outcomes: [
          {
            effects: { marketingBudget: -60, headcount: -1, morale: -10, customersPct: -0.03, flags: ['cut-costs'] },
            text: '월 고정비가 줄어 런웨이가 길어졌지만, 팀 분위기가 가라앉았고 신규 유입도 둔해졌습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'loan',
        label: '단기 사업자 대출',
        description: '지분은 지키되 매달 이자를 낸다. 상환 압박이 다음 해로 이어진다.',
        cost: 0,
        outcomes: [
          {
            effects: { cash: 3000, debt: 3000, morale: 3, flags: ['debt'] },
            text: '당장의 현금은 확보했지만 매달 이자가 나가고, 다음 해에도 상환 부담이 이어집니다.',
            verdict: 'ok',
          },
        ],
      },
    ],
  },
  {
    id: 'e03-cofounder',
    stage: 1,
    order: 3,
    title: '공동창업자 갈등',
    reason: 'disharmony',
    weight: 2.5,
    applicableWhen: [gte('headcount', 2)],
    fallbackId: 'e03f-solo-burnout',
    boosts: [{ when: [lte('morale', 55)], add: 2 }],
    situation:
      '{company}의 공동창업자 한 명이 "이 속도로는 못 하겠다"며 팀을 떠날지 고민하고 있습니다. 역할과 지분을 처음 정할 때 문서로 남기지 않았고, 최근 의사결정이 한두 사람에게 몰렸다는 불만이 쌓였습니다.',
    discussionPrompts: [
      '우리 팀은 역할·지분·의사결정 규칙을 문서로 합의했는가?',
      '한 사람이 빠지면 무엇이 멈추는가?',
      '갈등의 원인은 사람인가, 구조인가?',
    ],
    options: [
      {
        id: 'redesign-roles',
        label: '역할·지분 재설계 + 베스팅 도입',
        description: '역할 문서를 만들고, 일정 기간 일해야 지분이 확정되는 베스팅 규칙을 정한다.',
        cost: 0,
        outcomes: [
          {
            effects: { morale: 10, quality: 1, flags: ['vesting'] },
            text: '대화는 불편했지만 역할 문서와 베스팅 규칙이 생겼습니다. 이후 의사결정 기준이 분명해져 팀이 안정됐습니다.',
            verdict: 'strong',
          },
        ],
      },
      {
        id: 'mentor',
        label: '외부 멘토에게 중재 요청',
        description: '경험 있는 멘토가 제3자로서 갈등을 정리하도록 돕는다.',
        cost: 150,
        outcomes: [
          {
            effects: { morale: 6, flags: ['mentor'] },
            text: '멘토가 갈등을 정리해 주었고 한 달에 한 번 점검 회의를 하기로 했습니다. 다만 구조적 합의 없이 분위기만 풀린 부분이 남았습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'replace',
        label: '이탈을 받아들이고 대체 인력을 구한다',
        description: '떠날 사람의 업무를 넘겨받을 사람을 서둘러 찾는다.',
        cost: 700,
        outcomes: [
          {
            effects: { quality: -4, morale: -4, flags: ['cofounder-left'] },
            text: '핵심 노하우가 빠져나가 한동안 품질이 흔들렸습니다. 새 인력이 적응하기까지 시간이 걸렸습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'ignore',
        label: '문제를 덮고 일정을 밀어붙인다',
        description: '지금은 출시가 먼저라며 갈등 이야기를 미룬다.',
        cost: 0,
        outcomes: [
          {
            effects: { morale: -12, quality: -3, headcount: -1, flags: ['cofounder-left'] },
            text: '갈등은 풀리지 않았고 한 달 뒤 공동창업자가 팀을 떠났습니다. 남은 팀원의 업무가 늘었습니다.',
            verdict: 'weak',
          },
        ],
      },
    ],
  },
  {
    id: 'e03f-solo-burnout',
    stage: 1,
    order: 3,
    title: '혼자 다 하는 대표의 한계',
    reason: 'burnout',
    weight: 0,
    isFallback: true,
    situation:
      '{company}는 사실상 대표 한 명이 개발, 영업, 고객 응대를 모두 맡고 있습니다. 최근 석 달 동안 쉰 날이 거의 없고, 작은 실수가 반복되며 고객 불만이 늘고 있습니다.',
    discussionPrompts: [
      '대표가 하는 일 중 "대표만 할 수 있는 일"은 무엇인가?',
      '첫 채용·외주·자동화 중 무엇이 가장 싸게 병목을 푸는가?',
      '대표의 번아웃은 개인 문제인가, 회사의 위험 요인인가?',
    ],
    options: [
      {
        id: 'first-hire',
        label: '첫 정규 직원 채용',
        description: '업무를 나눌 사람을 뽑는다. 매달 인건비가 생긴다.',
        cost: 400,
        outcomes: [
          {
            effects: { headcount: 1, morale: 6, quality: 3, flags: ['first-hire'] },
            text: '업무를 나눌 사람이 생겨 고객 응대 속도가 회복되었습니다. 대신 매달 인건비 부담이 생겼습니다.',
            verdict: 'strong',
          },
        ],
      },
      {
        id: 'outsource',
        label: '프리랜서·외주로 병목 업무 분산',
        description: '정해진 업무만 외부에 맡긴다.',
        cost: 250,
        outcomes: [
          {
            effects: { quality: 2, morale: 3, overhead: 60, flags: ['outsourced'] },
            text: '급한 일은 해결됐지만 외주 품질이 들쭉날쭉했고, 업무를 설명하는 데 시간이 들었습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'narrow-scope',
        label: '업무 범위를 줄이고 핵심 고객에만 집중',
        description: '응대 시간과 서비스 범위를 줄여 대표의 여유를 만든다.',
        cost: 0,
        outcomes: [
          {
            effects: { customersPct: -0.08, morale: 5, quality: 2, flags: ['focus'] },
            text: '범위를 줄이자 대표의 여유가 생겼지만, 일부 고객은 불만을 안고 떠났습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'push-through',
        label: '버티며 계속한다',
        description: '지금은 쉴 때가 아니라고 판단한다.',
        cost: 0,
        outcomes: [
          {
            effects: { morale: -10, quality: -5, reputation: -3 },
            text: '몇 주 뒤 중요한 납기를 놓쳤고, 대표가 건강 문제로 일주일을 쉬어야 했습니다.',
            verdict: 'weak',
          },
        ],
      },
    ],
  },
  {
    id: 'e04-competitor',
    stage: 1,
    order: 4,
    title: '대형 경쟁사의 가격 공세',
    reason: 'outcompeted',
    weight: 2,
    boosts: [{ when: [gte('customers', 200)], add: 1 }],
    situation:
      '대기업이 {company}와 비슷한 서비스를 더 낮은 가격에 내놓았습니다. 고객 몇 명이 "그쪽은 더 싸던데요"라며 문의를 해 왔습니다. 우리는 자원이 적고, 상대는 마케팅 예산이 우리의 수십 배입니다.',
    contextByType: {
      saas: '상대는 첫 6개월 무료 프로모션을 하고 있습니다.',
      commerce: '상대는 무료배송과 상시 할인으로 가격 비교 순위 최상단에 올랐습니다.',
      offline: '바로 옆 블록에 대형 프랜차이즈가 문을 열었습니다.',
      content: '대형 플랫폼이 비슷한 콘텐츠를 구독 서비스에 포함시켰습니다.',
      platform: '대형 플랫폼이 수수료를 면제하며 우리 공급자에게 입점을 제안하고 있습니다.',
    },
    discussionPrompts: [
      '우리가 이길 수 없는 경쟁과 이길 수 있는 경쟁은 무엇인가?',
      '고객이 우리를 선택하는 "가격 이외의 이유"는 무엇인가?',
      '가격을 내리면 고객과 경쟁사에 어떤 신호를 보내는가?',
    ],
    options: [
      {
        id: 'price-match',
        label: '가격을 내려 맞대응',
        description: '가격을 20% 내려 이탈을 막는다.',
        cost: 300,
        outcomes: [
          {
            effects: { arpuPct: -0.2, churnRate: -0.005, customersPct: 0.05, reputation: -2, flags: ['price-war'] },
            text: '단기 이탈은 막았지만 마진이 얇아졌고, 가격으로는 상대를 이길 수 없다는 사실이 분명해졌습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'niche',
        label: '니치 특화·차별화에 집중',
        description: '"우리 고객"만을 위한 기능과 서비스를 강화한다.',
        cost: 500,
        outcomes: [
          {
            when: [gte('quality', 50)],
            effects: { quality: 5, reputation: 5, arpuPct: 0.05, acqBasePct: -0.05, churnRate: -0.01, flags: ['niche'] },
            text: '핵심 고객 맞춤 서비스를 강화해 충성도가 높아졌습니다. 시장은 좁아졌지만 이탈이 줄었습니다.',
            verdict: 'strong',
          },
          {
            effects: { quality: 2, reputation: 1, flags: ['niche'] },
            text: '방향은 맞았지만 기본 품질이 부족해 차별화가 체감되지 않았습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'lock-in',
        label: '기존 고객 락인 프로그램 (장기 계약·멤버십)',
        description: '선결제 할인으로 기존 고객을 묶어 둔다.',
        cost: 350,
        outcomes: [
          {
            effects: { churnRate: -0.015, cash: 300, arpuPct: -0.05, morale: 1, flags: ['lock-in'] },
            text: '선결제 할인으로 일부 현금이 들어왔고 이탈이 줄었지만, 신규 고객에게는 매력이 크지 않았습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'ally',
        label: '경쟁사와 제휴·납품 협상',
        description: '맞서는 대신 보완 관계를 제안한다.',
        cost: 0,
        outcomes: [
          {
            when: [gte('reputation', 45)],
            effects: { customersPct: 0.1, acqBasePct: 0.1, reputation: 3, quality: -1, flags: ['alliance'] },
            text: '경쟁사가 우리를 보완재로 인정해 제휴를 맺었습니다. 다만 협상력이 약해 조건은 상대에게 유리합니다.',
            verdict: 'ok',
          },
          {
            effects: { morale: -3, reputation: -1 },
            text: '협상 자리에서 인정받지 못했고 우리 약점만 상대에게 드러났습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'experience',
        label: '체험형 공간·팝업으로 차별화',
        description: '고객이 직접 보고 경험하는 접점을 만든다. (매장·제품 판매 업종 한정)',
        cost: 400,
        onlyFor: ['offline', 'commerce'],
        outcomes: [
          {
            effects: { reputation: 4, customersPct: 0.05, quality: 1, flags: ['experience'] },
            text: '직접 체험한 고객의 후기가 늘어 가격 이외의 선택 이유가 생겼습니다.',
            verdict: 'ok',
          },
        ],
      },
    ],
  },
  {
    id: 'e05-ops-incident',
    stage: 1,
    order: 5,
    title: '품질·운영 사고',
    reason: 'user-unfriendly',
    weight: 2,
    boosts: [
      { when: [gte('utilization', 1)], add: 3 },
      { when: [lt('quality', 45)], add: 2 },
    ],
    situation:
      '예상하지 못한 운영 사고가 터졌습니다. 고객 불만이 한꺼번에 몰려들었고, SNS에 부정적인 글이 올라오기 시작했습니다.',
    contextByType: {
      saas: '서버 장애로 서비스가 6시간 중단되었고 일부 데이터 반영이 지연되었습니다.',
      commerce: '출고된 제품 일부에서 불량이 발견되어 환불·교환 요청이 몰리고 있습니다.',
      offline: '식자재 보관 문제로 일부 고객이 복통을 호소했다는 글이 올라왔습니다.',
      content: '콘텐츠에 출처 표기가 빠졌다는 지적이 나와 저작권 문의가 들어왔습니다.',
      platform: '거래 사기 신고가 접수되어 이용자 사이에 불안이 퍼지고 있습니다.',
    },
    discussionPrompts: [
      '지금 가장 먼저 지켜야 할 것은 고객, 평판, 현금 중 무엇인가?',
      '공개 사과와 보상의 범위를 누가 어떻게 정하는가?',
      '같은 사고를 막기 위해 어떤 프로세스를 바꿀 것인가?',
    ],
    options: [
      {
        id: 'apologize',
        label: '즉시 공개 사과 + 전액 보상 + 원인 공개',
        description: '빠르게 인정하고 보상하며 무슨 일이 있었는지 공개한다.',
        cost: 600,
        outcomes: [
          {
            effects: { reputation: 4, quality: 3, customersPct: -0.02, morale: -2, flags: ['transparent'] },
            text: '빠르고 솔직한 대응에 일부 고객은 오히려 신뢰를 보냈습니다. 비용은 들었지만 평판 하락이 빠르게 멈췄습니다.',
            verdict: 'strong',
          },
        ],
      },
      {
        id: 'prevent',
        label: '재발 방지 프로세스·품질 체계 구축',
        description: '점검표와 모니터링을 도입한다. 당장의 불만 대응은 뒤로 밀린다.',
        cost: 800,
        minHeadcount: 2,
        outcomes: [
          {
            effects: { quality: 8, morale: 2, overhead: 30, flags: ['qa'] },
            text: '점검 체크리스트와 모니터링이 자리 잡아 장기적으로 품질이 안정됐습니다. 다만 당장의 불만 대응이 느렸다는 지적이 남았습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'support-surge',
        label: '고객센터 임시 확대 (외주 상담 인력)',
        description: '상담 대기 시간을 줄이는 데 집중한다.',
        cost: 350,
        outcomes: [
          {
            effects: { reputation: 1, morale: 2, customersPct: -0.01, overhead: 20 },
            text: '대기 시간은 줄었지만 외주 상담원이 원인을 정확히 설명하지 못해 불만이 일부 남았습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'minimal',
        label: '개별 문의에만 최소 대응',
        description: '큰 소동이 되지 않도록 조용히 처리한다.',
        cost: 0,
        outcomes: [
          {
            effects: { reputation: -6, customersPct: -0.05, churnRate: 0.01, morale: -3 },
            text: '문제는 잠잠해졌다가 한 달 뒤 후기 형태로 다시 퍼졌습니다. 신뢰 회복에 더 오래 걸리게 되었습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'sla',
        label: '상태 페이지·보상 정책(SLA) 공개',
        description: '장애 현황을 실시간으로 공개하고 보상 기준을 약속한다. (앱·플랫폼 한정)',
        cost: 300,
        onlyFor: ['saas', 'platform'],
        outcomes: [
          {
            effects: { reputation: 4, quality: 3, overhead: 10, flags: ['sla'] },
            text: '투명한 공개가 오히려 신뢰를 높였고, 기업 고객이 계약 근거로 삼기 쉬워졌습니다.',
            verdict: 'strong',
          },
        ],
      },
    ],
  },
];

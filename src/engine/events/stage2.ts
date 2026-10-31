import type { GameEvent } from '../types';
import { gte, lte } from './helpers';

// 2년 차 — 성장. 효과 수치는 교육용 가정이다.
export const STAGE2_EVENTS: GameEvent[] = [
  {
    id: 'e06-big-partner',
    stage: 2,
    order: 6,
    appliesToCustomer: ['b2b'],
    fallbackId: 'e06f-big-channel',
    title: '큰 파트너의 제안',
    reason: 'ignored-customers',
    weight: 2,
    situation:
      '{company}에 규모가 큰 파트너가 대량 계약을 제안했습니다. 매출이 단번에 늘어날 기회지만, 조건은 맞춤 개발과 낮은 단가, 6개월 독점입니다. 기존 고객은 "요즘 우리 요청이 뒤로 밀린다"고 말하기 시작했습니다.',
    contextByType: {
      saas: '대기업이 전사 도입을 전제로 맞춤 기능을 요구합니다.',
      commerce: '대형 유통사가 독점 입점과 대량 발주를 제안했습니다.',
      offline: '대형 호텔 체인이 납품·입점을 제안했습니다.',
      content: '기업 교육 담당자가 사내 전용 콘텐츠를 요청했습니다.',
      platform: '대형 공급자가 독점 입점을 대가로 수수료 인하를 요구합니다.',
    },
    discussionPrompts: [
      '이 계약이 매출의 몇 %가 되고, 없어지면 어떻게 되는가?',
      '맞춤 개발은 우리 제품 로드맵과 같은 방향인가?',
      '기존 고객에게 이 선택은 어떻게 보일까?',
    ],
    options: [
      {
        id: 'accept-all',
        label: '조건 그대로 수락 (전담 인력 투입)',
        description: '계약금을 받고 맞춤 개발에 인력을 붙인다.',
        cost: 500,
        minHeadcount: 3,
        outcomes: [
          {
            effects: { cash: 1500, customersPct: 0.15, arpuPct: -0.05, quality: -4, morale: -5, reputation: -2, flags: ['key-account', 'dependency'] },
            text: '계약금이 들어오고 매출이 단번에 늘었지만 개발 인력이 맞춤 요구에 묶여 기존 고객 대응이 느려졌습니다. 이 파트너가 매출의 큰 비중을 차지하게 되었습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'negotiate',
        label: '조건 협상: 독점 제외·표준 제품 중심 계약',
        description: '맞춤 개발 범위를 줄이고 독점 조항을 뺀다.',
        cost: 200,
        outcomes: [
          {
            when: [gte('reputation', 40)],
            effects: { cash: 800, customersPct: 0.1, reputation: 4, quality: 1, flags: ['key-account'] },
            text: '표준 제품 기반으로 합의해 개발 부담을 줄이면서 큰 고객을 얻었습니다. 협상 과정에서 우리 제품에 대한 이해도 높아졌습니다.',
            verdict: 'strong',
          },
          {
            effects: { cash: 300, customersPct: 0.04, reputation: 1, flags: ['key-account'] },
            text: '협상력이 부족해 규모를 작게 합의했습니다. 부담은 적지만 기대했던 성장은 아닙니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'decline',
        label: '정중히 거절하고 기존 고객 경험에 집중',
        description: '대형 매출 대신 이탈을 줄이고 품질을 올리는 쪽을 택한다.',
        cost: 0,
        outcomes: [
          {
            effects: { reputation: 3, churnRate: -0.01, quality: 3, morale: 3, flags: ['customer-focus'] },
            text: '기회를 놓친 아쉬움은 있었지만 기존 고객 만족도가 올라 이탈이 줄었습니다. 대형 매출 없이도 성장 경로를 만들어야 합니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'separate-team',
        label: '수락하되 별도 팀·외주로 분리 대응',
        description: '맞춤 개발은 별도 인력이 맡고 기존 제품 팀은 그대로 둔다.',
        cost: 900,
        outcomes: [
          {
            effects: { cash: 1200, customersPct: 0.12, overhead: 80, morale: -1, flags: ['key-account'] },
            text: '맞춤 개발은 별도 인력이 맡아 기존 제품은 영향이 적었습니다. 고정 비용이 늘었지만 새 수익원을 얻었습니다.',
            verdict: 'ok',
          },
        ],
      },
    ],
  },
  {
    id: 'e06f-big-channel',
    stage: 2,
    order: 6,
    isFallback: true,
    title: '대형 채널의 제휴 제안',
    reason: 'poor-marketing',
    weight: 0,
    situation:
      '{target}가 많이 이용하는 대형 채널(인기 커뮤니티·앱·유통 플랫폼)이 {company}에 제휴를 제안했습니다. 메인 노출을 약속하지만 6개월 독점, 수수료 인상, 이용 데이터 공유가 조건입니다. 지금 팀은 갑자기 늘 문의를 받을 준비가 되어 있지 않습니다.',
    contextByType: {
      saas: '앱 마켓 상단 노출과 번들 할인 조건입니다.',
      commerce: '대형 쇼핑 플랫폼이 기획전과 독점 입점을 제안했습니다.',
      offline: '지역 배달·예약 앱이 상단 노출과 수수료 인상을 함께 제안했습니다.',
      content: '대형 구독 플랫폼이 번들 입점을 제안했습니다.',
      platform: '대형 포털이 연동과 광고 지면을 제안했습니다.',
    },
    discussionPrompts: [
      '이 채널이 없어지면 우리 고객의 몇 %가 사라지는가?',
      '{target}가 우리를 "브랜드"로 기억할까, "그 채널의 한 입점사"로 기억할까?',
      '수수료를 낸 뒤에도 고객 한 명당 남는 돈이 있는가?',
    ],
    options: [
      {
        id: 'accept-all',
        label: '조건 그대로 수락',
        description: '독점과 수수료 인상을 받아들이고 노출을 확보한다.',
        cost: 300,
        outcomes: [
          {
            effects: { customersPct: 0.25, arpuPct: -0.08, acqBasePct: -0.1, reputation: 2, morale: -2, flags: ['dependency'] },
            text: '노출이 크게 늘어 고객이 빠르게 늘었지만 수수료로 고객당 남는 돈이 줄었습니다. 직접 유입 채널은 키우지 못해 이 채널에 대한 의존이 커졌습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'negotiate',
        label: '독점 제외·기간 단축으로 협상',
        description: '3개월 시범 운영과 독점 제외를 조건으로 역제안한다. 시간과 협상력이 필요하다.',
        cost: 150,
        outcomes: [
          {
            when: [gte('reputation', 40)],
            effects: { customersPct: 0.12, arpuPct: -0.03, reputation: 3, quality: 1 },
            text: '우리 지표가 협상력이 되어 시범 운영으로 합의했습니다. 노출 효과는 작지만 의존도와 수수료 부담은 낮게 유지했습니다.',
            verdict: 'strong',
          },
          {
            effects: { customersPct: 0.04, morale: -2 },
            text: '협상력이 부족해 조건이 거의 바뀌지 않았고, 협상하는 동안 제안한 쪽의 관심도 식었습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'own-channel',
        label: '거절하고 직접 만든 커뮤니티·추천에 집중',
        description: '{target}와 직접 만나는 채널(커뮤니티·추천 보상)에 예산을 쓴다.',
        cost: 200,
        outcomes: [
          {
            effects: { customersPct: 0.05, churnRate: -0.008, reputation: 3, acqBasePct: 0.05, flags: ['owned-channel'] },
            text: '성장은 느리지만 직접 유입이 쌓이고 고객 이탈이 줄었습니다. 대형 노출을 놓친 아쉬움은 남습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'ignore',
        label: '검토만 하고 답을 미룬다',
        description: '지금은 제품이 먼저라며 결정을 미룬다.',
        cost: 0,
        outcomes: [
          {
            effects: { reputation: -1, morale: -1 },
            text: '답을 미루는 사이 제안은 경쟁사에게 돌아갔습니다. 잃은 것은 없지만 얻은 것도 없습니다.',
            verdict: 'weak',
          },
        ],
      },
    ],
  },
  {
    id: 'e07-hiring',
    stage: 2,
    order: 7,
    title: '성장통: 채용과 조직',
    reason: 'wrong-team',
    weight: 2,
    boosts: [
      { when: [gte('utilization', 0.9)], add: 3 },
      { when: [lte('headcount', 2)], add: 1 },
    ],
    situation:
      '고객이 늘면서 {company}의 업무가 한계에 가까워졌습니다. 지금 인원으로는 응대와 개발을 동시에 감당하기 어렵습니다. 사람을 뽑을지, AI 에이전트에게 맡길 수 있는 일부터 맡길지 정해야 합니다.',
    contextByType: {
      saas: '이 업종은 문의 응대·문서·테스트 같은 업무의 약 60%까지 AI가 대신할 수 있다고 가정합니다(수업용 가정).',
      commerce: '이 업종은 상담·상품 등록·광고 업무의 약 35%까지 AI가 대신할 수 있다고 가정합니다. 소싱·포장·배송은 사람이 합니다.',
      offline: '이 업종은 예약·문의 응대 정도인 약 15%만 AI가 대신할 수 있다고 가정합니다. 서비스 제공은 사람이 합니다.',
      content: '이 업종은 초안·편집·운영 보조의 약 50%까지 AI가 대신할 수 있다고 가정합니다. 기획과 신뢰는 사람이 만듭니다.',
      platform: '이 업종은 문의·검수·추천의 약 45%까지 AI가 대신할 수 있다고 가정합니다. 입점사 영업과 분쟁 조정은 사람이 합니다.',
    },
    discussionPrompts: [
      '지금 부족한 것은 "사람 수"인가 "특정 역량"인가?',
      '우리 업무 중 AI가 사람보다 낫거나 같게 할 수 있는 것은 몇 %이고, 반드시 사람이 해야 하는 일은 무엇인가?',
      'AI가 실수했을 때 책임지는 사람과 되돌리는 절차가 있는가?',
    ],
    options: [
      {
        id: 'hire-two',
        label: '핵심 직무 2명 채용',
        description: '병목이 큰 두 직무에 경력 인력을 뽑는다. 월 인건비가 크게 늘어난다.',
        cost: 800,
        outcomes: [
          {
            when: [gte('utilization', 0.8)],
            effects: { headcount: 2, morale: 4, quality: 4, flags: ['hired'] },
            text: '숙련 인력이 합류해 병목이 풀리고 품질이 올랐습니다. 월 인건비가 크게 늘어 런웨이는 짧아졌습니다.',
            verdict: 'strong',
          },
          {
            effects: { headcount: 2, morale: 1, quality: 1, flags: ['hired'] },
            text: '아직 업무량이 한계에 이르지 않은 상태에서 채용해 인건비 부담만 먼저 커졌습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'hire-and-automate',
        label: '1명 채용 + AI 에이전트를 단순·반복 업무에 도입',
        description: '핵심 사람 1명을 뽑고, 반복 문의·문서 같은 일부터 AI에게 맡긴다. 도입 비용과 월 이용료가 든다.',
        cost: 500,
        outcomes: [
          {
            when: [gte('aiShare', 0.3)],
            effects: { headcount: 1, quality: 3, aiLevel: 0.3, overhead: 40, morale: 3, flags: ['hired', 'automation'] },
            text: '사람은 판단이 필요한 일에, AI는 반복 업무에 쓰면서 같은 인원으로 처리할 수 있는 고객 수가 늘었습니다. AI 이용료로 월 고정비가 조금 늘었습니다.',
            verdict: 'strong',
          },
          {
            effects: { headcount: 1, quality: 2, aiLevel: 0.1, overhead: 30, morale: 1, flags: ['hired', 'automation'] },
            text: '이 업종은 AI가 맡을 수 있는 일이 적어 도입 효과가 작았습니다. 채용한 1명이 실제 병목을 풀었습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'ai-first',
        label: 'AI 에이전트를 먼저 전면 도입하고 채용은 보류',
        description: '고객 응대·반복 업무를 AI 에이전트 중심으로 바꾼다. 사람을 늘리지 않아 인건비는 그대로지만 도입 비용·월 이용료와 품질 관리 부담이 생긴다.',
        cost: 400,
        outcomes: [
          {
            when: [gte('aiShare', 0.5), gte('quality', 50)],
            effects: { aiLevel: 0.7, overhead: 100, quality: 1, morale: -2, churnRate: 0.004, flags: ['ai-first'] },
            text: 'AI가 응대와 반복 업무 대부분을 맡아 같은 인원으로 훨씬 많은 고객을 받을 수 있게 됐습니다. 다만 복잡한 문의에서 오답이 나와 일부 고객이 이탈했고, 팀은 검수 업무가 늘었습니다.',
            verdict: 'strong',
          },
          {
            when: [gte('aiShare', 0.3)],
            effects: { aiLevel: 0.5, overhead: 80, quality: -3, reputation: -2, morale: -3, flags: ['ai-first'] },
            text: '일부 업무는 줄었지만 품질 기준이 흔들렸고, AI 답변에 불만을 느낀 고객이 늘었습니다. 사람이 마지막에 확인하는 절차가 부족했습니다.',
            verdict: 'ok',
          },
          {
            effects: { aiLevel: 0.3, overhead: 70, quality: -6, reputation: -5, morale: -4, churnRate: 0.01, flags: ['ai-first'] },
            text: '이 업종의 핵심 업무는 사람이 해야 하는데 AI에 맡기는 범위가 너무 넓었습니다. 서비스 품질이 눈에 띄게 떨어지고 평판이 나빠졌습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'freelance',
        label: '프리랜서·인턴 활용',
        description: '필요한 만큼만 단기로 쓴다.',
        cost: 200,
        outcomes: [
          {
            effects: { quality: 1, morale: -1, overhead: 40, capPerHeadPct: 0.05 },
            text: '비용은 가벼웠지만 업무 인수인계에 시간이 들었고 책임 소재가 모호해졌습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'endure',
        label: '현 인원으로 버틴다',
        description: '당분간 채용 없이 일정을 조정한다.',
        cost: 0,
        outcomes: [
          {
            when: [lte('utilization', 1)],
            effects: { morale: -2, quality: -1 },
            text: '아직은 버틸 수 있었지만 여유가 없습니다. 다음 성장 구간에서는 같은 문제가 더 크게 나타날 것입니다.',
            verdict: 'ok',
          },
          {
            effects: { morale: -8, quality: -4, churnRate: 0.01 },
            text: '과부하가 이어지며 핵심 직원이 이직을 고민하기 시작했고 응대 품질이 떨어졌습니다.',
            verdict: 'weak',
          },
        ],
      },
    ],
  },
  {
    id: 'e08-channel-cac',
    stage: 2,
    order: 8,
    title: '마케팅 채널 확대와 고객 획득 비용',
    reason: 'poor-marketing',
    weight: 2,
    situation:
      '{company:은/는} 지금까지 지인 추천과 소셜 미디어로 {target} 고객을 얻었습니다. 광고를 늘리면 고객이 빠르게 늘 것 같지만, 신규 고객 한 명을 얻는 비용이 슬금슬금 오르고 있습니다.',
    discussionPrompts: [
      '우리의 고객 획득 비용(CAC)과 고객이 평생 내는 돈(LTV)은 각각 얼마인가?',
      '광고를 끊어도 오는 고객은 몇 %인가?',
      '어느 채널이 "규모"를, 어느 채널이 "효율"을 주는가?',
    ],
    options: [
      {
        id: 'paid-ads',
        label: '유료 광고 대폭 확대',
        description: '월 마케팅비를 크게 올려 유입을 단기간에 늘린다.',
        cost: 600,
        outcomes: [
          {
            when: [gte('quality', 55)],
            effects: { marketingBudget: 400, customersPct: 0.1, acqBasePct: 0.1, reputation: -1, flags: ['paid-growth'] },
            text: '품질이 받쳐줘서 유입된 고객이 남았습니다. 다만 월 마케팅비가 크게 늘었습니다.',
            verdict: 'ok',
          },
          {
            effects: { marketingBudget: 400, customersPct: 0.12, churnRate: 0.02, reputation: -3, flags: ['paid-growth'] },
            text: '유입은 늘었지만 첫 경험이 만족스럽지 않아 빠르게 이탈했고, 광고비만 쌓였습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'referral',
        label: '추천·커뮤니티 중심 성장 (레퍼럴 프로그램)',
        description: '기존 고객이 새 고객을 데려오면 보상을 준다.',
        cost: 300,
        outcomes: [
          {
            effects: { marketingBudget: 100, acqBasePct: 0.15, reputation: 3, churnRate: -0.005, flags: ['referral'] },
            text: '초대 보상으로 기존 고객이 신규 고객을 데려왔고, 이렇게 온 고객은 이탈도 적었습니다. 성장 속도는 광고보다 느립니다.',
            verdict: 'strong',
          },
        ],
      },
      {
        id: 'content-marketing',
        label: '제휴·콘텐츠 마케팅 (블로그·영상)',
        description: '검색과 콘텐츠로 꾸준히 유입을 쌓는다. 효과까지 시간이 걸린다.',
        cost: 400,
        outcomes: [
          {
            effects: { marketingBudget: 150, acqBasePct: 0.12, reputation: 2, flags: ['content-marketing'] },
            text: '콘텐츠가 쌓이며 검색 유입이 늘었지만 효과가 나오기까지 시간이 걸립니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'product-first',
        label: '마케팅을 줄이고 제품 개선에 집중',
        description: '신규 유입보다 품질과 유지에 투자한다.',
        cost: 0,
        outcomes: [
          {
            effects: { marketingBudget: -80, quality: 6, acqBasePct: -0.1, morale: 2 },
            text: '비용은 줄고 품질은 올랐지만 신규 유입이 눈에 띄게 줄었습니다.',
            verdict: 'ok',
          },
        ],
      },
    ],
  },
  {
    id: 'e09-focus',
    stage: 2,
    order: 9,
    title: '신제품 확장 vs 핵심 집중',
    reason: 'lost-focus',
    weight: 2,
    situation:
      '고객 몇 곳이 {company}에 새로운 기능과 서비스를 요청하고 있습니다. 팀은 "옆 시장으로 넓히면 기회가 더 크다"고 말하지만, 핵심 제품의 개선 요청도 쌓여 있습니다.',
    discussionPrompts: [
      '지금 핵심 제품은 "충분히 좋다"고 말할 수 있는가?',
      '새 사업이 실패하면 잃는 것은 무엇인가?',
      '하지 않기로 결정해야 할 일은 무엇인가?',
    ],
    options: [
      {
        id: 'diversify',
        label: '신제품·신사업 동시 진행',
        description: '새 라인을 별도로 만들고 핵심 제품도 계속 개선한다.',
        cost: 1200,
        minHeadcount: 4,
        outcomes: [
          {
            effects: { customersPct: 0.08, quality: -6, morale: -5, marketingBudget: 100, flags: ['diversified'] },
            text: '새 라인이 일부 매출을 만들었지만 핵심 제품 개선이 늦어지고 팀 집중력이 흩어졌습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'deepen-core',
        label: '핵심 제품 깊이 파기 (로드맵 정리)',
        description: '해야 할 일을 절반으로 줄이고 핵심 고객 문제부터 푼다.',
        cost: 400,
        outcomes: [
          {
            effects: { quality: 7, churnRate: -0.01, reputation: 3, morale: 3, flags: ['focus'] },
            text: '단기 성장은 평범했지만 이탈이 줄고 고객 평가가 좋아졌습니다.',
            verdict: 'strong',
          },
        ],
      },
      {
        id: 'mvp-test',
        label: '소규모 실험(MVP)으로 새 시장 검증',
        description: '작은 팀이 짧게 시험해 보고 신호를 확인한다.',
        cost: 300,
        outcomes: [
          {
            when: [gte('headcount', 3)],
            effects: { customersPct: 0.03, quality: -1, morale: 2, flags: ['experiment'] },
            text: '작게 시험해 보니 수요 신호가 일부 확인되었습니다. 본격 투자 전에 판단할 근거가 생겼습니다.',
            verdict: 'ok',
          },
          {
            effects: { quality: -3, morale: -3, flags: ['experiment'] },
            text: '인력이 부족해 핵심 업무와 새 실험이 서로 발목을 잡았습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'keep-status',
        label: '현상 유지, 요청은 기록만 한다',
        description: '지금 하던 대로 가고 요청 사항은 쌓아 둔다.',
        cost: 0,
        outcomes: [
          {
            effects: { reputation: -2, churnRate: 0.005 },
            text: '특별한 일은 없었지만 고객은 자신의 요청이 반영되지 않는다고 느꼈습니다.',
            verdict: 'ok',
          },
        ],
      },
    ],
  },
  {
    id: 'e10-platform-risk',
    stage: 2,
    order: 10,
    title: '외부 플랫폼 정책·규제 변화',
    reason: 'legal',
    weight: 2,
    appliesTo: ['saas', 'commerce', 'content', 'platform'],
    fallbackId: 'e10f-lease',
    situation:
      '{company:이/가} 의존하는 외부 플랫폼(앱 마켓·결제대행·검색·온라인 몰)이 정책을 바꿨습니다. 수수료가 오르고 개인정보 처리 기준도 강화되어, 대응하지 않으면 노출이 줄거나 계정이 제한될 수 있습니다.',
    contextByType: {
      saas: '앱 마켓 수수료가 인상되고 구독 결제 방식에 새로운 심사 기준이 적용됩니다.',
      commerce: '입점 몰의 수수료와 광고 순위 기준이 바뀌었습니다.',
      content: '검색·영상 플랫폼의 추천 알고리즘이 바뀌어 조회수가 급감했습니다.',
      platform: '결제대행사가 정산 주기를 늘리고 본인 인증 의무를 강화했습니다.',
    },
    discussionPrompts: [
      '우리 매출의 몇 %가 한 플랫폼에 달려 있는가?',
      '법·정책 준수는 비용인가, 신뢰 자산인가?',
      '자체 채널(직접 회원·이메일·앱)은 얼마나 확보했는가?',
    ],
    options: [
      {
        id: 'comply',
        label: '정책 준수 + 개인정보·약관 정비',
        description: '심사 기준에 맞춰 약관과 개인정보 처리를 정비한다.',
        cost: 500,
        outcomes: [
          {
            effects: { quality: 2, reputation: 3, overhead: 20, flags: ['compliant'] },
            text: '심사를 통과했고 개인정보 보호 체계를 갖춰 거래 신뢰도가 올랐습니다. 단기 비용은 들었습니다.',
            verdict: 'strong',
          },
        ],
      },
      {
        id: 'owned-channel',
        label: '자체 채널 확보 (직접 회원·뉴스레터·웹)',
        description: '플랫폼 의존도를 낮추기 위해 직접 접점을 늘린다.',
        cost: 700,
        outcomes: [
          {
            effects: { acqBasePct: 0.08, customersPct: 0.03, reputation: 1, marketingBudget: 50, flags: ['owned-channel'] },
            text: '직접 접점이 늘어 플랫폼 의존도가 줄었습니다. 효과는 서서히 나타납니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'watch',
        label: '최소한만 대응하고 영향을 지켜본다',
        description: '일단 필수 항목만 맞추고 지표 변화를 본다.',
        cost: 0,
        outcomes: [
          {
            when: [gte('reputation', 50)],
            effects: { customersPct: -0.03, reputation: -1 },
            text: '생각보다 영향은 작았습니다. 평판이 받쳐 준 덕분에 노출 감소가 제한적이었습니다.',
            verdict: 'ok',
          },
          {
            effects: { customersPct: -0.12, acqBasePct: -0.1, reputation: -3, flags: ['restricted'] },
            text: '노출이 줄어 신규 유입이 눈에 띄게 감소했고 일부 기능이 제한되었습니다.',
            verdict: 'weak',
          },
        ],
      },
      {
        id: 'migrate',
        label: '다른 플랫폼으로 이전',
        description: '정책이 더 우호적인 곳으로 옮긴다.',
        cost: 900,
        outcomes: [
          {
            effects: { customersPct: -0.1, quality: -2, acqBasePct: 0.05, morale: -3, flags: ['migrated'] },
            text: '이전 과정에서 기존 고객 일부를 잃었고 새 플랫폼에 적응하는 비용이 들었습니다.',
            verdict: 'weak',
          },
        ],
      },
    ],
  },
  {
    id: 'e10f-lease',
    stage: 2,
    order: 10,
    title: '임대료 인상과 상권 변화',
    reason: 'pricing-cost',
    weight: 0,
    isFallback: true,
    situation:
      '{company:이/가} 입주한 상가의 임대료가 15% 오른다는 통보를 받았습니다. 건물주는 "다른 임차인이 더 낸다고 한다"고 말합니다. 단골은 늘고 있지만 월 고정비 부담이 커졌습니다.',
    discussionPrompts: [
      '임대료는 매출의 몇 %까지 감당할 수 있는가?',
      '위치가 매출에 미치는 영향은 얼마나 큰가?',
      '공유주방·배달 전용·이전 같은 대안은 무엇인가?',
    ],
    options: [
      {
        id: 'accept-optimize',
        label: '재계약 수용 + 운영 효율화 (메뉴·근무표 조정)',
        description: '임대료는 받아들이고 메뉴 수와 근무 시간표를 줄여 상쇄한다.',
        cost: 0,
        outcomes: [
          {
            effects: { overhead: 80, cogsRatio: -0.02, quality: 1, morale: -2, flags: ['lease-accepted'] },
            text: '임대료는 올랐지만 메뉴를 줄이고 근무 시간표를 조정해 일부 상쇄했습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'negotiate-lease',
        label: '임대료 협상 + 장기 계약 (보증금 상향)',
        description: '보증금을 더 내는 대신 인상폭을 낮추고 계약 기간을 늘린다.',
        cost: 600,
        outcomes: [
          {
            when: [gte('reputation', 45)],
            effects: { overhead: 30, reputation: 1, flags: ['lease-long'] },
            text: '단골 매출 자료를 근거로 인상폭을 줄이고 장기 계약을 맺었습니다.',
            verdict: 'strong',
          },
          {
            effects: { overhead: 70 },
            text: '협상은 어렵게 이어졌고 인상폭은 크게 줄지 않았습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'delivery',
        label: '배달·테이크아웃 비중 확대로 매출 분산',
        description: '매장 의존도를 낮추기 위해 다른 채널을 늘린다.',
        cost: 500,
        outcomes: [
          {
            effects: { customersPct: 0.08, cogsRatio: 0.02, quality: -1, overhead: 60, flags: ['delivery'] },
            text: '새 채널에서 고객이 늘었지만 배달 수수료로 마진이 줄었습니다.',
            verdict: 'ok',
          },
        ],
      },
      {
        id: 'relocate',
        label: '더 저렴한 상권으로 이전',
        description: '고정비를 크게 줄이는 대신 위치를 옮긴다.',
        cost: 1500,
        outcomes: [
          {
            effects: { customersPct: -0.25, overhead: -120, reputation: -3, morale: -4, flags: ['relocated'] },
            text: '임대료는 줄었지만 단골 상당수를 잃었고 이전 비용도 컸습니다.',
            verdict: 'weak',
          },
        ],
      },
    ],
  },
];

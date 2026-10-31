import type {
  BusinessType,
  CustomerType,
  RevenueModel,
  SetupInput,
  SimState,
} from './types';
import { clamp, scaleFor, MIN_CAPITAL } from './rules';

// 교육용 가정값. 실제 업종 평균이 아니다. 금액은 만원 단위.

export interface BusinessTemplate {
  label: string;
  description: string;
  examples: string;
  customerWord: string; // 고객 수가 의미하는 것
  arpu: number; // 월 고객당 매출
  cogsRatio: number; // 매출원가율
  overhead: number; // 월 고정 운영비(임대·서버·사무 등)
  capPerHead: number; // 직원 1명이 감당하는 고객 수
  churnRate: number; // 월 이탈률
  acqBase: number; // 월 기본 신규 고객
  initCustomers: number;
  initQuality: number;
}

export const BUSINESS_TYPES: Record<BusinessType, BusinessTemplate> = {
  saas: {
    label: '소프트웨어·앱 서비스',
    description: '앱, 웹서비스, 업무용 소프트웨어',
    examples: '예) 학습 관리 앱, 소상공인 예약 툴',
    customerWord: '이용 고객',
    arpu: 4,
    cogsRatio: 0.15,
    overhead: 150,
    capPerHead: 400,
    churnRate: 0.05,
    acqBase: 17,
    initCustomers: 40,
    initQuality: 55,
  },
  commerce: {
    label: '제품 판매·이커머스',
    description: '직접 기획·소싱한 제품을 온라인으로 판매',
    examples: '예) 친환경 생활용품, 반려동물 간식',
    customerWord: '구매 고객',
    arpu: 6,
    cogsRatio: 0.45,
    overhead: 200,
    capPerHead: 500,
    churnRate: 0.1,
    acqBase: 28,
    initCustomers: 70,
    initQuality: 52,
  },
  offline: {
    label: '오프라인 매장·외식',
    description: '카페, 식당, 소매점, 체험 공간',
    examples: '예) 로컬 디저트 카페, 보드게임 카페',
    customerWord: '단골 고객',
    arpu: 7.5,
    cogsRatio: 0.3,
    overhead: 500,
    capPerHead: 150,
    churnRate: 0.08,
    acqBase: 18,
    initCustomers: 70,
    initQuality: 55,
  },
  content: {
    label: '교육·콘텐츠',
    description: '강의, 구독형 콘텐츠, 커뮤니티',
    examples: '예) 취업 코칭 강의, 뉴스레터 구독',
    customerWord: '수강·구독 고객',
    arpu: 3.5,
    cogsRatio: 0.2,
    overhead: 120,
    capPerHead: 300,
    churnRate: 0.07,
    acqBase: 19,
    initCustomers: 50,
    initQuality: 52,
  },
  platform: {
    label: '중개 플랫폼',
    description: '공급자와 이용자를 연결하는 서비스',
    examples: '예) 동네 클래스 연결, 중고 거래',
    customerWord: '활성 이용자',
    arpu: 2.6,
    cogsRatio: 0.1,
    overhead: 250,
    capPerHead: 1500,
    churnRate: 0.07,
    acqBase: 50,
    initCustomers: 120,
    initQuality: 50,
  },
};

export interface RevenueModelTemplate {
  label: string;
  description: string;
  arpuMult: number;
  cogsAdd: number;
  churnMult: number;
  acqMult: number;
  initMult: number;
}

export const REVENUE_MODELS: Record<RevenueModel, RevenueModelTemplate> = {
  subscription: {
    label: '구독·정기결제',
    description: '매달 정해진 금액을 받는다. 이탈이 적고 매출이 안정적이다.',
    arpuMult: 1,
    cogsAdd: 0,
    churnMult: 0.8,
    acqMult: 0.9,
    initMult: 1,
  },
  sales: {
    label: '제품·서비스 판매',
    description: '건별로 팔고 건별로 받는다. 단가는 높지만 재구매가 숙제다.',
    arpuMult: 1.2,
    cogsAdd: 0.1,
    churnMult: 1.2,
    acqMult: 1,
    initMult: 1,
  },
  commission: {
    label: '수수료',
    description: '거래액의 일부를 받는다. 양쪽 참여자가 모두 필요하다.',
    arpuMult: 0.7,
    cogsAdd: -0.05,
    churnMult: 1,
    acqMult: 0.8,
    initMult: 1,
  },
  ads: {
    label: '광고',
    description: '이용자는 무료, 광고주가 돈을 낸다. 규모가 커야 돈이 된다.',
    arpuMult: 0.3,
    cogsAdd: -0.05,
    churnMult: 1.1,
    acqMult: 1.5,
    initMult: 1.5,
  },
  service: {
    label: '프로젝트·용역',
    description: '고객 맞춤으로 일하고 대금을 받는다. 단가가 높고 인력이 많이 든다.',
    arpuMult: 3,
    cogsAdd: 0.2,
    churnMult: 1.3,
    acqMult: 0.4,
    initMult: 0.5,
  },
};

export interface CustomerTypeTemplate {
  label: string;
  description: string;
  arpuMult: number;
  acqMult: number;
  churnMult: number;
  capMult: number;
  initMult: number;
}

export const CUSTOMER_TYPES: Record<CustomerType, CustomerTypeTemplate> = {
  b2c: {
    label: '일반 소비자 (B2C)',
    description: '개인 고객. 고객 수가 많고 단가가 낮다.',
    arpuMult: 1,
    acqMult: 1,
    churnMult: 1,
    capMult: 1,
    initMult: 1,
  },
  b2b: {
    label: '기업·기관 (B2B)',
    description: '기업 고객. 고객 수가 적고 단가가 높으며 영업이 필요하다.',
    arpuMult: 4,
    acqMult: 0.35,
    churnMult: 0.6,
    capMult: 0.4,
    initMult: 0.25,
  },
};

/** 업종·수익모델·고객 유형이 어울리지 않을 때 학생에게 보여줄 참고 문구. 선택을 막지는 않는다. */
export function comboNote(
  setup: Pick<SetupInput, 'businessType' | 'revenueModel' | 'customerType'>,
): string | null {
  const { businessType, revenueModel, customerType } = setup;
  if (businessType === 'offline' && (revenueModel === 'ads' || revenueModel === 'commission')) {
    return '오프라인 매장이 광고·수수료 수익만으로 운영되는 경우는 드뭅니다. 이 조합은 초반 매출이 낮게 시작합니다.';
  }
  if (businessType === 'platform' && revenueModel === 'sales') {
    return '중개 플랫폼은 보통 수수료나 광고로 돈을 법니다. 직접 판매를 택하면 재고·원가 부담이 커집니다.';
  }
  if (revenueModel === 'ads' && customerType === 'b2b') {
    return '기업 고객 대상 광고 모델은 이용자 규모가 작아 광고 수익이 낮게 시작합니다.';
  }
  if (revenueModel === 'service' && businessType === 'platform') {
    return '프로젝트·용역은 사람 손이 많이 들어 중개 플랫폼의 확장성과 잘 맞지 않습니다.';
  }
  return null;
}

export function createInitialState(setup: SetupInput): SimState {
  const t = BUSINESS_TYPES[setup.businessType];
  const rm = REVENUE_MODELS[setup.revenueModel];
  const ct = CUSTOMER_TYPES[setup.customerType];

  const arpu = Math.round(t.arpu * rm.arpuMult * ct.arpuMult * 100) / 100;
  const k = scaleFor(setup.capital);
  const customers = Math.max(3, Math.round(t.initCustomers * rm.initMult * ct.initMult * k));

  return {
    businessType: setup.businessType,
    month: 0,
    initialCapital: setup.capital,
    cash: setup.capital,
    monthlyRevenue: Math.round(customers * arpu),
    customers,
    quality: t.initQuality,
    morale: 70,
    reputation: 35,
    headcount: setup.members,
    scale: k,
    avgSalary: Math.round(250 * k * 10) / 10,
    marketingBudget: Math.round(100 * k),
    overhead: Math.round(t.overhead * k),
    arpu,
    cogsRatio: clamp(t.cogsRatio + rm.cogsAdd, 0.05, 0.9),
    churnRate: clamp(t.churnRate * rm.churnMult * ct.churnMult, 0.01, 0.5),
    acqBase: Math.round(t.acqBase * rm.acqMult * ct.acqMult * k * 100) / 100,
    capPerHead: Math.round(t.capPerHead * ct.capMult),
    debt: 0,
    dilution: 0,
    insolvencyMonths: 0,
    flags: [],
  };
}

export function validateSetup(setup: SetupInput): string[] {
  const errors: string[] = [];
  const name = setup.companyName.trim();
  if (name.length < 1 || name.length > 30) errors.push('기업명은 1~30자로 입력해 주세요.');
  const idea = setup.idea.trim();
  if (idea.length < 10) errors.push('사업 아이디어를 10자 이상 적어 주세요.');
  if (idea.length > 300) errors.push('사업 아이디어는 300자 이내로 적어 주세요.');
  if (setup.targetCustomer.trim().length < 2) errors.push('대상 고객을 적어 주세요.');
  if (!Number.isFinite(setup.capital) || setup.capital < MIN_CAPITAL || setup.capital > 100000) {
    errors.push('초기 자본은 100만원 이상 10억원 이하로 입력해 주세요.');
  }
  if (!Number.isInteger(setup.members) || setup.members < 1 || setup.members > 6) {
    errors.push('창업 멤버는 1~6명으로 입력해 주세요.');
  }
  return errors;
}

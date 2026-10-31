// Startup Simulator 엔진 타입. 금액 단위는 모두 "만원"이다. (1억 원 = 10000)
// 이 파일과 엔진 전체는 React에 의존하지 않는다.

export type BusinessType = 'saas' | 'commerce' | 'offline' | 'content' | 'platform';
export type CustomerType = 'b2c' | 'b2b';
export type RevenueModel = 'subscription' | 'sales' | 'commission' | 'ads' | 'service';
export type GameMode = 'class' | 'full';
export type Stage = 1 | 2 | 3;
export type Verdict = 'strong' | 'ok' | 'weak';

export type CbReasonId =
  | 'no-market-need'
  | 'ran-out-of-cash'
  | 'wrong-team'
  | 'outcompeted'
  | 'pricing-cost'
  | 'user-unfriendly'
  | 'no-business-model'
  | 'poor-marketing'
  | 'ignored-customers'
  | 'bad-timing'
  | 'lost-focus'
  | 'disharmony'
  | 'bad-pivot'
  | 'lack-passion'
  | 'geo-expansion'
  | 'no-financing'
  | 'legal'
  | 'no-network'
  | 'burnout'
  | 'failed-to-pivot';

export interface SetupInput {
  companyName: string;
  idea: string;
  businessType: BusinessType;
  customerType: CustomerType;
  targetCustomer: string;
  revenueModel: RevenueModel;
  capital: number; // 초기 자본(만원)
  members: number; // 창업 멤버 수
  mode: GameMode;
}

export interface SimState {
  businessType: BusinessType;
  month: number; // 0 ~ 36
  initialCapital: number;
  // 화면에 노출되는 지표
  cash: number;
  monthlyRevenue: number;
  customers: number;
  quality: number;
  morale: number;
  reputation: number;
  // 운영 변수
  headcount: number;
  avgSalary: number;
  marketingBudget: number;
  overhead: number;
  arpu: number;
  cogsRatio: number;
  churnRate: number;
  acqBase: number;
  capPerHead: number;
  debt: number;
  dilution: number;
  insolvencyMonths: number;
  /** 시장 압력 배율(수업용 모드는 결정 횟수가 적어 낮춘다). 이전 저장본에는 없을 수 있다. */
  pressure?: number;
  /** 소액 창업 규모 배율(0.02~1). 초기 자본이 5,000만원 미만이면 금액·고객 규모를 함께 줄인다. 이전 저장본에는 없다(=1). */
  scale?: number;
  flags: string[];
}

export type CondMetric =
  | 'cash'
  | 'monthlyRevenue'
  | 'customers'
  | 'quality'
  | 'morale'
  | 'reputation'
  | 'headcount'
  | 'utilization'
  | 'runway'
  | 'debt'
  | 'dilution'
  | 'marketingBudget'
  | 'monthlyProfit'
  | 'month';
export type CondOp = '>=' | '<=' | '>' | '<';
export type Cond =
  | { metric: CondMetric; op: CondOp; value: number }
  | { flag: string; has: boolean };

export interface Effects {
  cash?: number; // 현금 유입 (지출은 option.cost)
  cashMonths?: number; // 현금 유입 = 개월 수 × 현재 월 고정비(인건비+운영비+마케팅+이자). 투자금을 '몇 개월 버틸 금액'으로 표현
  customersPct?: number;
  customersAdd?: number;
  quality?: number;
  morale?: number;
  reputation?: number;
  headcount?: number;
  marketingBudget?: number;
  overhead?: number;
  arpuPct?: number;
  churnRate?: number;
  acqBasePct?: number;
  cogsRatio?: number;
  capPerHeadPct?: number;
  debt?: number;
  dilution?: number;
  flags?: string[];
}

export interface Outcome {
  when?: Cond[];
  effects: Effects;
  text: string;
  verdict: Verdict;
}

export interface EventOption {
  id: string;
  label: string;
  description: string;
  cost?: number;
  minHeadcount?: number;
  onlyFor?: BusinessType[];
  requires?: Cond[];
  requiresText?: string;
  outcomes: Outcome[];
}

export interface GameEvent {
  id: string;
  stage: Stage;
  order: number;
  title: string;
  reason: CbReasonId;
  situation: string;
  contextByType?: Partial<Record<BusinessType, string>>;
  appliesTo?: BusinessType[];
  applicableWhen?: Cond[];
  fallbackId?: string;
  isFallback?: boolean;
  weight: number;
  boosts?: { when: Cond[]; add: number }[];
  discussionPrompts: string[];
  options: EventOption[];
}

// --- UI에 전달되는 공개 타입 (효과·결과 없음) ---
export interface PublicOption {
  id: string;
  label: string;
  description: string;
  cost: number;
  minHeadcount: number | null;
  available: boolean;
  reasons: string[];
}

export interface ResolvedEvent {
  id: string;
  stage: Stage;
  title: string;
  reason: CbReasonId;
  situation: string;
  context: string | null;
  discussionPrompts: string[];
  options: PublicOption[];
  index: number; // 이번 연차 내 순서 (0부터)
  total: number; // 이번 연차 이벤트 수
}

// --- 기록 ---
export interface MetricSnapshot {
  month: number;
  cash: number;
  monthlyRevenue: number;
  customers: number;
  quality: number;
  morale: number;
  reputation: number;
  headcount: number;
}

export interface MonthRecord {
  month: number;
  cash: number;
  revenue: number;
  customers: number;
  quality: number;
  morale: number;
  reputation: number;
  headcount: number;
}

export interface DecisionRecord {
  eventId: string;
  eventTitle: string;
  optionId: string;
  optionLabel: string;
  stage: Stage;
  month: number;
  rationale: string;
  dissent: string;
  before: MetricSnapshot;
  afterImmediate: MetricSnapshot;
  afterPeriod: MetricSnapshot;
  monthsElapsed: number;
  outcomeText: string;
  verdict: Verdict;
  reason: CbReasonId;
  cost: number;
  notes: string[];
}

export type Phase = 'intro' | 'event' | 'outcome' | 'finished';
export type GameStatus = 'running' | 'completed' | 'bankrupt';

export interface Game {
  version: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  seed: number;
  setup: SetupInput;
  sim: SimState;
  stage: Stage;
  plan: string[];
  planIndex: number;
  phase: Phase;
  status: GameStatus;
  decisions: DecisionRecord[];
  history: MonthRecord[];
  lastOutcome?: DecisionRecord;
}

export interface Score {
  total: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  bankrupt: boolean;
  parts: {
    finance: number;
    growth: number;
    quality: number;
    team: number;
    reputation: number;
  };
}

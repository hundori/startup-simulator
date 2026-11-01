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
  customerType?: CustomerType; // 이전 저장본에는 없다
  /** 업종에서 AI가 대신할 수 있는 업무 비율의 상한(0~1). 이전 저장본에는 없다(=0.3 취급). */
  aiShare?: number;
  /** AI 도입 정도(0~1). 1이면 상한까지 자동화했다는 뜻. 이전 저장본에는 없다(=0). */
  aiLevel?: number;
  /** 우리가 겨냥한 시장에서 얻을 수 있는 최대 고객 수(규모 반영). 고객이 이에 가까워질수록 신규 유입이 줄어든다. 이전 저장본에는 없다. */
  tam?: number;
  /** 최근 월 매출 기록(최대 7개월). 성장률 계산용. 이전 저장본에는 없다. */
  revHist?: number[];
  /** 최근 월말 현금 기록(최대 4개). 최근 현금 증감 판정용. 이전 저장본에는 없다. */
  cashHist?: number[];
  /**
   * 무급여·급여 삭감 기록. normal=삭감 전 1인당 월급, months=삭감 상태로 보낸 개월 수,
   * burden=팀이 개인적으로 떠안은 누적 금액(회사 현금에서 차감하지 않는다), since=시작 월, asks=급여 복원 결정을 물은 횟수.
   */
  salaryCut?: { normal: number; months: number; burden: number; since: number; asks: number };
  /** 소액 창업 규모 배율(0.02~1). 초기 자본이 5,000만원 미만이면 금액·고객 규모를 함께 줄인다. 이전 저장본에는 없다(=1). */
  scale?: number;
  flags: string[];
}

export type CondMetric =
  | 'cash'
  | 'finStatus' // 0=현금 위기, 1=적자, 2=흑자 (financialStatus)
  | 'cashTrend3' // 최근 3개월 현금 증감(표준 규모)
  | 'salaryCutMonths' // 급여 삭감 상태가 이어진 개월 수
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
  | 'aiShare'
  | 'aiLevel'
  | 'growth6'
  | 'churnRate'
  | 'grossMargin'
  | 'share'
  | 'month';
export type CondOp = '>=' | '<=' | '>' | '<';
export type Cond =
  | { metric: CondMetric; op: CondOp; value: number }
  | { flag: string; has: boolean };

export interface Effects {
  cash?: number; // 현금 유입 (지출은 option.cost)
  cashMonths?: number; // 현금 유입 = 개월 수 × 현재 월 고정비(인건비+운영비+마케팅+이자). 투자금을 '몇 개월 버틸 금액'으로 표현
  debtMonths?: number; // 부채 증가 = 개월 수 × 현재 월 고정비(차입을 '몇 개월 버틸 금액'으로 표현)
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
  salaryRestorePct?: number; // 삭감된 급여를 원래 수준으로 되돌리는 비율(0~1)
  salaryPct?: number; // 1인당 월급 증감(무급여 전환·급여 삭감 등)
  aiLevel?: number; // AI 도입 정도 증감(0~1 범위로 제한)
  tamPct?: number; // 겨냥 시장 규모 증감(틈새 집중은 줄이고, 새 시장 진출은 늘린다)
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
  onlyForModel?: RevenueModel[]; // 이 수익모델일 때만 보인다
  notForModel?: RevenueModel[]; // 이 수익모델이면 숨긴다
  showWhen?: Cond[]; // 회사 상태가 이 조건을 만족할 때만 보인다(흑자·적자별로 다른 대안을 낼 때)
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
  appliesToCustomer?: CustomerType[]; // 고객 유형(B2C/B2B)이 맞을 때만 나온다
  applicableWhen?: Cond[];
  fallbackId?: string;
  isFallback?: boolean;
  weight: number;
  boosts?: { when: Cond[]; add: number }[];
  discussionPrompts: string[];
  options: EventOption[];
  /** 회사 상태(현금·이익·가동률 등)에 따라 도입문·토론 질문을 바꾼다. 위에서부터 처음 맞는 것을 쓴다. */
  variants?: { when: Cond[]; title?: string; situation?: string; context?: string; discussionPrompts?: string[] }[];
}

// --- UI에 전달되는 공개 타입 (효과·결과 없음) ---
export interface PublicOption {
  id: string;
  label: string;
  description: string;
  cost: number; // 선택 즉시 한 번만 나가는 비용(일회성)
  fixedDelta: { min: number; max: number }; // 결정 후 매달 나가는 고정비의 변화(결과별 최솟값·최댓값)
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
  emergency?: boolean; // 런웨이 1개월 미만에서 열리는 긴급 생존 카드
  followup?: boolean; // 연차 이벤트 수에 포함되지 않는 추가 결정(긴급 카드·급여 복원)
  facts: string[]; // 이 서술이 근거로 삼은 현재 지표(화면 표시와 같은 값)
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
  fixedBefore?: number; // 결정 전 월 고정비
  fixedAfter?: number; // 결정 효과 적용 직후 월 고정비
  runwayBefore?: number | null; // 결정 전 런웨이(null=흑자 구조)
  runwayAfter?: number | null; // 다음 결정 시점의 런웨이
  notes: string[];
  /** 결정 당시 질문(이벤트 도입문)과 보여 준 모든 대안. 기록 내보내기용. 이전 저장본에는 없다. */
  situation?: string;
  optionsShown?: { label: string; cost: number; fixedMin: number; fixedMax: number; available: boolean; reasons: string[] }[];
  /** 결정 직전의 재무 상태 판정 */
  finStatusBefore?: 'crunch' | 'deficit' | 'surplus';
  /** 현금 변화 분해(만원). total = oneTime + inflow + operating + other */
  cashFlow?: CashFlow;
}

export interface CashFlow {
  oneTime: number; // 일회성 지출(음수)
  inflow: number; // 투자·지원금·차입 등 자금 유입(양수)
  operating: number; // 경과 기간 영업 현금흐름(매출−비용 합)
  other: number; // 기타 조정(반올림 등)
  total: number;
  months: number;
  detail: { revenue: number; cogs: number; payroll: number; overhead: number; marketing: number; interest: number };
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
  /** 회사 성과 점수(재무·성장·품질·팀·평판). 학습·의사결정 평가와는 별개다. */
  total: number;
  /** 변경 전 성장 산식(월 매출 ÷ 초기 자본의 15%)으로 계산한 값. 비교용. */
  legacy: { growth: number; total: number };
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

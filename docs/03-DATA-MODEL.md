# 데이터 모델

모든 타입은 `src/engine/types.ts`에 있다. 금액 단위는 **만원**(정수)이다. 예: 1억 원 = 10000.

## 1. 입력 (SetupInput)
| 필드 | 타입 | 설명 |
|---|---|---|
| companyName | string | 기업명 (1~30자) |
| idea | string | 사업 아이디어 (자유 입력, 10~300자) |
| businessType | `saas \| commerce \| offline \| content \| platform` | 업종 템플릿 선택 |
| customerType | `b2c \| b2b` | 고객 유형 |
| targetCustomer | string | 대상 고객 (자유 입력) |
| revenueModel | `subscription \| sales \| commission \| ads \| service` | 수익모델 |
| capital | number | 초기 자본(만원), 1,000 ~ 100,000 |
| members | number | 창업 멤버 수, 1 ~ 6 |
| mode | `class \| full` | 수업용(총 6개) / 전체(총 15개) |

## 2. 시뮬레이션 상태 (SimState)
### 2.1 지표 (화면에 노출되는 6종 + 보조)
| 필드 | 범위 | 설명 |
|---|---|---|
| cash | 정수, 음수 가능 | 현금 |
| monthlyRevenue | ≥ 0 | 직전 월 매출 |
| customers | ≥ 0 정수 | 고객 수(업종에 따라 이용자·단골·계약 고객) |
| quality | 0~100 | 제품·서비스 품질 |
| morale | 0~100 | 팀 사기 |
| reputation | 0~100 | 평판 |

### 2.2 운영 변수 (결정으로 바뀌지만 화면에는 일부만 노출)
headcount, avgSalary, marketingBudget(월), overhead(월), arpu(월 고객당 매출), cogsRatio(매출원가율), churnRate(월 이탈률), acqBase(월 기본 신규 고객), capPerHead(1인당 처리 고객 수), debt, dilution(지분 희석 %), initialCapital, flags(문자열 태그)

### 2.3 진행 변수
month(0~36), year(1~3), insolvencyMonths(연속 현금 마이너스 개월), lastProfit(직전 월 순손익)

## 3. 게임 (Game) — 저장 단위
```ts
interface Game {
  version: 1;                 // 저장 스키마 버전(마이그레이션용)
  id: string;                 // 조 식별자 (Supabase 연동 시 PK)
  createdAt: string; updatedAt: string;
  seed: number;               // 이벤트 선택 지터용 난수 시드
  setup: SetupInput;
  sim: SimState;
  plan: string[];             // 현재 연차에 진행할 이벤트 id (순서)
  planIndex: number;
  phase: 'intro' | 'event' | 'outcome' | 'finished';
  status: 'running' | 'completed' | 'bankrupt';
  decisions: DecisionRecord[];
  history: MonthRecord[];     // 월별 스냅샷 (차트용, 최대 37개)
  lastOutcome?: DecisionRecord;
}
```

## 4. 기록
```ts
interface DecisionRecord {
  eventId: string; optionId: string; stage: 1|2|3; month: number;
  rationale: string;          // 필수
  dissent: string;            // 선택: 반대 의견·검토한 다른 대안
  before: MetricSnapshot;     // 결정 직전
  afterImmediate: MetricSnapshot; // 결정 직후
  afterPeriod: MetricSnapshot;    // 다음 이벤트 전까지 경과 후
  monthsElapsed: number;
  outcomeText: string; verdict: 'strong'|'ok'|'weak'; reason: CbReasonId;
  notes: string[];            // 경고(인력 부족, 현금 부족, 파산 등)
}
interface MonthRecord { month: number; cash: number; revenue: number; customers: number; quality: number; morale: number; reputation: number; headcount: number; }
```

## 5. 저장소 인터페이스 (Supabase 이행 대비)
```ts
interface StorageAdapter {
  load(): Promise<Game | null>;
  save(game: Game): Promise<void>;
  clear(): Promise<void>;
}
```
- MVP: `LocalStorageAdapter` (키 `startup-simulator:v1`). 저장 시 `version`을 확인하고, 다른 버전이면 불러오지 않고 안내한다.
- Supabase 이행 시 제안 테이블: `games(id uuid pk, owner uuid, data jsonb, updated_at)`, `decisions(game_id, idx, data jsonb)`. `Game` JSON을 그대로 `data`에 넣으면 이행 비용이 가장 작다.

## 6. 정적 데이터
| 파일 | 내용 |
|---|---|
| `engine/templates.ts` | 업종·수익모델·고객 유형 템플릿 가정값 |
| `engine/events/*.ts` | 이벤트 17개 (구조는 04 문서) |
| `engine/constants.ts` | CB Insights 실패 요인 목록, 교육용 가정 문구 |

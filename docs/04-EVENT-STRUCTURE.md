# 이벤트 구조

## 1. 타입
```ts
interface GameEvent {
  id: string;                 // 'e01-market-need'
  stage: 1 | 2 | 3;           // 1 생존, 2 성장, 3 확장
  title: string;
  reason: CbReasonId;         // 이 이벤트가 다루는 실패 요인
  situation: string;          // {company} 치환 가능
  contextByType?: Partial<Record<BusinessType, string>>; // 업종별 추가 설명
  appliesTo?: BusinessType[]; // 지정하면 해당 업종에만 등장
  applicableWhen?: Cond[];    // 상태 조건이 맞을 때만 등장
  fallbackId?: string;        // 부적절할 때 대신 나오는 이벤트
  isFallback?: boolean;
  weight: number;             // 수업용 모드 선택 우선순위
  boosts?: { when: Cond[]; add: number }[]; // 상황별 가산점
  discussionPrompts: string[];// 토론 질문 2~3개
  options: EventOption[];     // 3개 이상
}

interface EventOption {
  id: string; label: string; description: string;
  cost?: number;              // 즉시 지출(만원) — 선택 전에 공개
  minHeadcount?: number;      // 인력 조건 — 선택 전에 공개
  onlyFor?: BusinessType[];
  requires?: Cond[]; requiresText?: string;
  outcomes: Outcome[];        // 위에서부터 조건이 맞는 첫 결과 적용 (마지막은 조건 없음)
}

interface Outcome {
  when?: Cond[];
  effects: Effects;
  text: string;               // 결정 후에만 공개
  verdict: 'strong' | 'ok' | 'weak';  // 학습 보고서용
}
```
- **선택 전 공개**: label, description, cost, minHeadcount, 조건 사유. `outcomes`는 UI 컴포넌트에 전달하지 않는다(`toPublicOption`).
- **조건(Cond)**: `{ metric, op, value }` 또는 `{ flag, has }`. 직렬화 가능하므로 DB·AI 생성 이벤트로 옮기기 쉽다.

## 2. Effects
```ts
interface Effects {
  cash?: number;            // 현금 유입(투자·대출 등). 지출은 cost로.
  customersPct?: number; customersAdd?: number;
  quality?: number; morale?: number; reputation?: number;
  headcount?: number;       // + 채용(월급 400), − 감원
  marketingBudget?: number; overhead?: number;
  arpuPct?: number; churnRate?: number; acqBasePct?: number;
  cogsRatio?: number; capPerHeadPct?: number;
  debt?: number; dilution?: number;
  flags?: string[];
}
```

## 3. 이벤트 목록
### 1년 차 — 생존
| ID | 제목 | 실패 요인 | 비고 |
|---|---|---|---|
| e01-market-need | 첫 고객 반응: 정말 돈을 낼 사람이 있나 | 시장 수요 부재 | 전 업종 |
| e02-runway | 런웨이 경고: 투자냐 비용 절감이냐 | 자금 소진 | 런웨이가 짧으면 가산점 |
| e03-cofounder | 공동창업자 갈등 | 팀 | **headcount ≥ 2일 때만**, 아니면 e03f |
| e03f-solo-burnout | 혼자 다 하는 대표의 한계 | 번아웃 | e03의 대체 이벤트 |
| e04-competitor | 대형 경쟁사의 가격 공세 | 경쟁·가격 | 전 업종 |
| e05-ops-incident | 품질·운영 사고 | 사용자 불만 | 업종별 상황 설명 |
### 2년 차 — 성장
| ID | 제목 | 실패 요인 | 비고 |
|---|---|---|---|
| e06-big-partner | 큰 파트너의 제안 | 고객 무시/집중 | 전 업종 |
| e07-hiring | 성장통: 채용과 조직 | 팀 | 전 업종, 인력 부족 시 가산점 |
| e08-channel-cac | 마케팅 채널 확대와 고객 획득 비용 | 마케팅 | 전 업종 |
| e09-focus | 신제품 확장 vs 핵심 집중 | 집중력 상실 | 전 업종 |
| e10-platform-risk | 외부 플랫폼 정책·규제 변화 | 법적·의존 | **saas, commerce, content, platform만**, 오프라인은 e10f |
| e10f-lease | 임대료 인상과 상권 변화 | 비용 | e10의 대체 이벤트 |
### 3년 차 — 확장
| ID | 제목 | 실패 요인 | 비고 |
|---|---|---|---|
| e11-series-a | 투자 제안과 조건 | 자금·지배구조 | 전 업종 |
| e12-expansion | 해외·신규 지역 확장 | 지리적 확장 실패 | 대안별 인력 조건 |
| e13-model-shift | 수익모델·가격 개편 | 수익모델 부재 | 전 업종 |
| e14-growth-vs-profit | 성장과 수익성 사이 | 자금 소진 | 번레이트 높으면 가산점 |
| e15-strategic-offer | 인수 제안과 지속 경영 | 시기·방향 | 전 업종 |

## 4. 연차별 이벤트 계획 (scheduler)
`planStageEvents(game, stage)`는 연차 시작 시 한 번 호출한다.
1. 해당 stage의 후보 5개를 순서대로 훑는다.
2. 업종 또는 상태 조건에 맞지 않으면 `fallbackId` 이벤트로 바꾼다. 대체가 없으면 건너뛴다.
3. 전체 모드는 5개 모두, 수업용 모드는 점수 상위 2개를 고른다.
   점수 = `weight` + 해당되는 `boosts` 합 + 시드 기반 지터(0~0.5, 같은 시드면 같은 값)
4. 선택된 이벤트는 `order` 순서로 진행한다.

## 5. CB Insights 실패 요인 데이터
출처: CB Insights, 스타트업 실패 사후분석 101건 정리("The Top 20 Reasons Startups Fail"). 한 회사가 여러 요인을 말해서 합계가 100%를 넘는다.

이번 작업에서 출처 문서로 직접 확인된 값: 시장 수요 없음 42%, 자금 소진 29%, 경쟁사에 밀림 19%, 마케팅 부실 14%, 집중력 상실 13%, 열정·도메인 지식 부족 9%, 번아웃 8%, 피벗 실패 7%.
**확인하지 못한 값은 코드에서 `pct: null`로 두고 화면에 퍼센트를 표시하지 않는다.** 수업 전에 최신 원문과 대조해서 `engine/constants.ts`를 채워 넣는다. 보고서판에 따라 수치가 다를 수 있다.

"성공 데이터"는 CB Insights 자료 중 확인된 정량 수치가 없어 반영하지 않았다. 성공 쪽 판단은 각 결과의 `verdict`(strong/ok/weak)로 표현하며, 이는 **교육용 가정**이다.

## 6. 결과 공개 규칙
- 선택 전: 비용·조건·설명만 보인다.
- 선택 직후: 결과 해설 + 결정 직후 지표 변화.
- 기간 경과 후: 다음 이벤트까지 월별 시뮬레이션을 돌린 결과(매출·현금·고객 변화)를 같이 보여준다.

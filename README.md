# Startup Simulator (MVP)

창업 수업용 시뮬레이션. 조별로 가상 회사를 세우고 3년간 이벤트를 겪으며 전략을 선택한다.

## 실행
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 엔진 테스트 50개
npm run typecheck
npm run balance    # 전략×업종 밸런스 점검
```

## 구조
- `src/engine` : React 없는 규칙 기반 엔진(재무·점수 계산). AI·API 키 불필요, 결정적.
- `src/storage` : `StorageAdapter` + `LocalStorageAdapter`(키 `startup-simulator:v1`).
- `src/components` : 한국어 모바일 대응 UI.
- `docs/` : PRD, 화면, 데이터 모델, 이벤트, 규칙, 테스트 케이스.

## 진행 방식
수업용(기본): 연차마다 후보 중 상황에 맞는 3개 = 총 9개. 전체: 후보 모두 = 총 19개(1년 차 6, 2년 차 7, 3년 차 6). 시작 시 선택.

## Supabase 전환
`StorageAdapter`를 구현하고 `GameApp`의 `storage`를 교체한다. 테이블: `games(id uuid, owner uuid, data jsonb, updated_at timestamptz)` + RLS(owner). 주의: 효과 수치가 클라이언트 번들에 포함되어 있으므로, 학생에게 숨겨야 한다면 `submitDecision`을 서버(Route Handler)로 옮긴다.

## 한계
- 모든 효과 수치는 교육용 가정이며 실제 성과를 예측하지 않는다.
- 항상 최저 비용 대안을 고르는 전략도 수업용 모드에서는 상당 비율 생존한다. `src/engine/templates.ts`로 조정 가능.

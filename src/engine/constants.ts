import type { CbReasonId } from './types';

export const DISCLAIMER_SHORT =
  '이벤트 효과와 업종 수치는 수업용으로 단순화한 가정값입니다. 실제 시장의 평균이 아닙니다.';

export const DISCLAIMER_LONG =
  '이 시뮬레이터의 이벤트 효과, 업종별 기본 수치, 점수 공식은 모두 교육용 가정입니다. 실제 창업의 성패를 예측하지 않으며, 정답을 맞히는 게임이 아니라 근거를 갖고 선택하는 연습을 위한 도구입니다.';

export interface CbReason {
  id: CbReasonId;
  label: string;
  /** CB Insights 사후분석 101건 정리에서 확인된 비율(%). 확인하지 못한 값은 null → 화면에 표시하지 않는다. */
  pct: number | null;
}

// 출처: CB Insights, 스타트업 실패 사후분석 정리 (docs/04-EVENT-STRUCTURE.md 5절 참고)
// pct가 null인 항목은 이번 작업에서 출처 문서로 직접 확인하지 못했다. 수업 전에 원문과 대조해 채워 넣을 것.
export const CB_REASONS: Record<CbReasonId, CbReason> = {
  'no-market-need': { id: 'no-market-need', label: '시장이 원하지 않는 제품', pct: 42 },
  'ran-out-of-cash': { id: 'ran-out-of-cash', label: '자금 소진', pct: 29 },
  'wrong-team': { id: 'wrong-team', label: '팀 구성·역량 문제', pct: null },
  outcompeted: { id: 'outcompeted', label: '경쟁사에 밀림', pct: 19 },
  'pricing-cost': { id: 'pricing-cost', label: '가격·비용 구조 문제', pct: null },
  'user-unfriendly': { id: 'user-unfriendly', label: '사용자 경험·품질 문제', pct: null },
  'no-business-model': { id: 'no-business-model', label: '수익모델 부재', pct: null },
  'poor-marketing': { id: 'poor-marketing', label: '마케팅 부실', pct: 14 },
  'ignored-customers': { id: 'ignored-customers', label: '고객 의견 무시', pct: null },
  'bad-timing': { id: 'bad-timing', label: '시기·방향 오판', pct: null },
  'lost-focus': { id: 'lost-focus', label: '집중력 상실', pct: 13 },
  disharmony: { id: 'disharmony', label: '공동창업자·투자자와의 불화', pct: null },
  'bad-pivot': { id: 'bad-pivot', label: '잘못된 피벗', pct: null },
  'lack-passion': { id: 'lack-passion', label: '열정·도메인 이해 부족', pct: 9 },
  'geo-expansion': { id: 'geo-expansion', label: '지역·해외 확장 실패', pct: null },
  'no-financing': { id: 'no-financing', label: '투자 유치 실패', pct: null },
  legal: { id: 'legal', label: '법적·규제 문제', pct: null },
  'no-network': { id: 'no-network', label: '네트워크·조언자 미활용', pct: null },
  burnout: { id: 'burnout', label: '번아웃', pct: 8 },
  'failed-to-pivot': { id: 'failed-to-pivot', label: '필요한 피벗을 못 함', pct: 7 },
};

export function reasonLabel(id: CbReasonId): string {
  const r = CB_REASONS[id];
  return r.pct === null ? r.label : `${r.label} (CB Insights 사후분석 중 ${r.pct}%)`;
}

export const SIM_MONTHS = 36;
export const MIN_RATIONALE_LENGTH = 20;
export const STORAGE_KEY = 'startup-simulator:v1';

import type { Game, Score } from './types';
import { clamp, monthlyFixedCost, normalSalaryProfit, salaryGapPerMonth, scaleOf } from './rules';

export const SCORE_WEIGHTS = {
  finance: 0.25,
  growth: 0.3,
  quality: 0.15,
  team: 0.15,
  reputation: 0.15,
} as const;

export function gradeOf(total: number): Score['grade'] {
  if (total >= 80) return 'A';
  if (total >= 65) return 'B';
  if (total >= 50) return 'C';
  if (total >= 35) return 'D';
  return 'F';
}

/**
 * 교육용 점수 공식. docs/05-SIMULATION-RULES.md 6절
 *
 * 성장 점수(변경됨): 기존에는 월 매출 ÷ (초기 자본 × 15%)였다. 초기 자본이 클수록 같은 매출로 낮은 점수를 받아
 * 자본이 작은 팀이 유리했고 비용 구조는 보지 않았다. 지금은 초기 자본을 분모로 쓰지 않고 다음 둘을 반반 섞는다.
 *  ① 비용 충당도: 매출총이익 ÷ 정상 급여 기준 월 고정비 (1.0=손익분기 → 70점, 약 1.43 이상 → 100점)
 *  ② 매출 성장 배수: 종료 월 매출 ÷ 시작 월 매출을 로그로 환산 (1배 → 0점, 8배 → 100점)
 * 기존 산식 점수는 legacyGrowth로 함께 계산해 비교용으로 보여 준다.
 *
 * 재무 점수: 월 이익이 흑자면 +15점을 주는 기준을 '정상 급여를 지급한다고 가정한 월 이익'으로 바꿨다.
 * 무급여·급여 삭감 상태의 이익으로 흑자 가점을 받지 않게 하기 위해서다.
 */
export function scoreGame(game: Game): Score {
  const s = game.sim;
  const netCash = s.cash - s.debt;
  const normalProfit = normalSalaryProfit(s);
  const finance = clamp(
    (netCash / s.initialCapital) * 50 + 25 + (normalProfit > 0 ? 15 : 0) - s.dilution * 0.3,
    0,
    100,
  );
  const legacyGrowth = clamp((s.monthlyRevenue / (s.initialCapital * 0.15)) * 100, 0, 100);
  const grossProfit = s.monthlyRevenue * (1 - s.cogsRatio);
  const fixedNormal = monthlyFixedCost(s) + salaryGapPerMonth(s);
  const coverage = fixedNormal > 0 ? grossProfit / fixedNormal : 0;
  const coverageScore = clamp(coverage * 70, 0, 100);
  const startRevenue = Math.max(game.history[0]?.revenue ?? 0, 30 * scaleOf(s));
  const multiple = s.monthlyRevenue / Math.max(1, startRevenue);
  const multipleScore = multiple <= 1 ? 0 : clamp((Math.log2(multiple) / 3) * 100, 0, 100);
  const growth = clamp(0.5 * coverageScore + 0.5 * multipleScore, 0, 100);
  const parts = {
    finance: Math.round(finance),
    growth: Math.round(growth),
    quality: Math.round(s.quality),
    team: Math.round(s.morale),
    reputation: Math.round(s.reputation),
  };
  const weighted =
    finance * SCORE_WEIGHTS.finance +
    growth * SCORE_WEIGHTS.growth +
    s.quality * SCORE_WEIGHTS.quality +
    s.morale * SCORE_WEIGHTS.team +
    s.reputation * SCORE_WEIGHTS.reputation;
  const bankrupt = game.status === 'bankrupt';
  const total = Math.round(clamp(bankrupt ? weighted * 0.4 : weighted, 0, 100));
  const legacyWeighted =
    finance * SCORE_WEIGHTS.finance +
    legacyGrowth * SCORE_WEIGHTS.growth +
    s.quality * SCORE_WEIGHTS.quality +
    s.morale * SCORE_WEIGHTS.team +
    s.reputation * SCORE_WEIGHTS.reputation;
  return {
    total,
    grade: gradeOf(total),
    bankrupt,
    parts,
    legacy: { growth: Math.round(legacyGrowth), total: Math.round(clamp(bankrupt ? legacyWeighted * 0.4 : legacyWeighted, 0, 100)) },
  };
}

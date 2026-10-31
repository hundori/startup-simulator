import type { Game, Score } from './types';
import { clamp, projectedMonthlyProfit } from './rules';

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

/** 교육용 점수 공식. docs/05-SIMULATION-RULES.md 6절 */
export function scoreGame(game: Game): Score {
  const s = game.sim;
  const netCash = s.cash - s.debt;
  const finance = clamp(
    (netCash / s.initialCapital) * 50 + 25 + (projectedMonthlyProfit(s) > 0 ? 15 : 0) - s.dilution * 0.3,
    0,
    100,
  );
  const growth = clamp((s.monthlyRevenue / (s.initialCapital * 0.15)) * 100, 0, 100);
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
  return { total, grade: gradeOf(total), bankrupt, parts };
}

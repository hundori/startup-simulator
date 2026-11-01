// 연차 종료 요약: 지금 회사의 상태, 핵심 위험, 다음 연차에 검증할 과제를 규칙으로 정리한다.

import type { Game } from './types';
import { formatMoney } from './format';
import {
  computeRunway,
  effectiveChurn,
  financialStatus,
  isSalaryCut,
  monthlyFixedCost,
  normalSalaryProfit,
  projectedMonthlyProfit,
  unitEconomics,
  utilization,
} from './rules';

export interface YearSummary {
  title: string;
  rows: { label: string; value: string }[];
  risks: string[];
  checks: string[];
}

const signed = (v: number) => `${v >= 0 ? '+' : '−'}${formatMoney(Math.abs(Math.round(v)))}`;

export function yearSummary(game: Game): YearSummary {
  const s = game.sim;
  const profit = projectedMonthlyProfit(s);
  const runway = computeRunway(s);
  const fin = financialStatus(s);
  const ue = unitEconomics(s);
  const util = utilization(s);
  const churn = effectiveChurn(s);
  const rows = [
    { label: '현금', value: formatMoney(s.cash) },
    {
      label: '월 이익',
      value: `${signed(profit)}${isSalaryCut(s) ? ` (정상 급여 기준 ${signed(normalSalaryProfit(s))})` : ''}`,
    },
    { label: '월 고정비', value: formatMoney(monthlyFixedCost(s)) },
    { label: '런웨이', value: runway === null ? '흑자 구조' : `약 ${runway.toFixed(1)}개월` },
    { label: '재무 상태', value: { crunch: '현금 위기', deficit: '적자', surplus: '흑자' }[fin] },
  ];

  const risks: { text: string; check: string }[] = [];
  if (fin === 'crunch') risks.push({ text: '현금이 부족합니다(현금 위기).', check: '월 고정비를 줄이거나 자금을 확보할 방법을 가장 먼저 검증하세요.' });
  else if (fin === 'deficit') risks.push({ text: `매달 ${formatMoney(Math.abs(Math.round(profit)))} 적자가 이어지고 있습니다.`, check: '매출을 늘릴지 고정비를 줄일지, 몇 개월 안에 손익분기에 닿을 수 있는지 계산해 보세요.' });
  if (ue.ratio !== null && ue.ratio < 3) risks.push({ text: `고객 생애 가치가 확보 비용의 ${ue.ratio.toFixed(1)}배로 3배에 못 미칩니다.`, check: '이탈률을 낮추거나 고객당 이익을 높인 뒤 마케팅을 늘리세요.' });
  if (churn > 0.08) risks.push({ text: `월 이탈률이 ${(churn * 100).toFixed(1)}%로 높습니다.`, check: '이탈한 고객의 이유를 직접 확인하고 품질·서비스 개선을 검증하세요.' });
  if (util > 1) risks.push({ text: `인력 가동률이 ${Math.round(util * 100)}%로 한계를 넘었습니다.`, check: '채용·외주·자동화 중 병목을 푸는 방법을 검증하세요.' });
  if (s.morale < 45) risks.push({ text: `팀 사기가 ${Math.round(s.morale)}점으로 낮습니다.`, check: '팀의 부담과 보상, 역할을 점검하세요.' });
  if (isSalaryCut(s)) risks.push({ text: '급여 삭감 상태가 이어지고 있습니다.', check: '정상 급여로 복원해도 흑자가 유지되는지 확인하세요.' });
  if (s.debt > 0) risks.push({ text: `부채 ${formatMoney(s.debt)}에 매달 이자가 나갑니다.`, check: '상환 계획과 이자 부담이 런웨이에 미치는 영향을 계산하세요.' });
  if (risks.length === 0) risks.push({ text: '지금은 뚜렷한 위험 신호가 없습니다.', check: `${game.stage === 3 ? '성과를 유지하며' : '다음 연차에서'} 성장 속도와 수익성의 균형을 검증하세요.` });

  return {
    title: `${game.stage}년 차 종료 요약 (${s.month}개월 시점)`,
    rows,
    risks: risks.slice(0, 3).map((r) => r.text),
    checks: risks.slice(0, 3).map((r) => r.check),
  };
}

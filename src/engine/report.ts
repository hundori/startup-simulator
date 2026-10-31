// 규칙 기반 최종 학습 보고서. AI를 쓰지 않으며 같은 게임이면 항상 같은 보고서가 나온다.

import type { CbReasonId, DecisionRecord, Game, Score, Verdict } from './types';
import { CB_REASONS, DISCLAIMER_LONG, reasonLabel } from './constants';
import { formatMoney, monthToLabel } from './format';
import { BUSINESS_TYPES, CUSTOMER_TYPES, REVENUE_MODELS } from './templates';
import { scoreGame } from './scoring';
import { withJosa } from './josa';

export interface TurningPoint {
  kind: 'best' | 'worst';
  decision: DecisionRecord;
  impact: number;
}

export interface ReasonStat {
  reason: CbReasonId;
  label: string;
  strong: number;
  ok: number;
  weak: number;
  titles: string[];
  comment: string;
}

export interface Report {
  score: Score;
  headline: string;
  summary: string[];
  turningPoints: TurningPoint[];
  reasons: ReasonStat[];
  discussion: { total: number; avgLength: number; withDissent: number; shortLabel: string };
  questions: string[];
  endNotes: string[];
}

/** 결정 하나의 영향도: 품질·사기·평판 변화(0~100 기준), 고객 수 변화율, 월 매출 변화율의 합 */
export function decisionImpact(d: DecisionRecord): number {
  const dq = d.afterPeriod.quality - d.before.quality;
  const dm = d.afterPeriod.morale - d.before.morale;
  const dr = d.afterPeriod.reputation - d.before.reputation;
  const dc = (d.afterPeriod.customers - d.before.customers) / Math.max(20, d.before.customers);
  const dv =
    (d.afterPeriod.monthlyRevenue - d.before.monthlyRevenue) / Math.max(50, d.before.monthlyRevenue);
  return (dq + dm + dr) / 100 + dc + dv;
}

function reasonComment(strong: number, ok: number, weak: number): string {
  const total = strong + ok + weak;
  if (total === 0) return '';
  if (weak === 0 && strong > 0) return '이 위험을 잘 다뤘습니다. 선택의 근거도 함께 점검해 보세요.';
  if (weak > strong) return '이 위험에 취약했습니다. 어떤 정보가 있었다면 다른 선택을 했을지 토론해 보세요.';
  return '절반은 맞고 절반은 아쉬운 대응이었습니다. 어디서 갈렸는지 비교해 보세요.';
}

const QUESTION_BY_PART: Record<keyof Score['parts'], string[]> = {
  finance: [
    '우리 회사의 현금이 줄어드는 속도를 가장 빨리 늦출 수 있었던 결정은 무엇이었나?',
    '투자·대출·비용 절감 중 어떤 선택이 가장 후회되는가? 그 이유는?',
  ],
  growth: [
    '고객이 늘어도 매출이 늘지 않았다면 가격·이탈·고객 유형 중 무엇이 원인이었나?',
    '성장을 위해 썼던 비용 중 실제로 고객을 남긴 것은 무엇인가?',
  ],
  quality: [
    '품질이 떨어지기 시작한 시점은 언제이며, 그 전에 어떤 신호가 있었나?',
    '인력 부족과 품질 저하는 어떤 순서로 연결되었나?',
  ],
  team: [
    '팀 사기를 올린 결정과 떨어뜨린 결정은 각각 무엇이었나?',
    '의견이 갈렸을 때 우리 팀은 어떻게 결론을 냈으며, 다음엔 무엇을 바꾸겠는가?',
  ],
  reputation: [
    '평판은 어떤 결정 직후에 가장 크게 변했나? 고객은 무엇을 보고 판단했을까?',
    '평판을 지키기 위해 단기 비용을 감수한 적이 있는가?',
  ],
};

export function generateReport(game: Game): Report {
  const score = scoreGame(game);
  const { setup, sim, decisions, history } = game;
  const start = history[0];
  const end = history[history.length - 1];
  const bankrupt = game.status === 'bankrupt';
  const bt = BUSINESS_TYPES[setup.businessType];

  const headline = bankrupt
    ? `${setup.companyName}: ${monthToLabel(sim.month)}에 파산했습니다 (종합 ${score.total}점, 등급 ${score.grade})`
    : `${setup.companyName}: 3년을 버텼습니다 (종합 ${score.total}점, 등급 ${score.grade})`;

  const summary = [
    `${bt.label} · ${CUSTOMER_TYPES[setup.customerType].label} · ${REVENUE_MODELS[setup.revenueModel].label} 모델로 ${withJosa(formatMoney(setup.capital), '을/를')} 들여 시작했습니다.`,
    `${withJosa(bt.customerWord, '은/는')} ${start.customers.toLocaleString('ko-KR')}명에서 ${withJosa(`${end.customers.toLocaleString('ko-KR')}명`, '으로/로')}, 월 매출은 ${formatMoney(start.revenue)}에서 ${withJosa(formatMoney(end.revenue), '으로/로')} 변했습니다.`,
    `현금은 ${formatMoney(start.cash)}에서 ${withJosa(formatMoney(end.cash), '이/가')} 되었고, 부채는 ${formatMoney(sim.debt)}, 지분 희석은 ${sim.dilution}%입니다.`,
    `제품 품질 ${start.quality}→${end.quality}, 팀 사기 ${start.morale}→${end.morale}, 평판 ${start.reputation}→${withJosa(String(end.reputation), "으로/로")} 마쳤습니다.`,
  ];

  const ranked = decisions
    .map((d) => ({ d, impact: decisionImpact(d) }))
    .sort((a, b) => b.impact - a.impact);
  const turningPoints: TurningPoint[] = [];
  if (ranked.length > 0) {
    turningPoints.push({ kind: 'best', decision: ranked[0].d, impact: ranked[0].impact });
    if (ranked.length > 1) {
      const worst = ranked[ranked.length - 1];
      turningPoints.push({ kind: 'worst', decision: worst.d, impact: worst.impact });
    }
  }

  const byReason = new Map<CbReasonId, ReasonStat>();
  for (const d of decisions) {
    const cur =
      byReason.get(d.reason) ??
      ({
        reason: d.reason,
        label: reasonLabel(d.reason),
        strong: 0,
        ok: 0,
        weak: 0,
        titles: [],
        comment: '',
      } as ReasonStat);
    cur[d.verdict as Verdict] += 1;
    cur.titles.push(d.eventTitle);
    byReason.set(d.reason, cur);
  }
  const reasons = Array.from(byReason.values()).map((r) => ({
    ...r,
    label: CB_REASONS[r.reason].label,
    comment: reasonComment(r.strong, r.ok, r.weak),
  }));

  const lengths = decisions.map((d) => d.rationale.length);
  const avg = lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0;
  const withDissent = decisions.filter((d) => d.dissent.length > 0).length;
  const discussion = {
    total: decisions.length,
    avgLength: avg,
    withDissent,
    shortLabel:
      withDissent === 0
        ? '반대 의견을 기록한 결정이 없습니다. 다음에는 소수 의견도 남겨 보세요.'
        : `${decisions.length}개 결정 중 ${withDissent}개에 반대 의견·검토한 다른 대안을 남겼습니다.`,
  };

  const lowest = (Object.entries(score.parts) as [keyof Score['parts'], number][]).sort(
    (a, b) => a[1] - b[1],
  )[0][0];
  const questions = QUESTION_BY_PART[lowest];

  const endNotes: string[] = [];
  if (bankrupt) {
    const last = decisions[decisions.length - 1];
    endNotes.push(
      `파산은 "${last?.eventTitle ?? '창업 직후'}" 결정 이후 ${last?.monthsElapsed ?? 0}개월 안에 일어났습니다. 현금이 마이너스가 되기 전 어느 시점에 무엇을 바꿀 수 있었는지 되짚어 보세요.`,
    );
  }
  if (sim.debt > 0) endNotes.push(`종료 시점 부채가 ${formatMoney(sim.debt)} 남아 있습니다.`);
  endNotes.push(DISCLAIMER_LONG);

  return { score, headline, summary, turningPoints, reasons, discussion, questions, endNotes };
}

export function reportToMarkdown(game: Game, report: Report): string {
  const lines: string[] = [];
  lines.push(`# ${game.setup.companyName} — Startup Simulator 학습 보고서`, '');
  lines.push(`> ${report.headline}`, '');
  lines.push('## 사업 아이디어', '', game.setup.idea, '', `대상 고객: ${game.setup.targetCustomer}`, '');
  lines.push('## 결과 요약', '', ...report.summary.map((s) => `- ${s}`), '');
  lines.push(
    '## 점수',
    '',
    `종합 ${report.score.total}점 (${report.score.grade}) — 재무 ${report.score.parts.finance}, 성장 ${report.score.parts.growth}, 품질 ${report.score.parts.quality}, 팀 ${report.score.parts.team}, 평판 ${report.score.parts.reputation}`,
    '',
  );
  if (report.turningPoints.length) {
    lines.push('## 주요 전환점', '');
    for (const t of report.turningPoints) {
      lines.push(
        `- ${t.kind === 'best' ? '가장 좋았던 결정' : '가장 아쉬웠던 결정'}: ${t.decision.eventTitle} → ${t.decision.optionLabel}`,
      );
    }
    lines.push('');
  }
  lines.push('## 실패 요인별 대응', '');
  for (const r of report.reasons) {
    lines.push(`- ${r.label}: 잘함 ${r.strong}, 보통 ${r.ok}, 아쉬움 ${r.weak}. ${r.comment}`);
  }
  lines.push('', '## 의사결정 기록', '');
  game.decisions.forEach((d, i) => {
    lines.push(
      `### ${i + 1}. ${d.eventTitle}`,
      '',
      `- 선택: ${d.optionLabel}`,
      `- 토론 근거: ${d.rationale}`,
      d.dissent ? `- 반대 의견·검토한 대안: ${d.dissent}` : '- 반대 의견: (기록 없음)',
      `- 결과: ${d.outcomeText}`,
      '',
    );
  });
  lines.push('## 다음 토론 질문', '', ...report.questions.map((q) => `- ${q}`), '');
  lines.push('---', '', ...report.endNotes.map((n) => `*${n}*`));
  return lines.join('\n');
}

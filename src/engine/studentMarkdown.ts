// 학생용 요약 보고서를 마크다운으로 내보낸다. 상세 기록은 reportToMarkdown(별도 파일)이 맡는다.
import type { Game } from './types';
import { DISCLAIMER_LONG } from './constants';
import type { DecisionCard, StudentReport } from './studentReport';

function cardLines(c: DecisionCard): string[] {
  const hasDirect = c.rows.some((r) => r.afterDirect !== null);
  const out = [`### ${c.kind} — ${c.whenLabel}, ${c.eventTitle}`, '', `- 당시 상황: ${c.situation}`, `- 우리의 선택: ${c.chosen}`];
  if (c.directLines.length) out.push(`- 선택 직후: ${c.directLines.join(' / ')}`);
  if (c.periodLines.length) out.push(`- 이후 ${c.months}개월: ${c.periodLines[0]}`);
  if (c.gained.length) out.push(`- 얻은 것: ${c.gained.join(', ')}`);
  if (c.paid.length) out.push(`- 치른 대가: ${c.paid.join(', ')}`);
  out.push('', hasDirect ? '| 지표 | 선택 전 | 선택 직후 | 기간 종료 |' : '| 지표 | 선택 전 | 기간 종료(선택 포함) |', hasDirect ? '|---|---|---|---|' : '|---|---|---|');
  for (const r of c.rows) out.push(hasDirect ? `| ${r.label} | ${r.before} | ${r.afterDirect} | ${r.afterPeriod} |` : `| ${r.label} | ${r.before} | ${r.afterPeriod} |`);
  for (const n of c.notices) out.push('', `> ${n}`);
  out.push('');
  return out;
}

export function summaryToMarkdown(game: Game, r: StudentReport): string {
  const L: string[] = [`# ${game.setup.companyName} — 최종 요약 보고서`, '', '## A. 최종 결과', '', r.result.sentence, ''];
  L.push('| 항목 | 값 | 설명 |', '|---|---|---|');
  for (const f of r.result.figures) L.push(`| ${f.label} | ${f.value} | ${f.sub ?? ''} |`);
  L.push('', `참고: 종합 점수 ${r.result.score.total}/100 (등급 ${r.result.score.grade}) — 회사 성과 점수이며 계산 방식은 앱의 “계산 방식 보기”에서 확인합니다.`, '');
  L.push('## B. 핵심 결정', '');
  if (r.key.length === 0) L.push(r.keyEmptyNote ?? '', '');
  for (const c of r.key) L.push(...cardLines(c));
  L.push('## C. 다시 고민해 볼 결정', '');
  if (r.reconsider) {
    L.push(...cardLines(r.reconsider.card), ...r.reconsider.reasons.map((x) => `- ${x}`), '', `토론 질문: ${r.reconsider.question}`, '');
  } else L.push(r.reconsiderEmptyNote ?? '', '');
  L.push('## D. 우리 팀 토론 질문', '', ...r.questions.map((q, i) => `${i + 1}. ${q}`), '');
  L.push('## 연도별 요약', '', '| 연도 | 말 시점 | 현금 | 월 매출 | 고객 | 인원 |', '|---|---|---|---|---|---|');
  for (const y of r.years) L.push(`| ${y.year}년 차 | ${y.endMonth}개월 | ${y.cash}만원 | ${y.revenue}만원 | ${Math.round(y.customers)}명 | ${y.headcount}명 |`);
  L.push('', '---', `*${DISCLAIMER_LONG}*`, '*전체 결정 기록은 별도로 내려받는 상세 기록 파일에 있습니다.*');
  return L.join('\n');
}

// 결과보고서를 마크다운으로 내보낸다. 상세 기록은 reportToMarkdown(별도 파일)이 맡는다.
import type { Game } from './types';
import { DISCLAIMER_LONG } from './constants';
import type { DecisionCard } from './studentReport';
import type { ResultReport } from './resultReport';
import { formatMoney } from './format';

const money = (v: number) => formatMoney(v).replace('-', '−');
const sg = (v: number) => (v === 0 ? '0만원' : `${v > 0 ? '+' : '−'}${formatMoney(Math.abs(v))}`);

function cardLines(c: DecisionCard): string[] {
  const hasDirect = c.rows.some((r) => r.afterDirect !== null);
  const out = [`### ${c.kind} — ${c.whenLabel}, ${c.eventTitle}`, '', `- 당시 상황: ${c.situation}`, `- 우리의 선택: ${c.chosen}`];
  if (c.directLines.length) out.push(`- 선택 직후: ${c.directLines.join(' / ')}`);
  if (c.periodLines.length) out.push(`- 이후 ${c.months}개월 운영 결과(선택만의 효과로 단정할 수 없음): ${c.periodLines[0]}`);
  if (c.gained.length) out.push(`- 얻은 것(선택 직후): ${c.gained.join(', ')}`);
  if (c.paid.length) out.push(`- 치른 대가(선택 직후): ${c.paid.join(', ')}`);
  out.push('', hasDirect ? '| 지표 | 선택 전 | 선택 직후 | 기간 종료 |' : '| 지표 | 선택 전 | 기간 종료(선택 포함) |', hasDirect ? '|---|---|---|---|' : '|---|---|---|');
  for (const r of c.rows) out.push(hasDirect ? `| ${r.label} | ${r.before} | ${r.afterDirect} | ${r.afterPeriod} |` : `| ${r.label} | ${r.before} | ${r.afterPeriod} |`);
  if (c.effects) {
    out.push('', '| 변화 | 선택 직후 | 시간 경과 | 시장 요인 | 합계 |', '|---|---|---|---|---|');
    for (const e of c.effects.rows) out.push(`| ${e.label} | ${e.direct} | ${e.time ?? '알 수 없음'} | ${e.market ?? '알 수 없음'} | ${e.total} |`);
    out.push('', `> ${c.effects.note}`);
  }
  out.push('', `> 시나리오 서술(교육용 설명, 계산으로 검증된 원인이 아님): ${c.scenario}`);
  for (const n of c.notices) out.push('', `> ${n}`);
  out.push('');
  return out;
}

export function summaryToMarkdown(game: Game, r: ResultReport): string {
  const L: string[] = [`# ${game.setup.companyName} — 결과보고서`, '', '## 1. 최종 결과', '', r.result.sentence, ''];
  L.push('| 항목 | 값 | 설명 |', '|---|---|---|');
  for (const f of r.result.figures) L.push(`| ${f.label} | ${f.value} | ${f.sub ?? ''} |`);
  L.push('', `참고: 종합 점수 ${r.result.score.total}/100 (등급 ${r.result.score.grade}) — 회사 성과 점수이며 보조 지표입니다.`, '');
  L.push(`## 2. ${r.cause.title}`, '', r.cause.sentence, '', ...r.cause.facts.map((f) => `- ${f}`), '', `> ${r.cause.caution}`, '');
  L.push('판정 규칙:', ...r.cause.rule.map((x) => `- ${x}`), '');
  if (r.cause.parts.length) {
    L.push('| 구성 | 금액 |', '|---|---|');
    for (const p of r.cause.parts) L.push(`| ${p.label} | ${p.value} |`);
    L.push('');
  }
  L.push(`## 3. 결정적 의사결정 ${r.decisive.length}개`, '');
  for (const d of r.decisive) L.push(...cardLines(d.card), `선정 이유: ${d.why}`, '');
  L.push('## 4. 다시 선택할 대안', '');
  if (r.alternative) {
    const a = r.alternative;
    L.push(
      `${a.whenLabel} ${a.eventTitle}에서 ‘${a.original.label}’ 대신 ‘${a.alternative.label}’을 골랐다면 ${a.months}개월 뒤 현금이 ${money(a.original.end.cash)}에서 ${money(a.alternative.end.cash)}으로 달라졌습니다(차이 ${sg(a.cashGain)}).${a.prevents ? ' 실제 선택은 이 기간에 파산했지만 이 대안은 파산하지 않았습니다.' : ''}`,
      '',
      '| 항목 | 실제 선택 | 대안 |',
      '|---|---|---|',
      `| 일회성 지출 | ${money(a.original.oneTimeCost)} | ${money(a.alternative.oneTimeCost)} |`,
      `| 월 고정비 변화 | ${sg(a.original.fixedDelta)} | ${sg(a.alternative.fixedDelta)} |`,
      `| 기간 종료 현금 | ${money(a.original.end.cash)} | ${money(a.alternative.end.cash)} |`,
      `| 기간 종료 월 이익 | ${sg(a.original.end.monthlyProfit)} | ${sg(a.alternative.end.monthlyProfit)} |`,
      `| 기간 종료 고객 수 | ${Math.round(a.original.end.customers)}명 | ${Math.round(a.alternative.end.customers)}명 |`,
      '',
      ...a.caveats.map((c) => `> ${c}`),
      '',
    );
  } else L.push(r.alternativeNote ?? '', '');
  L.push('## 5. 토론 질문', '', ...r.questions.map((q, i) => `${i + 1}. ${q}`), '');
  L.push('## 부록: 월별 현금 잔액', '', '| 개월 | 월말 현금 | 판정 |', '|---|---|---|');
  for (const m of r.details.monthlyCash) L.push(`| ${m.month} | ${money(m.cash)} | ${m.atOrBelowZero ? '0원 이하 → 파산' : '정상'} |`);
  L.push('', '## 부록: 연도별 요약', '', '| 연도 | 말 시점 | 현금 | 월 매출 | 고객 | 인원 |', '|---|---|---|---|---|---|');
  for (const y of r.details.years) L.push(`| ${y.year}년 차 | ${y.endMonth}개월 | ${money(y.cash)} | ${formatMoney(y.revenue)} | ${Math.round(y.customers)}명 | ${y.headcount}명 |`);
  for (const y of r.details.years) if (y.customerNote) L.push('', `- ${y.year}년 차 고객 수: ${y.customerNote}`);
  L.push('', '---', `*${DISCLAIMER_LONG}*`, '*전체 결정 기록은 별도로 내려받는 상세 기록 파일에 있습니다.*');
  return L.join('\n');
}

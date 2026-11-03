'use client';

import type { Game } from '@/engine';
import AdvisorPicker from './AdvisorPicker';
import {
  DISCLAIMER_LONG,
  buildStudentReport,
  cardForDecision,
  explainReport,
  formatMoney,
  generateReport,
  monthToLabel,
  reportToMarkdown,
  summaryToMarkdown,
} from '@/engine';
import Assumptions from './Assumptions';
import DecisionCardView from './DecisionCardView';
import TrendCharts from './TrendCharts';
import WhatIf from './WhatIf';
import { Badge, Button, Callout, VERDICT_LABEL } from './ui';

function save(name: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinalReport({ game, onRestart }: { game: Game; onRestart: () => void }) {
  const sr = buildStudentReport(game);
  const bankrupt = game.status === 'bankrupt';
  const name = game.setup.companyName;
  const shownIdx = new Set<number>([...sr.key.map((k) => k.index), ...(sr.reconsider ? [sr.reconsider.card.index] : [])]);

  // 상세 자료는 열 때만 계산한다(요약 화면과 인쇄에는 필요 없다).
  const detailText = () => reportToMarkdown(game, generateReport(game));

  return (
    <article className="max-w-4xl space-y-10">
      <header>
        <p className="text-sm text-muted">{name} · 최종 요약 보고서</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{sr.result.sentence}</h1>
      </header>

      {/* A. 최종 결과 */}
      <section aria-labelledby="a-h" className="space-y-3">
        <h2 id="a-h" className="text-lg font-semibold">A. 최종 결과</h2>
        {bankrupt ? (
          <Callout tone="danger" title="파산으로 끝난 게임입니다">
            어느 결정에서 현금이 꺾였는지 아래 핵심 결정과 다시 고민할 결정에서 확인하세요.
          </Callout>
        ) : null}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sr.result.figures.map((f) => (
            <div key={f.label} className="rounded-md border border-line bg-surface p-3">
              <dt className="text-xs text-muted">{f.label}</dt>
              <dd className="num mt-0.5 text-xl font-bold">{f.value}</dd>
              {f.sub ? <p className="mt-0.5 text-xs text-muted">{f.sub}</p> : null}
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted">
          참고 · 회사 성과 점수 <span className="num font-semibold text-ink">{sr.result.score.total}/100</span> (등급 {sr.result.score.grade}). 위 네 가지 숫자가 우선이고, 점수는 보조 지표입니다.
        </p>
        <details className="rounded-md border border-line bg-surface text-sm">
          <summary className="cursor-pointer px-4 py-3 font-semibold">계산 방식 보기</summary>
          <div className="space-y-3 border-t border-line px-4 py-3">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5">
              {sr.result.score.parts.map((p) => (
                <div key={p.label}><dt className="text-xs text-muted">{p.label}</dt><dd className="num font-semibold">{p.value}</dd></div>
              ))}
            </dl>
            <Assumptions basis={explainReport(game)} />
          </div>
        </details>
      </section>

      {/* B. 핵심 결정 */}
      <section aria-labelledby="b-h" className="space-y-3">
        <h2 id="b-h" className="text-lg font-semibold">B. 회사를 바꾼 핵심 결정</h2>
        {sr.key.length === 0 ? <p className="text-sm text-muted">{sr.keyEmptyNote}</p> : null}
        {sr.key.map((c) => (
          <DecisionCardView key={c.index} card={c} />
        ))}
      </section>

      {/* C. 다시 고민할 결정 */}
      <section aria-labelledby="c-h" className="space-y-3">
        <h2 id="c-h" className="text-lg font-semibold">C. 다시 고민해 볼 결정</h2>
        {sr.reconsider ? (
          <>
            <DecisionCardView card={sr.reconsider.card} tone="warn" />
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {sr.reconsider.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="rounded-md border border-line bg-paper px-3 py-2 text-sm"><strong>토론 질문:</strong> {sr.reconsider.question}</p>
          </>
        ) : (
          <p className="text-sm text-muted">{sr.reconsiderEmptyNote}</p>
        )}
      </section>

      {/* D. 토론 질문 */}
      <section aria-labelledby="d-h" className="space-y-2">
        <h2 id="d-h" className="text-lg font-semibold">D. 우리 팀 토론 질문</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {sr.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </section>

      {/* 3년 추이: 연도별 요약 한 표 */}
      <section aria-labelledby="y-h" className="space-y-2">
        <h2 id="y-h" className="text-lg font-semibold">연도별 요약</h2>
        <div className="overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full min-w-[30rem] text-sm">
            <caption className="sr-only">연도 말 시점의 현금·월 매출·고객·인원과 그 해의 결정</caption>
            <thead className="bg-paper text-left text-xs text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">연도</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">현금</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">월 매출</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">고객</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">인원</th>
                <th scope="col" className="px-3 py-2 font-semibold">이 해의 핵심 결정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sr.years.map((y) => {
                const links = y.decisionIndexes.filter((i) => shownIdx.has(i));
                return (
                  <tr key={y.year}>
                    <th scope="row" className="px-3 py-2 text-left font-normal">{y.year}년 차<span className="block text-xs text-muted">{y.endMonth}개월 시점</span></th>
                    <td className="num px-3 py-2 text-right">{formatMoney(y.cash)}</td>
                    <td className="num px-3 py-2 text-right">{formatMoney(y.revenue)}</td>
                    <td className="num px-3 py-2 text-right">{Math.round(y.customers).toLocaleString('ko-KR')}명</td>
                    <td className="num px-3 py-2 text-right">{y.headcount}명</td>
                    <td className="px-3 py-2">
                      {links.length ? links.map((i) => (
                        <a key={i} href={`#decision-${i}`} className="mr-2 text-accent-strong underline">{game.decisions[i].eventTitle}</a>
                      )) : <span className="text-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sr.years.filter((y) => y.customerNote).map((y) => (
          <p key={y.year} className="rounded-md border border-line bg-paper px-3 py-2 text-sm leading-relaxed">
            <strong>{y.year}년 차 고객 수:</strong> {y.customerNote}
          </p>
        ))}
      </section>

      {sr.legacyCount > 0 ? <Callout tone="info">{sr.legacyCount}개 결정은 이전 기록이라 선택 직후 수치가 없습니다. 해당 카드에는 이후 운영 결과가 포함된 변화만 표시됩니다.</Callout> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => save(`${name}-요약보고서.md`, summaryToMarkdown(game, sr))}>요약 보고서 내려받기 (.md)</Button>
        <Button variant="secondary" onClick={() => save(`${name}-상세기록.md`, detailText())}>상세 기록 내려받기 (.md)</Button>
        <Button variant="secondary" onClick={() => window.print()}>요약 인쇄 / PDF 저장</Button>
        <Button variant="danger" onClick={onRestart}>새 게임 시작</Button>
      </div>

      {/* 상세: 전체 결정 기록 · 학습자료 · 계산 안내 (인쇄에는 포함하지 않는다) */}
      <details className="rounded-md border border-line bg-surface print:hidden">
        <summary className="cursor-pointer px-4 py-3 font-semibold">전체 결정 기록 · 학습자료 · 계산 안내 <span className="font-normal text-muted">(눌러서 보기)</span></summary>
        <Details game={game} />
      </details>

      <p className="text-xs text-muted">{DISCLAIMER_LONG}</p>
    </article>
  );
}

function Details({ game }: { game: Game }) {
  const report = generateReport(game);
  return (
    <div className="space-y-8 border-t border-line px-4 py-5">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">전체 결정 기록</h2>
        <p className="text-sm text-muted">모든 결정의 선택 전·직후·기간 종료 수치입니다. “다른 선택이었다면?”은 저장된 기록을 바꾸지 않습니다.</p>
        {game.decisions.map((d, i) => (
          <div key={`${d.eventId}-${i}`} className="space-y-2">
            <p className="text-xs text-muted">
              {i + 1}번째 · {monthToLabel(d.month).replace(/ 시점$/, '')} 시점 · 판정 {VERDICT_LABEL[d.verdict]}
            </p>
            <DecisionCardView card={cardForDecision(game, i)} anchor={false} />
            <p className="whitespace-pre-wrap text-sm text-muted">우리의 근거: {d.rationale}</p>
            {d.dissent ? <p className="whitespace-pre-wrap text-sm text-muted">반대 의견: {d.dissent}</p> : null}
            <WhatIf game={game} index={i} />
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3년 성과 추이</h2>
        <TrendCharts history={game.history} />
      </section>

      {report.salary ? (
        <section>
          <h2 className="mb-1 text-lg font-semibold">무급여·급여 삭감 이력</h2>
          <p className="text-sm">
            삭감 상태로 보낸 기간 <span className="num">{report.salary.months}</span>개월{report.salary.active ? ' (종료 시점에도 삭감 중)' : ' (종료 전 복원됨)'} · 팀이 개인적으로 떠안은 금액 <span className="num">{formatMoney(report.salary.burden)}</span> (회사 현금에서는 차감하지 않음)
          </p>
          <p className="num mt-1 text-sm text-muted">현재 급여 기준 월 이익 {formatMoney(report.salary.currentProfit)} · 정상 급여를 지급한다면 월 이익 {formatMoney(report.salary.normalProfit)}</p>
        </section>
      ) : null}

      <section>
        <h2 className="mb-1 text-lg font-semibold">판단 성향 · 학습 기록 (회사 성과 점수와 별개)</h2>
        <p className="num text-sm">좋음 {report.learning.verdicts.strong} · 보통 {report.learning.verdicts.ok} · 아쉬움 {report.learning.verdicts.weak}</p>
        <p className="mt-1 text-sm text-muted">{report.learning.note}</p>
        <p className="mt-1 text-sm text-muted">
          결정 {report.discussion.total}건 · 평균 근거 길이 <span className="num">{report.discussion.avgLength}</span>자 · 반대 의견 기록 <span className="num">{report.discussion.withDissent}</span>건 — {report.discussion.shortLabel}
        </p>
      </section>

      {report.turningPoints.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold">전환점 후보 (규칙 기반)</h2>
          <ul className="space-y-3">
            {report.turningPoints.map((t) => (
              <li key={t.kind} className="rounded-md border border-line bg-surface p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <Badge tone={t.kind === 'best' ? 'good' : 'warn'}>{t.kind === 'best' ? '가장 좋았던 결정' : '가장 아쉬웠던 결정'}</Badge>
                  <span className="text-muted">판정 {VERDICT_LABEL[t.decision.verdict]}</span>
                </p>
                <p className="mt-1 font-semibold">{t.decision.eventTitle} — {t.decision.optionLabel}</p>
                {t.note ? <p className="mt-1">{t.note}</p> : null}
              </li>
            ))}
          </ul>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
            {report.turningCriteria.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </section>
      ) : null}

      {report.reasons.length > 0 ? (
        <section>
          <h2 className="mb-1 text-lg font-semibold">CB Insights 실패 요인 분류로 본 대응</h2>
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {report.reasons.map((r) => (
              <li key={r.reason} className="px-4 py-3 text-sm">
                <p className="font-semibold">{r.label}</p>
                <p className="num text-muted">좋음 {r.strong} · 보통 {r.ok} · 아쉬움 {r.weak} — {r.titles.join(', ')}</p>
                <p className="mt-1">{r.comment}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AdvisorPicker game={game} />

      {report.choiceInsights.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold">선택별 고정비·런웨이 인사이트</h2>
          <ul className="space-y-3">
            {report.choiceInsights.map((i) => (
              <li key={i.eyebrow} className="rounded-md border border-line bg-surface p-3 text-sm">
                <p className="text-xs text-muted">{i.eyebrow}</p>
                <p className="font-semibold">{i.title}{i.tag ? <> <Badge tone="accent">{i.tag}</Badge></> : null}</p>
                <p className="mt-1 leading-relaxed text-muted">{i.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-lg font-semibold">이 시뮬레이션에서 읽을 수 있는 것</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {report.insights.map((i) => (
            <li key={i.title} className="rounded-md border border-line bg-surface p-3 text-sm">
              <p className="font-semibold">{i.title}</p>
              <p className="mt-1 leading-relaxed text-muted">{i.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">실제 창업에 가져갈 원칙</h2>
        <ol className="space-y-3">
          {report.principles.map((i, n) => (
            <li key={i.title} className="flex gap-3 text-sm">
              <span className="num mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">{n + 1}</span>
              <span><span className="block font-semibold">{i.title}</span><span className="mt-0.5 block leading-relaxed text-muted">{i.text}</span></span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">수업에서 이어서 토론할 질문</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">{report.questions.map((q) => <li key={q}>{q}</li>)}</ol>
      </section>

      {report.endNotes.filter((n) => n !== DISCLAIMER_LONG).length > 0 ? (
        <Callout tone="info" title="해석할 때 유의할 점">
          <ul className="list-disc pl-5">{report.endNotes.filter((n) => n !== DISCLAIMER_LONG).map((n) => <li key={n}>{n}</li>)}</ul>
        </Callout>
      ) : null}
    </div>
  );
}

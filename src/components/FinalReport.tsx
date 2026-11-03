'use client';

import type { Game } from '@/engine';
import {
  DISCLAIMER_LONG,
  buildStudentReport,
  explainReport,
  formatMoney,
  generateReport,
  reportToMarkdown,
  summaryToMarkdown,
} from '@/engine';
import Assumptions from './Assumptions';
import DecisionCardView from './DecisionCardView';
import { Button, Callout } from './ui';

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

      <p className="text-xs text-muted">{DISCLAIMER_LONG}</p>
    </article>
  );
}

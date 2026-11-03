'use client';

import type { Game } from '@/engine';
import { DISCLAIMER_LONG, buildResultReport, explainReport, formatMoney, generateReport, reportToMarkdown, summaryToMarkdown } from '@/engine';
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

const money = (v: number) => formatMoney(v).replace('-', '−');
const sg = (v: number) => (v === 0 ? '0만원' : `${v > 0 ? '+' : '−'}${formatMoney(Math.abs(v))}`);

export default function FinalReport({ game, onRestart }: { game: Game; onRestart: () => void }) {
  const r = buildResultReport(game);
  const name = game.setup.companyName;
  const alt = r.alternative;
  const bankrupt = game.status === 'bankrupt';

  return (
    <article className="max-w-4xl space-y-10">
      <header>
        <p className="text-sm text-muted">{name} · 결과보고서</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{r.result.sentence}</h1>
      </header>

      {/* 1. 최종 결과 */}
      <section aria-labelledby="r1-h" className="space-y-3">
        <h2 id="r1-h" className="text-lg font-semibold">1. 최종 결과</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {r.result.figures.map((f) => (
            <div key={f.label} className="rounded-md border border-line bg-surface p-3">
              <dt className="text-xs text-muted">{f.label}</dt>
              <dd className="num mt-0.5 text-xl font-bold">{f.value}</dd>
              {f.sub ? <p className="mt-0.5 text-xs text-muted">{f.sub}</p> : null}
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted">
          참고 · 회사 성과 점수 <span className="num font-semibold text-ink">{r.result.score.total}/100</span> (등급 {r.result.score.grade}). 위 네 가지 숫자가 우선이고 점수는 보조 지표입니다.
        </p>
      </section>

      {/* 2. 파산 원인 */}
      <section aria-labelledby="r2-h" className="space-y-3">
        <h2 id="r2-h" className="text-lg font-semibold">2. {r.cause.title}</h2>
        <Callout tone={bankrupt ? 'danger' : 'info'}>{r.cause.sentence}</Callout>
        {r.cause.facts.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {r.cause.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs leading-relaxed text-muted">{r.cause.caution}</p>
        <details className="rounded-md border border-line bg-surface text-sm">
          <summary className="cursor-pointer select-none px-4 py-3 font-semibold">파산 판정 규칙과 현금 구성 보기</summary>
          <div className="space-y-3 border-t border-line px-4 py-3">
            <ul className="list-disc space-y-1 pl-5">
              {r.cause.rule.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            {r.cause.parts.length > 0 ? (
              <table className="w-full text-sm">
                <caption className="sr-only">시작 현금에서 최종 현금까지의 구성</caption>
                <tbody className="divide-y divide-line">
                  {r.cause.parts.map((p) => (
                    <tr key={p.label}>
                      <th scope="row" className="py-1.5 pr-2 text-left font-normal">{p.label}</th>
                      <td className="num py-1.5 text-right font-semibold">{p.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {r.cause.bridgeOk !== null ? <p className="text-xs text-muted">검산: 시작 현금 + 선택 직접 변화 + 영업 현금흐름 = 최종 현금 ({r.cause.bridgeOk ? '일치' : '차이 있음'}).</p> : null}
          </div>
        </details>
      </section>

      {/* 3. 결정적 의사결정 2개 */}
      <section aria-labelledby="r3-h" className="space-y-3">
        <h2 id="r3-h" className="text-lg font-semibold">3. 결정적 의사결정 {r.decisive.length}개</h2>
        {r.decisive.length === 0 ? <p className="text-sm text-muted">현금이나 고정비를 뚜렷하게 바꾼 결정이 기록되지 않았습니다.</p> : null}
        {r.decisive.map((d) => (
          <div key={d.card.index} className="space-y-2">
            <DecisionCardView card={d.card} tone={bankrupt ? 'warn' : 'brass'} />
            <p className="text-xs leading-relaxed text-muted">선정 이유: {d.why}</p>
          </div>
        ))}
      </section>

      {/* 4. 다시 선택할 대안 */}
      <section aria-labelledby="r4-h" className="space-y-3">
        <h2 id="r4-h" className="text-lg font-semibold">4. 다시 선택할 대안</h2>
        {alt ? (
          <>
            <p className="text-sm leading-relaxed">
              {alt.whenLabel} <strong>{alt.eventTitle}</strong>에서 ‘{alt.original.label}’ 대신 <strong>‘{alt.alternative.label}’</strong>을 골랐다면, {alt.months}개월 뒤 현금이 {money(alt.original.end.cash)}에서 {money(alt.alternative.end.cash)}으로 달라졌습니다(차이 {sg(alt.cashGain)}).
              {alt.prevents ? ' 실제 선택은 이 기간에 파산했지만 이 대안은 파산하지 않았습니다.' : ''}
            </p>
            <div className="overflow-x-auto rounded-md border border-line bg-surface">
              <table className="w-full min-w-[22rem] text-sm">
                <caption className="sr-only">실제 선택과 대안 비교</caption>
                <thead className="bg-paper text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">항목</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">실제 선택</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">대안</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr><th scope="row" className="px-3 py-2 text-left font-normal">일회성 지출</th><td className="num px-3 py-2 text-right">{money(alt.original.oneTimeCost)}</td><td className="num px-3 py-2 text-right">{money(alt.alternative.oneTimeCost)}</td></tr>
                  <tr><th scope="row" className="px-3 py-2 text-left font-normal">월 고정비 변화(매달)</th><td className="num px-3 py-2 text-right">{sg(alt.original.fixedDelta)}</td><td className="num px-3 py-2 text-right">{sg(alt.alternative.fixedDelta)}</td></tr>
                  <tr><th scope="row" className="px-3 py-2 text-left font-normal">기간 종료 현금</th><td className="num px-3 py-2 text-right">{money(alt.original.end.cash)}</td><td className="num px-3 py-2 text-right">{money(alt.alternative.end.cash)}</td></tr>
                  <tr><th scope="row" className="px-3 py-2 text-left font-normal">기간 종료 월 이익</th><td className="num px-3 py-2 text-right">{sg(alt.original.end.monthlyProfit)}</td><td className="num px-3 py-2 text-right">{sg(alt.alternative.end.monthlyProfit)}</td></tr>
                  <tr><th scope="row" className="px-3 py-2 text-left font-normal">기간 종료 고객 수</th><td className="num px-3 py-2 text-right">{Math.round(alt.original.end.customers).toLocaleString('ko-KR')}명</td><td className="num px-3 py-2 text-right">{Math.round(alt.alternative.end.customers).toLocaleString('ko-KR')}명</td></tr>
                  <tr><th scope="row" className="px-3 py-2 text-left font-normal">기간 종료 품질</th><td className="num px-3 py-2 text-right">{Math.round(alt.original.end.quality)}점</td><td className="num px-3 py-2 text-right">{Math.round(alt.alternative.end.quality)}점</td></tr>
                </tbody>
              </table>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted">
              {alt.caveats.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted">{r.alternativeNote}</p>
        )}
      </section>

      {/* 5. 토론 질문 */}
      <section aria-labelledby="r5-h" className="space-y-2">
        <h2 id="r5-h" className="text-lg font-semibold">5. 토론 질문</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {r.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </section>

      {/* 상세 계산표 */}
      <details className="rounded-md border border-line bg-surface print:hidden">
        <summary className="cursor-pointer select-none px-4 py-3 font-semibold">상세 계산표 보기 <span className="font-normal text-muted">(눌러서 보기)</span></summary>
        <div className="space-y-6 border-t border-line px-4 py-4 text-sm">
          <section className="space-y-2">
            <h3 className="font-semibold">월별 현금 잔액 (파산 판정 확인용)</h3>
            <p className="text-xs text-muted">월말 정산 후 현금이 처음 0원 이하가 되는 달에 파산합니다. 유예는 없습니다.</p>
            <div className="max-h-72 overflow-auto rounded-md border border-line">
              <table className="w-full">
                <caption className="sr-only">월별 현금 잔액</caption>
                <thead className="sticky top-0 bg-paper text-left text-xs text-muted">
                  <tr><th scope="col" className="px-3 py-2 font-semibold">개월</th><th scope="col" className="px-3 py-2 text-right font-semibold">월말 현금</th><th scope="col" className="px-3 py-2 font-semibold">판정</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {r.details.monthlyCash.map((m) => (
                    <tr key={m.month}>
                      <th scope="row" className="px-3 py-1.5 text-left font-normal">{m.month}개월</th>
                      <td className="num px-3 py-1.5 text-right">{money(m.cash)}</td>
                      <td className="px-3 py-1.5">{m.atOrBelowZero ? '0원 이하 → 파산' : '정상'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">연도별 요약</h3>
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[28rem]">
                <caption className="sr-only">연도 말 시점의 현금·월 매출·고객·인원</caption>
                <thead className="bg-paper text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">연도</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">현금</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">월 매출</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">고객</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">인원</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {r.details.years.map((y) => (
                    <tr key={y.year}>
                      <th scope="row" className="px-3 py-2 text-left font-normal">{y.year}년 차<span className="block text-xs text-muted">{y.endMonth}개월 시점</span></th>
                      <td className="num px-3 py-2 text-right">{money(y.cash)}</td>
                      <td className="num px-3 py-2 text-right">{formatMoney(y.revenue)}</td>
                      <td className="num px-3 py-2 text-right">{Math.round(y.customers).toLocaleString('ko-KR')}명</td>
                      <td className="num px-3 py-2 text-right">{y.headcount}명</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {r.details.years.filter((y) => y.customerNote).map((y) => (
              <p key={y.year} className="rounded-md border border-line bg-paper px-3 py-2 text-xs leading-relaxed">
                <strong>{y.year}년 차 고객 수:</strong> {y.customerNote}
              </p>
            ))}
          </section>

          <Assumptions basis={explainReport(game)} />
          {r.details.legacyCount > 0 ? <Callout tone="info">{r.details.legacyCount}개 결정은 이전 기록이라 선택 직후 수치가 없습니다. 해당 카드에는 이후 운영 결과가 포함된 변화만 표시됩니다.</Callout> : null}
        </div>
      </details>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => save(`${name}-결과보고서.md`, summaryToMarkdown(game, r))}>결과보고서 내려받기 (.md)</Button>
        <Button variant="secondary" onClick={() => save(`${name}-상세기록.md`, reportToMarkdown(game, generateReport(game)))}>상세 기록 내려받기 (.md)</Button>
        <Button variant="secondary" onClick={() => window.print()}>인쇄 / PDF 저장</Button>
        <Button variant="danger" onClick={onRestart}>새 게임 시작</Button>
      </div>

      <p className="text-xs text-muted">{DISCLAIMER_LONG}</p>
    </article>
  );
}

import type { Game } from '@/engine';
import { cardForDecision, cashBridge, formatMoney, formatSignedMoney, yearSummary } from '@/engine';
import Assumptions from './Assumptions';
import DecisionCardView from './DecisionCardView';
import WhatIf from './WhatIf';
import { Button, Callout, VERDICT_LABEL } from './ui';
import { explainOutcome } from '@/engine';

const sg = (v: number) => (v === 0 ? '0만원' : formatSignedMoney(v));

function CashBridge({ game, index }: { game: Game; index: number }) {
  const d = game.decisions[index];
  const t = d.trace;
  if (!t) return null;
  const b = cashBridge(t);
  const p = t.period.totals;
  return (
    <details className="rounded-md border border-line bg-surface text-sm">
      <summary className="cursor-pointer px-4 py-3 font-semibold">현금이 왜 이렇게 변했나 <span className="font-normal text-muted">(눌러서 보기)</span></summary>
      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[24rem]">
          <caption className="sr-only">현금 변화의 구성</caption>
          <tbody className="divide-y divide-line">
            <tr><th scope="row" className="px-3 py-2 text-left font-normal">선택 전 현금</th><td className="num px-3 py-2 text-right">{formatMoney(b.start)}</td></tr>
            <tr><th scope="row" className="px-3 py-2 text-left font-normal">① 선택으로 바로 바뀐 현금<span className="block text-xs text-muted">일회성 지출 {formatMoney(t.direct.oneTimeCost)} 차감, 자금 유입 {formatMoney(t.direct.inflow)} 반영</span></th><td className="num px-3 py-2 text-right font-semibold">{sg(b.direct)}</td></tr>
            <tr><th scope="row" className="px-3 py-2 text-left font-normal">② 이후 {t.period.months}개월 영업 현금흐름<span className="block text-xs text-muted">매출 {formatMoney(p.revenue)} − 원가 {formatMoney(p.cogs)} − 인건비 {formatMoney(p.payroll)} − 운영비 {formatMoney(p.overhead)} − 마케팅 {formatMoney(p.marketing)} − 이자 {formatMoney(p.interest)}</span></th><td className="num px-3 py-2 text-right font-semibold">{sg(b.period)}</td></tr>
            <tr className="bg-paper"><th scope="row" className="px-3 py-2 text-left font-semibold">기간 종료 현금</th><td className="num px-3 py-2 text-right font-semibold">{formatMoney(b.end)}</td></tr>
          </tbody>
        </table>
        <p className="num border-t border-line px-3 py-2 text-xs text-muted">검산: {formatMoney(b.start)} {sg(b.direct)} {sg(b.period)} = {formatMoney(b.start + b.direct + b.period)} {b.matches ? '(실제 현금과 일치)' : '(차이 있음)'}. 일회성 지출은 ①에만 들어 있고 ②에는 다시 들어가지 않습니다.</p>
      </div>
    </details>
  );
}

export default function OutcomeScreen({ game, onContinue }: { game: Game; onContinue: () => void }) {
  const d = game.lastOutcome;
  if (!d) return null;
  const index = game.decisions.length - 1;
  const bankrupt = game.status === 'bankrupt';
  const last = game.stage === 3 && game.planIndex + 1 >= game.plan.length;
  const card = cardForDecision(game, index);
  const y = game.planIndex + 1 >= game.plan.length ? yearSummary(game) : null;

  return (
    <article className="max-w-2xl space-y-5">
      <header>
        <p className="text-sm text-muted">시간이 흐른 뒤의 결과</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{d.eventTitle}</h1>
        <p className="mt-2 text-sm">판정: <strong>{VERDICT_LABEL[d.verdict]}</strong></p>
      </header>

      {bankrupt ? (
        <Callout tone="danger" role="alert" title="회사가 파산했습니다">
          월말 정산 후 현금이 처음으로 0원 이하가 되어 운영을 이어 갈 수 없습니다(유예 기간 없음). 이후 이벤트는 건너뛰고 결과보고서로 넘어갑니다.
        </Callout>
      ) : null}

      <DecisionCardView card={card} />

      <CashBridge game={game} index={index} />
      <WhatIf game={game} index={index} />

      {y ? (
        <section aria-labelledby="year-h" className="space-y-2 rounded-md border border-line border-l-[3px] border-l-brass bg-surface p-4">
          <h2 id="year-h" className="text-lg font-semibold">{y.title}</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {y.rows.map((r) => (
              <div key={r.label}><dt className="text-xs text-muted">{r.label}</dt><dd className="num font-semibold">{r.value}</dd></div>
            ))}
          </dl>
        </section>
      ) : null}

      {d.notes.length > 0 ? (
        <Callout tone="warn" title="운영 상황 알림">
          <ul className="list-disc pl-5">{d.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </Callout>
      ) : null}

      <Assumptions basis={explainOutcome(game, d)} />

      <section>
        <h2 className="mb-1 text-sm font-semibold">우리가 남긴 근거</h2>
        <p className="whitespace-pre-wrap text-sm text-muted">{d.rationale}</p>
      </section>

      <Button onClick={onContinue} className="w-full sm:w-auto">
        {bankrupt || last ? '결과보고서 보기' : '다음 이벤트로'}
      </Button>
    </article>
  );
}

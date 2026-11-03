import type { DecisionCard } from '@/engine';

/** 결정 카드 하나: 시기·상황 → 선택 → 선택 직후 변화 → 이후 결과 → 얻은 것·치른 대가 → 숫자 표 순서(모바일에서도 같은 순서). */
export default function DecisionCardView({ card, tone = 'brass', anchor = true }: { card: DecisionCard; tone?: 'brass' | 'warn'; anchor?: boolean }) {
  const hasDirect = card.rows.some((r) => r.afterDirect !== null);
  return (
    <article
      id={anchor ? card.anchor : undefined}
      className={`break-inside-avoid rounded-md border border-line border-l-[3px] bg-surface p-4 ${tone === 'warn' ? 'border-l-warn' : 'border-l-brass'}`}
    >
      <p className="text-xs text-muted">
        {card.whenLabel} · {card.eventTitle}
      </p>
      <h3 className="mt-0.5 font-semibold">{card.kind}</h3>
      <dl className="mt-2 space-y-2 text-sm">
        <div>
          <dt className="text-xs font-semibold text-muted">① 당시 상황</dt>
          <dd className="num">{card.situation}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">② 우리의 선택</dt>
          <dd className="font-semibold">{card.chosen}</dd>
        </div>
        {card.directLines.length > 0 ? (
          <div>
            <dt className="text-xs font-semibold text-muted">③ 선택 직후 바뀐 것</dt>
            <dd>
              <ul className="list-disc pl-5">
                {card.directLines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
        {card.periodLines.length > 0 ? (
          <div>
            <dt className="text-xs font-semibold text-muted">④ 이후 {card.months > 0 ? `${card.months}개월` : '기간'}의 결과</dt>
            <dd>
              <ul className="list-disc pl-5">
                {card.periodLines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-muted">얻은 것</dt>
            <dd>{card.gained.length ? <ul className="list-disc pl-5">{card.gained.map((g) => <li key={g}>{g}</li>)}</ul> : <span className="text-muted">기록에서 뚜렷한 이득이 확인되지 않았습니다.</span>}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted">치른 대가</dt>
            <dd>{card.paid.length ? <ul className="list-disc pl-5">{card.paid.map((g) => <li key={g}>{g}</li>)}</ul> : <span className="text-muted">기록에서 뚜렷한 대가가 확인되지 않았습니다.</span>}</dd>
          </div>
        </div>
      </dl>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <caption className="sr-only">{card.kind}의 주요 지표</caption>
          <thead className="text-left text-xs text-muted">
            <tr>
              <th scope="col" className="py-1 pr-2 font-semibold">지표</th>
              <th scope="col" className="px-2 py-1 text-right font-semibold">선택 전</th>
              {hasDirect ? <th scope="col" className="px-2 py-1 text-right font-semibold">선택 직후</th> : null}
              <th scope="col" className="py-1 pl-2 text-right font-semibold">{hasDirect ? '기간 종료' : '기간 종료(선택 포함)'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {card.rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                  {r.label}
                  {r.note ? <span className="block text-xs text-muted">{r.note}</span> : null}
                </th>
                <td className="num px-2 py-1.5 text-right">{r.before}</td>
                {hasDirect ? <td className="num px-2 py-1.5 text-right">{r.afterDirect}</td> : null}
                <td className="num py-1.5 pl-2 text-right font-semibold">{r.afterPeriod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {card.notices.map((n) => (
        <p key={n} className="mt-2 text-xs text-muted">{n}</p>
      ))}
    </article>
  );
}

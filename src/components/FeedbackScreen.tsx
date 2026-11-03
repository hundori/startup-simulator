import type { Game } from '@/engine';
import { feedbackView } from '@/engine';
import { Button } from './ui';

/** 결정 직후 화면: 직접 효과만 보여 주고 이후 기간의 결과는 아직 보여 주지 않는다. */
export default function FeedbackScreen({ game, onContinue }: { game: Game; onContinue: () => void }) {
  const v = feedbackView(game);
  if (!v) return null;
  return (
    <article className="max-w-2xl space-y-5">
      <header>
        <p className="text-sm text-muted">선택 직후</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{v.eventTitle}</h1>
        <p className="mt-2 text-sm">
          선택: <strong>{v.chosen}</strong>
        </p>
      </header>

      <section aria-labelledby="fb-num" className="space-y-2">
        <h2 id="fb-num" className="text-lg font-semibold">바로 달라진 숫자</h2>
        <div className="overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full min-w-[20rem] text-sm">
            <caption className="sr-only">선택 직후 지표 변화</caption>
            <thead className="bg-paper text-left text-xs text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">지표</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">선택 전</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">선택 직후</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {v.numbers.map((n) => (
                <tr key={n.label}>
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    {n.label}
                    {n.note ? <span className="block text-xs text-muted">{n.note}</span> : null}
                  </th>
                  <td className="num px-3 py-2 text-right">{n.before}</td>
                  <td className="num px-3 py-2 text-right font-semibold">{n.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-line bg-surface p-3">
          <h2 className="font-semibold">얻은 것</h2>
          {v.gained.length ? <ul className="mt-1 list-disc pl-5">{v.gained.map((g) => <li key={g}>{g}</li>)}</ul> : <p className="mt-1 text-muted">바로 얻은 변화는 기록되지 않았습니다.</p>}
        </div>
        <div className="rounded-md border border-line bg-surface p-3">
          <h2 className="font-semibold">치른 대가</h2>
          {v.paid.length ? <ul className="mt-1 list-disc pl-5">{v.paid.map((g) => <li key={g}>{g}</li>)}</ul> : <p className="mt-1 text-muted">바로 치른 대가는 기록되지 않았습니다.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold">판정 근거</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{v.why}</p>
      </section>

      <p className="rounded-md border border-line bg-paper px-3 py-2 text-sm">
        <strong>다음에 확인할 것:</strong> {v.watch}
      </p>

      <p className="text-xs text-muted">이후 {v.months > 0 ? `${v.months}개월` : '기간'}의 결과는 아직 계산되지 않았습니다. 아래 버튼을 누르면 시간이 흐르고 결과가 나옵니다.</p>
      <Button onClick={onContinue} className="w-full sm:w-auto">
        {v.months > 0 ? `${v.months}개월 지나 결과 보기` : '결과 보기'}
      </Button>
    </article>
  );
}

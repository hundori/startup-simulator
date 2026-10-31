import type { DecisionRecord, Game, MetricSnapshot } from '@/engine';
import { formatMoney, formatNumber, formatSigned, formatSignedMoney, reasonLabel } from '@/engine';
import { Badge, Button, Callout, VERDICT_LABEL } from './ui';

const ROWS: { key: keyof MetricSnapshot; label: string; money?: boolean; count?: boolean }[] = [
  { key: 'cash', label: '현금', money: true },
  { key: 'monthlyRevenue', label: '월 매출', money: true },
  { key: 'customers', label: '고객 수', count: true },
  { key: 'quality', label: '제품 품질' },
  { key: 'morale', label: '팀 사기' },
  { key: 'reputation', label: '평판' },
  { key: 'headcount', label: '인원', count: true },
];

function fmt(row: (typeof ROWS)[number], v: number) {
  if (row.money) return formatMoney(v);
  if (row.count) return `${formatNumber(v)}${row.key === 'headcount' ? '명' : ''}`;
  return String(Math.round(v));
}

function delta(row: (typeof ROWS)[number], a: number, b: number) {
  const d = b - a;
  if (Math.round(d) === 0 && !row.money) return { text: '변화 없음', cls: 'text-muted' };
  const text = row.money ? formatSignedMoney(d) : formatSigned(Math.round(d));
  return { text, cls: d > 0 ? 'text-gain' : d < 0 ? 'text-loss' : 'text-muted' };
}

function Result({ d }: { d: DecisionRecord }) {
  const tone = d.verdict === 'strong' ? 'good' : d.verdict === 'weak' ? 'warn' : 'neutral';
  return (
    <section aria-labelledby="result-h" className="space-y-3">
      <h2 id="result-h" className="text-lg font-semibold">
        결과
      </h2>
      <p className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{VERDICT_LABEL[d.verdict]}</Badge>
        <Badge tone="accent">{reasonLabel(d.reason)}</Badge>
      </p>
      <p className="leading-relaxed">{d.outcomeText}</p>
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[26rem] text-sm">
          <caption className="sr-only">결정 전후 지표 변화</caption>
          <thead className="bg-paper text-left text-xs text-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">지표</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">결정 전</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">{d.monthsElapsed}개월 뒤</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">변화</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ROWS.map((r) => {
              const a = d.before[r.key] as number;
              const b = d.afterPeriod[r.key] as number;
              const dl = delta(r, a, b);
              return (
                <tr key={r.key}>
                  <th scope="row" className="px-3 py-2 text-left font-normal">{r.label}</th>
                  <td className="num px-3 py-2 text-right">{fmt(r, a)}</td>
                  <td className="num px-3 py-2 text-right">{fmt(r, b)}</td>
                  <td className={`num px-3 py-2 text-right font-semibold ${dl.cls}`}>{dl.text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function OutcomeScreen({ game, onContinue }: { game: Game; onContinue: () => void }) {
  const d = game.lastOutcome;
  if (!d) return null;
  const bankrupt = game.status === 'bankrupt';
  const last = game.stage === 3 && game.planIndex + 1 >= game.plan.length;

  return (
    <article className="max-w-2xl space-y-6">
      <header>
        <p className="text-sm text-muted">결정 결과</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{d.eventTitle}</h1>
        <p className="mt-2 text-sm">
          선택: <strong>{d.optionLabel}</strong>
          {d.cost > 0 ? <span className="num text-muted"> · 비용 {formatMoney(d.cost)}</span> : null}
        </p>
      </header>

      {bankrupt ? (
        <Callout tone="danger" role="alert" title="회사가 파산했습니다">
          현금이 오래 마이너스였거나 감당할 수 없는 수준까지 내려가 운영을 이어 갈 수 없습니다. 이후 이벤트는 건너뛰고 학습 보고서로 넘어갑니다.
        </Callout>
      ) : null}

      <Result d={d} />

      {d.notes.length > 0 ? (
        <Callout tone="warn" title="운영 상황 알림">
          <ul className="list-disc pl-5">
            {d.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Callout>
      ) : null}

      <section>
        <h2 className="mb-1 text-sm font-semibold">우리가 남긴 근거</h2>
        <p className="whitespace-pre-wrap text-sm text-muted">{d.rationale}</p>
      </section>

      <Button onClick={onContinue} className="w-full sm:w-auto">
        {bankrupt || last ? '학습 보고서 보기' : '다음 이벤트로'}
      </Button>
    </article>
  );
}

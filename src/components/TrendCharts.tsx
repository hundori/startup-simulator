import type { MonthRecord } from '@/engine';
import { formatMoney } from '@/engine';

const W = 300;
const H = 96;
const PAD = { l: 4, r: 4, t: 8, b: 14 };

function Chart({
  title,
  data,
  series,
  fmt,
  zero = false,
}: {
  title: string;
  data: MonthRecord[];
  series: { name: string; pick: (r: MonthRecord) => number; color: string }[];
  fmt: (v: number) => string;
  zero?: boolean;
}) {
  const all = series.flatMap((s) => data.map(s.pick));
  const lo = Math.min(...all, zero ? 0 : Infinity);
  let hi = Math.max(...all, zero ? 0 : -Infinity);
  if (hi === lo) hi = lo + 1;
  const x = (m: number) => PAD.l + (m / 36) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const last = data[data.length - 1];
  const summary = series.map((s) => `${s.name} ${fmt(s.pick(last))}`).join(', ');

  return (
    <figure className="rounded-md border border-line bg-surface p-3">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{title}</span>
        <span className="num text-xs text-muted">
          {series.map((s, i) => (
            <span key={s.name}>
              {i > 0 ? ' · ' : ''}
              <span style={{ color: s.color }} aria-hidden="true">●</span> {series.length > 1 ? `${s.name} ` : ''}
              {fmt(s.pick(last))}
            </span>
          ))}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: 0~36개월 추이, 현재 ${summary}`} className="block w-full">
        {[12, 24].map((m) => (
          <line key={m} x1={x(m)} x2={x(m)} y1={PAD.t} y2={H - PAD.b} stroke="var(--line)" strokeDasharray="3 3" />
        ))}
        {lo < 0 && hi > 0 ? <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="var(--muted)" strokeWidth="1" /> : null}
        {series.map((s) => (
          <polyline
            key={s.name}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
            points={data.map((r) => `${x(r.month).toFixed(1)},${y(s.pick(r)).toFixed(1)}`).join(' ')}
          />
        ))}
        {[0, 12, 24, 36].map((m) => (
          <text key={m} x={x(m)} y={H - 2} fontSize="9" fill="var(--muted)" textAnchor={m === 0 ? 'start' : m === 36 ? 'end' : 'middle'}>
            {m === 0 ? '시작' : `${m / 12}년`}
          </text>
        ))}
      </svg>
    </figure>
  );
}

export default function TrendCharts({ history }: { history: MonthRecord[] }) {
  const data = [...history].sort((a, b) => a.month - b.month);
  if (data.length < 2) return null;
  const n = (v: number) => Math.round(v).toLocaleString('ko-KR');
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Chart title="현금" data={data} zero series={[{ name: '현금', pick: (r) => r.cash, color: 'var(--accent)' }]} fmt={formatMoney} />
      <Chart title="월 매출" data={data} zero series={[{ name: '월 매출', pick: (r) => r.revenue, color: 'var(--gain)' }]} fmt={formatMoney} />
      <Chart title="고객 수" data={data} zero series={[{ name: '고객', pick: (r) => r.customers, color: 'var(--accent-strong)' }]} fmt={(v) => `${n(v)}명`} />
      <Chart
        title="품질 · 사기 · 평판"
        data={data}
        series={[
          { name: '품질', pick: (r) => r.quality, color: 'var(--accent)' },
          { name: '사기', pick: (r) => r.morale, color: 'var(--gain)' },
          { name: '평판', pick: (r) => r.reputation, color: 'var(--warn)' },
        ]}
        fmt={n}
      />
    </div>
  );
}

import type { Game, MetricSnapshot } from '@/engine';
import {
  BUSINESS_TYPES,
  computeRunway,
  formatMoney,
  formatNumber,
  formatSigned,
  formatSignedMoney,
  monthlyInterest,
  payroll,
  previewRunway,
  utilization,
} from '@/engine';
import { Badge } from './ui';

const YEARS = [
  { n: 1, label: '1년 차 · 생존' },
  { n: 2, label: '2년 차 · 성장' },
  { n: 3, label: '3년 차 · 확장' },
];

function Runway({ game }: { game: Game }) {
  const r = computeRunway(game.sim);
  if (game.sim.cash <= 0) {
    return <span className="font-semibold text-loss">현금이 바닥났습니다</span>;
  }
  if (r === null) return <span className="font-semibold text-gain">흑자 운영 중</span>;
  const tone = r < 3 ? 'text-loss' : r < 6 ? 'text-warn' : 'text-ink';
  return (
    <span className={`num font-semibold ${tone}`}>
      런웨이 {r < 1 ? '1개월 미만' : `약 ${r.toFixed(1)}개월`}
    </span>
  );
}

function fmtMonths(m: number | null): string {
  if (m === null) return '흑자 유지';
  if (m < 1) return '1개월 미만';
  return `약 ${m.toFixed(1)}개월`;
}

/** 고른 대안의 비용만 반영한 런웨이. 채용·매출 변화 같은 결과는 결정 전에는 보여 주지 않는다. */
function RunwayPreview({ game, cost }: { game: Game; cost: number }) {
  const now = computeRunway(game.sim);
  const after = previewRunway(game.sim, cost);
  const danger = after.months !== null && after.months < 3;
  const caution = after.months !== null && after.months >= 3 && after.months < 6;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`border-b border-line px-4 py-3 text-sm ${danger ? 'bg-loss-soft' : caution ? 'bg-warn-soft' : 'bg-accent-soft'}`}
    >
      <p className="text-xs font-semibold text-muted">이 선택 시 예상 런웨이</p>
      <p className="num mt-0.5 font-semibold">
        {fmtMonths(now)} → <span className={danger ? 'text-loss' : caution ? 'text-warn' : 'text-ink'}>{fmtMonths(after.months)}</span>
      </p>
      <p className="num mt-0.5 text-xs text-muted">
        현금 {formatMoney(game.sim.cash)} → {formatMoney(after.cashAfter)} ({cost > 0 ? `비용 ${formatMoney(cost)}` : "추가 비용 없음"})
      </p>
      {danger ? (
        <div className="mt-2">
          <Badge tone="danger">경고 · 런웨이 3개월 미만</Badge>
        </div>
      ) : caution ? (
        <div className="mt-2">
          <Badge tone="warn">주의 · 런웨이 6개월 미만</Badge>
        </div>
      ) : null}
      <p className="mt-2 text-xs text-muted">비용만 반영한 추정입니다. 채용·매출 변화 같은 결과는 결정 후 공개됩니다.</p>
    </div>
  );
}

/** 36개월을 한 칸씩 보여 주는 타임라인. 지난 달은 현금 증감으로 색을 칠한다. */
function TimeStrip({ game }: { game: Game }) {
  const { sim, history, decisions } = game;
  const decisionMonths = new Set(decisions.map((d) => d.month));
  const negativeMonths = history.filter((h) => h.month > 0 && h.cash < 0).length;

  const cellClass = (m: number): string => {
    if (m > sim.month) return 'border border-line bg-transparent';
    const cur = history.find((h) => h.month === m);
    const prev = history.find((h) => h.month === m - 1);
    if (!cur || !prev) return 'bg-line';
    if (cur.cash < 0) return 'bg-loss';
    return cur.cash >= prev.cash ? 'bg-gain' : 'bg-warn/40';
  };

  return (
    <div
      role="img"
      aria-label={`36개월 중 ${sim.month}개월 경과, 현금이 마이너스였던 달 ${negativeMonths}개월, 결정 ${decisions.length}회`}
    >
      <div className="grid gap-3">
        {YEARS.map((y) => (
          <div key={y.n}>
            <p className="mb-1 text-xs text-muted">{y.label}</p>
            <div className="grid grid-cols-12 gap-[3px]" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => {
                const m = (y.n - 1) * 12 + i + 1;
                return (
                  <span
                    key={m}
                    className={`relative grid aspect-square place-items-center rounded-[3px] ${cellClass(m)} ${
                      m === sim.month ? 'outline outline-2 outline-offset-1 outline-accent' : ''
                    }`}
                  >
                    {decisionMonths.has(m - 1) && m <= sim.month ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-white ring-1 ring-ink" />
                    ) : null}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-[2px] bg-gain align-baseline" />
          현금 증가
        </span>
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-[2px] bg-warn/40 align-baseline" />
          현금 감소
        </span>
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-[2px] bg-loss align-baseline" />
          현금 마이너스
        </span>
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-full bg-white align-baseline ring-1 ring-ink" />
          결정한 달
        </span>
      </p>
    </div>
  );
}

function bar(value: number) {
  return (
    <div className="mt-1.5 h-1 w-full overflow-hidden rounded bg-line" aria-hidden="true">
      <div className="h-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function deltaClass(v: number): string {
  if (v > 0) return 'text-gain';
  if (v < 0) return 'text-loss';
  return 'text-muted';
}

export default function StatusPanel({ game, previewCost = null }: { game: Game; previewCost?: number | null }) {
  const { sim } = game;
  const prev: MetricSnapshot | null = game.decisions.length
    ? game.decisions[game.decisions.length - 1].before
    : null;
  const t = BUSINESS_TYPES[game.setup.businessType];
  const util = utilization(sim);
  const fixed = payroll(sim) + sim.overhead + sim.marketingBudget + monthlyInterest(sim);

  const items: {
    key: string;
    label: string;
    value: string;
    unit?: string;
    delta: number | null;
    deltaText: string;
    gauge?: number;
  }[] = [
    {
      key: 'revenue',
      label: '월 매출',
      value: formatMoney(sim.monthlyRevenue),
      delta: prev ? sim.monthlyRevenue - prev.monthlyRevenue : null,
      deltaText: prev ? formatSignedMoney(sim.monthlyRevenue - prev.monthlyRevenue) : '',
    },
    {
      key: 'cash',
      label: '현금',
      value: formatMoney(sim.cash),
      delta: prev ? sim.cash - prev.cash : null,
      deltaText: prev ? formatSignedMoney(sim.cash - prev.cash) : '',
    },
    {
      key: 'customers',
      label: t.customerWord,
      value: formatNumber(sim.customers),
      unit: '명',
      delta: prev ? sim.customers - prev.customers : null,
      deltaText: prev ? formatSigned(sim.customers - prev.customers) : '',
    },
    {
      key: 'quality',
      label: '제품 품질',
      value: String(Math.round(sim.quality)),
      unit: '/100',
      delta: prev ? Math.round(sim.quality) - prev.quality : null,
      deltaText: prev ? formatSigned(Math.round(sim.quality) - prev.quality) : '',
      gauge: sim.quality,
    },
    {
      key: 'morale',
      label: '팀 사기',
      value: String(Math.round(sim.morale)),
      unit: '/100',
      delta: prev ? Math.round(sim.morale) - prev.morale : null,
      deltaText: prev ? formatSigned(Math.round(sim.morale) - prev.morale) : '',
      gauge: sim.morale,
    },
    {
      key: 'reputation',
      label: '평판',
      value: String(Math.round(sim.reputation)),
      unit: '/100',
      delta: prev ? Math.round(sim.reputation) - prev.reputation : null,
      deltaText: prev ? formatSigned(Math.round(sim.reputation) - prev.reputation) : '',
      gauge: sim.reputation,
    },
  ];

  return (
    <aside aria-label="회사 현황" className="print:hidden">
      <div className="border-t-[3px] border-ink bg-surface">
        <div className="flex items-baseline justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="font-sans text-sm font-bold">경영 현황</h2>
          <Runway game={game} />
        </div>
        {previewCost !== null ? <RunwayPreview game={game} cost={previewCost} /> : null}

        <dl className="grid grid-cols-2 divide-x divide-y divide-line border-b border-line lg:grid-cols-1 lg:divide-x-0">
          {items.map((it) => (
            <div key={it.key} className="px-4 py-3">
              <dt className="text-xs text-muted">{it.label}</dt>
              <dd className="num mt-0.5 text-xl font-semibold leading-snug">
                {it.value}
                {it.unit ? <span className="ml-0.5 text-xs font-normal text-muted">{it.unit}</span> : null}
              </dd>
              {it.gauge !== undefined ? bar(it.gauge) : null}
              <p className={`num mt-1 min-h-4 text-xs ${it.delta === null ? '' : deltaClass(it.delta)}`}>
                {it.delta === null ? ' ' : `직전 결정 대비 ${it.deltaText}`}
              </p>
            </div>
          ))}
        </dl>

        <div className="border-b border-line px-4 py-3">
          <p className="mb-2 text-sm text-muted">
            <span className="num font-semibold text-ink">{sim.month}</span>개월 경과 / 36개월
          </p>
          <TimeStrip game={game} />
        </div>

        <div className="space-y-1 px-4 py-3 text-sm text-muted">
          <p className="num">
            인력 {sim.headcount}명 · 월 고정비 {formatMoney(fixed)}
          </p>
          <p className="num">가동률 {Math.round(util * 100)}%</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {util > 1 ? <Badge tone="warn">인력 부족</Badge> : null}
            {sim.cash < 0 ? <Badge tone="danger">현금 마이너스 {sim.insolvencyMonths}개월째 · 2개월 연속이면 파산</Badge> : null}
            {sim.debt > 0 ? <Badge tone="neutral">부채 {formatMoney(sim.debt)}</Badge> : null}
            {sim.dilution > 0 ? <Badge tone="neutral">지분 희석 {sim.dilution}%</Badge> : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

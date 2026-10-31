import type { Game } from '@/engine';
import {
  BUSINESS_TYPES,
  CUSTOMER_TYPES,
  REVENUE_MODELS,
  computeRunway,
  formatMoney,
  formatNumber,
  monthlyInterest,
  payroll,
  utilization,
  withJosa,
} from '@/engine';
import { Button, Callout } from './ui';

export default function IntroScreen({ game, onBegin }: { game: Game; onBegin: () => void }) {
  const { setup, sim } = game;
  const t = BUSINESS_TYPES[setup.businessType];
  const fixed = payroll(sim) + sim.overhead + sim.marketingBudget + monthlyInterest(sim);
  const runway = computeRunway(sim);

  const rows: [string, string][] = [
    ['업종', t.label],
    ['고객 유형', CUSTOMER_TYPES[setup.customerType].label],
    ['대상 고객', setup.targetCustomer],
    ['수익모델', REVENUE_MODELS[setup.revenueModel].label],
    ['초기 자본', formatMoney(setup.capital)],
    ['창업 멤버', `${setup.members}명`],
    ['월 고정비', `${formatMoney(fixed)} (인건비 ${formatMoney(payroll(sim))} · 운영비 ${formatMoney(sim.overhead)} · 마케팅 ${formatMoney(sim.marketingBudget)})`],
    ['고객 1명당 월 매출', `${sim.arpu.toLocaleString('ko-KR')}만원`],
    ['매출 대비 원가율', `${Math.round(sim.cogsRatio * 100)}%`],
    ['월 이탈률(기본)', `${(sim.churnRate * 100).toFixed(1)}%`],
    ['처리 가능한 고객 수', `${formatNumber(sim.headcount * sim.capPerHead)}명 (현재 가동률 ${Math.round(utilization(sim) * 100)}%)`],
    ['시작 런웨이', runway === null ? '흑자 구조' : `약 ${runway.toFixed(1)}개월 (지금 속도로 쓸 때)`],
  ];

  return (
    <article className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold leading-tight">{withJosa(setup.companyName, '이/가')} 문을 열었습니다</h1>
        <p className="mt-3 whitespace-pre-wrap text-muted">{setup.idea}</p>
      </header>

      <section aria-labelledby="start-heading">
        <h2 id="start-heading" className="mb-2 text-lg font-semibold">
          출발 조건
        </h2>
        <dl className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-muted">{k}</dt>
              <dd className="num">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Callout tone="info" title="이렇게 진행됩니다">
        1년 차(생존) → 2년 차(성장) → 3년 차(확장) 순서로 이벤트가 나옵니다. 대안의 결과는 선택하기 전에는 보이지 않습니다.
        결정을 확정하려면 조 토론 근거를 적어야 합니다. 위 수치는 업종 템플릿을 바탕으로 만든 교육용 가정값입니다.
      </Callout>

      <Button onClick={onBegin} className="w-full sm:w-auto">
        1년 차 시작 · 생존 단계
      </Button>
    </article>
  );
}

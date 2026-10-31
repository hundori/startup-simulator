// 밸런스 점검: 업종 × 전략으로 시뮬레이션하여 생존율과 평균 점수를 출력한다.
// 실행: npm run balance
// 목표(교육용 가정): 합리적 전략은 약 70% 안팎 생존, 방치·무작위 전략은 대부분 어렵게 끝남.

import {
  autoPlay,
  getEvent,
  pickOutcome,
  scoreGame,
  seededRandom,
  type BusinessType,
  type Chooser,
  type RevenueModel,
  type SetupInput,
} from '../src/engine';

const TYPES: { type: BusinessType; model: RevenueModel }[] = [
  { type: 'saas', model: 'subscription' },
  { type: 'commerce', model: 'sales' },
  { type: 'offline', model: 'sales' },
  { type: 'content', model: 'subscription' },
  { type: 'platform', model: 'commission' },
];

const rank = { strong: 3, ok: 2, weak: 1 } as const;

const strategies: Record<string, (seed: number) => Chooser> = {
  '첫번째 대안': () => (ev) => (ev.options.find((o) => o.available) ?? ev.options[0]).id,
  '가장 싼 대안': () => (ev) =>
    [...ev.options].filter((o) => o.available).sort((a, b) => a.cost - b.cost)[0].id,
  무작위: (seed) => (ev, g) => {
    const avail = ev.options.filter((o) => o.available);
    const r = seededRandom(seed * 131 + g.decisions.length * 17 + 3);
    return avail[Math.floor(r * avail.length)].id;
  },
  '합리적(결과 엿보기)': () => (ev, g) => {
    const e = getEvent(ev.id);
    const avail = ev.options.filter((o) => o.available);
    const scored = avail.map((o) => {
      const opt = e.options.find((x) => x.id === o.id)!;
      return { id: o.id, v: rank[pickOutcome(g.sim, opt).verdict] * 10 - o.cost / 400 };
    });
    return scored.sort((a, b) => b.v - a.v)[0].id;
  },
};

const capitals = [5000, 10000, 20000];
const members = 3;

for (const mode of ['class', 'full'] as const) {
  console.log(`\n===== 모드: ${mode} =====`);
  for (const [name, make] of Object.entries(strategies)) {
    const rows: string[] = [];
    let totalSurv = 0;
    let totalRuns = 0;
    let revRatio = 0;
    let cashRatio = 0;
    let custEnd = 0;
    for (const { type, model } of TYPES) {
      let surv = 0;
      let runs = 0;
      let score = 0;
      for (const capital of capitals) {
        for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
          const setup: SetupInput = {
            companyName: `테스트${seed}`,
            idea: '밸런스 점검용 가상 사업 아이디어입니다.',
            businessType: type,
            customerType: 'b2c',
            targetCustomer: '대학생',
            revenueModel: model,
            capital,
            members,
            mode,
          };
          const g = autoPlay(setup, make(seed), { now: '2026-01-01T00:00:00.000Z', seed });
          runs++;
          if (g.status === 'completed') surv++;
          score += scoreGame(g).total;
          revRatio += g.sim.monthlyRevenue / capital;
          cashRatio += g.sim.cash / capital;
          custEnd += g.sim.customers;
        }
      }
      totalSurv += surv;
      totalRuns += runs;
      rows.push(`${type}:${Math.round((surv / runs) * 100)}%/${Math.round(score / runs)}점`);
    }
    console.log(`${name.padEnd(14)} 생존 ${Math.round((totalSurv / totalRuns) * 100)}%  (${rows.join('  ')})`);
    console.log(`${''.padEnd(14)} 평균 종료: 월매출/자본 ${(revRatio / totalRuns).toFixed(2)}, 현금/자본 ${(cashRatio / totalRuns).toFixed(2)}, 고객 ${Math.round(custEnd / totalRuns)}`);
  }
}

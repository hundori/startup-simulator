import { describe, expect, it } from 'vitest';
import {
  ALL_EVENTS,
  BUSINESS_TYPES,
  CUSTOMER_TYPES,
  REVENUE_MODELS,
  acquisitionRate,
  advanceMonth,
  applyEffects,
  beginSimulation,
  continueFromOutcome,
  createInitialState,
  effectiveChurn,
  evaluateOption,
  formatMoney,
  generateReport,
  getEvent,
  isEventApplicable,
  monthsAllocation,
  planStageEvents,
  reportToMarkdown,
  resolveEvent,
  scoreGame,
  stageCandidates,
  payroll,
  toPublicOption,
  submitDecision,
  utilization,
  validateSetup,
  type CustomerType,
  type Game,
  type RevenueModel,
  type Stage,
} from '../src/engine';
import { LocalStorageAdapter } from '../src/storage/local';
import { BUSINESS, baseSetup, baseSim, cheapest, firstAvailable, mostExpensive, newGame, play } from './helpers';

const MODELS = Object.keys(REVENUE_MODELS) as RevenueModel[];
const CUSTOMERS = Object.keys(CUSTOMER_TYPES) as CustomerType[];

describe('A. 초기 상태', () => {
  it('A1 모든 조합에서 유효한 초기 상태가 생성된다', () => {
    for (const b of BUSINESS) {
      for (const c of CUSTOMERS) {
        for (const m of MODELS) {
          const s = createInitialState(baseSetup({ businessType: b, customerType: c, revenueModel: m, members: 4 }));
          for (const v of [s.cash, s.customers, s.arpu, s.monthlyRevenue, s.acqBase, s.churnRate]) {
            expect(Number.isFinite(v)).toBe(true);
          }
          expect(s.customers).toBeGreaterThanOrEqual(3);
          expect(s.headcount).toBe(4);
          for (const v of [s.quality, s.morale, s.reputation]) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(100);
          }
        }
      }
    }
  });
  it('A2 B2B는 B2C보다 단가가 높고 신규 유입이 적다', () => {
    const c = createInitialState(baseSetup({ customerType: 'b2c' }));
    const b = createInitialState(baseSetup({ customerType: 'b2b' }));
    expect(b.arpu).toBeGreaterThan(c.arpu);
    expect(b.acqBase).toBeLessThan(c.acqBase);
  });
  it('A3 입력 검증', () => {
    expect(validateSetup(baseSetup())).toEqual([]);
    expect(validateSetup(baseSetup({ companyName: ' ' })).length).toBeGreaterThan(0);
    expect(validateSetup(baseSetup({ capital: 99 })).length).toBeGreaterThan(0);
    expect(validateSetup(baseSetup({ capital: 100 }))).toEqual([]);
    expect(validateSetup(baseSetup({ capital: 100001 })).length).toBeGreaterThan(0);
    expect(validateSetup(baseSetup({ members: 0 })).length).toBeGreaterThan(0);
    expect(validateSetup(baseSetup({ members: 7 })).length).toBeGreaterThan(0);
    expect(validateSetup(baseSetup({ idea: '짧다' })).length).toBeGreaterThan(0);
  });
  it('A3b 100만원 창업: 규모가 줄어 첫 달 고정비가 자본을 넘지 않는다', () => {
    const sim = createInitialState(baseSetup({ capital: 100, members: 2 }));
    expect(sim.cash).toBe(100);
    expect(payroll(sim) + sim.overhead + sim.marketingBudget).toBeLessThan(sim.cash);
    const g = play({ capital: 100, members: 2, mode: 'class' }, cheapest);
    expect(g.phase).toBe('finished');
    expect(g.history.length).toBeGreaterThan(1);
  });
  it('A3c 소액 창업에서는 이벤트 비용도 같은 비율로 줄어든다', () => {
    const opt = getEvent('e02-runway').options.find((o) => o.id === 'seed')!;
    const g = newGame();
    const big = toPublicOption(g, opt);
    const small = toPublicOption({ ...g, sim: { ...g.sim, scale: 0.1 } }, opt);
    expect(small.cost).toBe(Math.round(big.cost * 0.1));
  });
  it('A4 같은 입력은 같은 초기 상태', () => {
    expect(createInitialState(baseSetup())).toEqual(createInitialState(baseSetup()));
  });
});

describe('B. 월간 계산', () => {
  it('B1 손계산과 일치한다', () => {
    const s = baseSim({
      customers: 100, arpu: 3, acqBase: 0, churnRate: 0.1, quality: 50, cogsRatio: 0.2,
      headcount: 2, avgSalary: 250, overhead: 100, marketingBudget: 50, debt: 0, cash: 5000,
      capPerHead: 500, morale: 60, reputation: 50,
    });
    const r = advanceMonth(s);
    // 이탈 10 → 90명, 매출 round(95*3)=285, 원가 57, 비용 57+500+100+50=707
    expect(r.state.customers).toBe(90);
    expect(r.state.monthlyRevenue).toBe(285);
    expect(r.profit).toBe(285 - 707);
    expect(r.state.cash).toBe(5000 + 285 - 707);
  });
  it('B2 품질이 높을수록 이탈이 적다', () => {
    expect(effectiveChurn(baseSim({ quality: 80 }))).toBeLessThan(effectiveChurn(baseSim({ quality: 30 })));
  });
  it('B3 마케팅비가 늘면 신규 고객이 늘어난다', () => {
    expect(acquisitionRate(baseSim({ marketingBudget: 600 }))).toBeGreaterThan(
      acquisitionRate(baseSim({ marketingBudget: 100 })),
    );
  });
  it('B4 반복해도 지표 범위를 벗어나지 않는다', () => {
    let s = baseSim({ cash: 100000 });
    for (let i = 0; i < 200; i++) {
      s = advanceMonth(s).state;
      for (const v of [s.quality, s.morale, s.reputation]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
      expect(Number.isInteger(s.customers)).toBe(true);
      expect(s.customers).toBeGreaterThanOrEqual(0);
    }
  });
  it('B5 플랫폼만 네트워크 효과가 있다', () => {
    const p = baseSim({ businessType: 'platform', customers: 3000 });
    const o = baseSim({ businessType: 'saas', customers: 3000 });
    expect(acquisitionRate(p)).toBeGreaterThan(acquisitionRate(o));
  });
});

describe('C. 현금 음수·파산', () => {
  const broke = () =>
    baseSim({ cash: 100, customers: 0, acqBase: 0, headcount: 1, avgSalary: 250, overhead: 100, marketingBudget: 0, initialCapital: 10000 });

  it('C1 월말 현금이 음수면 연속 개월이 1이 된다', () => {
    const r = advanceMonth(broke());
    expect(r.state.cash).toBeLessThan(0);
    expect(r.state.insolvencyMonths).toBe(1);
    expect(r.bankrupt).toBe(false);
  });
  it('C2 2개월 연속 음수면 파산한다', () => {
    const r = advanceMonth(advanceMonth(broke()).state);
    expect(r.state.insolvencyMonths).toBe(2);
    expect(r.bankrupt).toBe(true);
  });
  it('C3 다시 흑자가 되면 카운터가 초기화된다', () => {
    const s = baseSim({ cash: 1000, insolvencyMonths: 1, customers: 2000, arpu: 5, acqBase: 0, churnRate: 0.01 });
    expect(advanceMonth(s).state.insolvencyMonths).toBe(0);
  });
  it('C4 압류선(자본의 50%)을 넘으면 즉시 파산한다', () => {
    const s = { ...broke(), cash: -4900 };
    expect(advanceMonth(s).bankrupt).toBe(true);
  });
  it('C5 현금이 음수일 때 비용이 드는 대안은 선택할 수 없다', () => {
    const opt = getEvent('e01-market-need').options.find((o) => o.id === 'interview')!;
    const r = evaluateOption(baseSim({ cash: -100 }), opt);
    expect(r.available).toBe(false);
    expect(r.reasons.join()).toContain('현금 부족');
  });
  it('C6 모든 이벤트에는 현금·인력이 최악이어도 고를 수 있는 대안이 있다', () => {
    for (const ev of ALL_EVENTS) {
      for (const b of BUSINESS) {
        const worst = baseSim({ businessType: b, cash: -1000, headcount: 1 });
        const usable = ev.options
          .filter((o) => !o.onlyFor || o.onlyFor.includes(b))
          .filter((o) => evaluateOption(worst, o).available);
        expect(usable.length, `${ev.id}/${b}`).toBeGreaterThan(0);
      }
    }
  });
  it('C7 파산한 게임은 종료되고 점수가 감점된다', () => {
    const g = play({ capital: 1000, members: 6, mode: 'full' }, firstAvailable);
    expect(g.status).toBe('bankrupt');
    expect(g.phase).toBe('finished');
  });
});

describe('D. 인력 부족', () => {
  it('D1 가동률이 1을 넘으면 성장 둔화·품질 하락', () => {
    const over = baseSim({ customers: 5000, headcount: 1, capPerHead: 100, quality: 60 });
    const ok = baseSim({ customers: 50, headcount: 1, capPerHead: 100, quality: 60 });
    expect(utilization(over)).toBeGreaterThan(1);
    expect(acquisitionRate(over)).toBeLessThan(acquisitionRate({ ...over, capPerHead: 100000 }));
    expect(effectiveChurn(over)).toBeGreaterThan(effectiveChurn(ok));
    expect(advanceMonth(over).state.quality).toBeLessThan(advanceMonth(ok).state.quality);
  });
  it('D2 인력 조건이 있는 대안은 인력이 모자라면 비활성', () => {
    const opt = getEvent('e12-expansion').options.find((o) => o.id === 'full-launch')!;
    const r = evaluateOption(baseSim({ headcount: 3, cash: 99999 }), opt);
    expect(r.available).toBe(false);
    expect(r.reasons.join()).toContain('인력 5명 이상 필요');
  });
  it('D3 사기가 바닥이면 인력이 빠지지만 1명은 남는다', () => {
    const low = baseSim({ morale: 5, headcount: 3, cash: 99999 });
    expect(advanceMonth(low).state.headcount).toBe(2);
    expect(advanceMonth({ ...low, headcount: 1 }).state.headcount).toBe(1);
  });
  it('D4 1인 창업이면 공동창업자 갈등 대신 번아웃 이벤트가 나온다', () => {
    const sim = createInitialState(baseSetup({ members: 1 }));
    const plan = planStageEvents({ sim, mode: 'full', seed: 1 }, 1);
    expect(plan).toContain('e03f-solo-burnout');
    expect(plan).not.toContain('e03-cofounder');
  });
  it('D5 채용하면 평균 인건비가 가중 평균으로 오른다', () => {
    const s = applyEffects(baseSim({ headcount: 2, avgSalary: 250 }), { headcount: 2 });
    expect(s.headcount).toBe(4);
    expect(s.avgSalary).toBeCloseTo(325, 1);
  });
});

describe('E. 이벤트 데이터 무결성', () => {
  it('E1 모든 이벤트에 대안이 3개 이상', () => {
    for (const ev of ALL_EVENTS) expect(ev.options.length, ev.id).toBeGreaterThanOrEqual(3);
  });
  it('E2 id 중복 없음', () => {
    const ids = ALL_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ev of ALL_EVENTS) {
      const o = ev.options.map((x) => x.id);
      expect(new Set(o).size, ev.id).toBe(o.length);
    }
  });
  it('E3 모든 대안의 마지막 결과는 조건이 없다', () => {
    for (const ev of ALL_EVENTS)
      for (const o of ev.options) {
        expect(o.outcomes.length).toBeGreaterThan(0);
        expect(o.outcomes[o.outcomes.length - 1].when, `${ev.id}/${o.id}`).toBeUndefined();
      }
  });
  it('E4 비용 0이고 조건 없는 대안이 업종마다 하나 이상', () => {
    for (const ev of ALL_EVENTS)
      for (const b of BUSINESS) {
        const free = ev.options.filter(
          (o) => (!o.onlyFor || o.onlyFor.includes(b)) && !(o.cost ?? 0) && !o.minHeadcount && !o.requires,
        );
        expect(free.length, `${ev.id}/${b}`).toBeGreaterThan(0);
      }
  });
  it('E5 대체 이벤트 연결', () => {
    for (const ev of ALL_EVENTS) {
      if (ev.fallbackId) {
        const fb = getEvent(ev.fallbackId);
        expect(fb.isFallback).toBe(true);
        expect(fb.appliesTo).toBeUndefined();
        expect(fb.applicableWhen).toBeUndefined();
        expect(fb.stage).toBe(ev.stage);
      }
      if (ev.appliesTo || ev.applicableWhen) expect(ev.fallbackId, ev.id).toBeTruthy();
    }
  });
  it('E6 업종 필터 후에도 대안이 3개 이상', () => {
    for (const ev of ALL_EVENTS)
      for (const b of BUSINESS) {
        const n = ev.options.filter((o) => !o.onlyFor || o.onlyFor.includes(b)).length;
        expect(n, `${ev.id}/${b}`).toBeGreaterThanOrEqual(3);
      }
  });
  it('E7 단계별 후보는 5개 이상이고 모두 대안 3개 이상', () => {
    for (const st of [1, 2, 3] as Stage[]) expect(stageCandidates(st).length).toBeGreaterThanOrEqual(5);
  });
  it('E8 모든 이벤트에 토론 질문이 있고 업종별 설명은 존재하는 업종만 쓴다', () => {
    for (const ev of ALL_EVENTS) {
      expect(ev.discussionPrompts.length).toBeGreaterThanOrEqual(2);
      for (const k of Object.keys(ev.contextByType ?? {})) expect(Object.keys(BUSINESS_TYPES)).toContain(k);
    }
  });
});

describe('F. 스케줄러', () => {
  it('F1 전체 모드: 후보 전부, 중복 없음, 부적절한 이벤트 없음', () => {
    for (const b of BUSINESS)
      for (const st of [1, 2, 3] as Stage[]) {
        const sim = createInitialState(baseSetup({ businessType: b }));
        const plan = planStageEvents({ sim, mode: 'full', seed: 3 }, st);
        expect(plan.length, `${b}/${st}`).toBe(stageCandidates(st).length);
        expect(new Set(plan).size).toBe(plan.length);
        for (const id of plan) {
          const ev = getEvent(id);
          expect(ev.isFallback || isEventApplicable(ev, sim), `${b}/${id}`).toBe(true);
        }
      }
  });
  it('F2 수업용 모드: 연차당 3개 (총 9개)', () => {
    const sim = createInitialState(baseSetup());
    for (const st of [1, 2, 3] as Stage[]) expect(planStageEvents({ sim, mode: 'class', seed: 3 }, st).length).toBe(3);
  });
  it('F3 오프라인은 플랫폼 정책 이벤트 대신 임대료 이벤트', () => {
    const sim = createInitialState(baseSetup({ businessType: 'offline' }));
    const plan = planStageEvents({ sim, mode: 'full', seed: 1 }, 2);
    expect(plan).toContain('e10f-lease');
    expect(plan).not.toContain('e10-platform-risk');
    const digital = createInitialState(baseSetup({ businessType: 'saas' }));
    expect(planStageEvents({ sim: digital, mode: 'full', seed: 1 }, 2)).toContain('e10-platform-risk');
  });
  it('F4 같은 시드는 같은 계획, 시드가 달라지면 달라질 수 있다', () => {
    const sim = createInitialState(baseSetup());
    expect(planStageEvents({ sim, mode: 'class', seed: 5 }, 2)).toEqual(planStageEvents({ sim, mode: 'class', seed: 5 }, 2));
    const variants = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) variants.add(planStageEvents({ sim, mode: 'class', seed }, 2).join());
    expect(variants.size).toBeGreaterThan(1);
  });
  it('F5 이벤트 사이 개월 수의 합은 항상 12', () => {
    for (let n = 1; n <= 5; n++) {
      const a = monthsAllocation(n);
      expect(a.reduce((x, y) => x + y, 0)).toBe(12);
      expect(Math.min(...a)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('G. 결정·흐름', () => {
  function atEvent(eventId: string, over: Partial<Game['sim']> = {}): Game {
    const g = beginSimulation(newGame());
    return { ...g, plan: [eventId], planIndex: 0, sim: { ...g.sim, ...over } };
  }

  it('G1 근거가 20자 미만이면 확정할 수 없다', () => {
    const g = atEvent('e01-market-need');
    const r = submitDecision(g, 'narrow-target', '너무 짧음');
    expect(r.ok).toBe(false);
    const ok = submitDecision(g, 'narrow-target', '고객 인터뷰 결과 지불 의사가 낮아 대상을 좁히기로 했다.');
    expect(ok.ok).toBe(true);
  });
  it('G2 결정 기록에 전/직후/기간 후 스냅샷이 남는다', () => {
    const g = atEvent('e01-market-need');
    const r = submitDecision(g, 'interview', '핵심 고객을 먼저 만나 가격 가설을 검증하기로 합의했다.', '기능 개발도 필요하다는 의견');
    if (!r.ok) throw new Error(r.error);
    const d = r.game.decisions[0];
    expect(d.before.month).toBe(0);
    expect(d.afterImmediate.cash).toBe(d.before.cash - 300);
    expect(d.afterPeriod.month).toBe(d.monthsElapsed);
    expect(d.dissent).toContain('기능');
    expect(r.game.phase).toBe('outcome');
  });
  it('G3 선택 전 화면 데이터에는 효과·결과가 없다', () => {
    const g = beginSimulation(newGame());
    const view = JSON.stringify(resolveEvent(g));
    expect(view).not.toContain('outcomes');
    expect(view).not.toContain('effects');
    expect(view).not.toContain('verdict');
    expect(view).not.toContain('"text":');
  });
  it('G4 같은 대안도 회사 상태에 따라 결과가 달라진다', () => {
    const strong = atEvent('e02-runway', { customers: 200, quality: 60, reputation: 50, revHist: [100, 200] });
    const weak = atEvent('e02-runway', { customers: 20, quality: 40 });
    const a = submitDecision(strong, 'seed', '지표가 충분하다고 판단해 투자 유치를 시도하기로 했다.');
    const b = submitDecision(weak, 'seed', '지표가 부족하지만 일단 투자 유치를 시도하기로 했다.');
    if (!a.ok || !b.ok) throw new Error('결정 실패');
    expect(a.game.decisions[0].verdict).toBe('strong');
    expect(b.game.decisions[0].verdict).toBe('weak');
    expect(a.game.decisions[0].afterImmediate.cash).toBeGreaterThan(b.game.decisions[0].afterImmediate.cash);
  });
  it('G4b 투자금(cashMonths)은 회사의 월 고정비 규모에 비례한다', () => {
    const small = atEvent('e02-runway', { customers: 200, quality: 60, reputation: 50, marketingBudget: 100, revHist: [100, 200] });
    const big = atEvent('e02-runway', { customers: 200, quality: 60, reputation: 50, marketingBudget: 900, revHist: [100, 200] });
    const a = submitDecision(small, 'seed', '지표가 충분하다고 판단해 투자 유치를 시도하기로 했다.');
    const b = submitDecision(big, 'seed', '지표가 충분하다고 판단해 투자 유치를 시도하기로 했다.');
    if (!a.ok || !b.ok) throw new Error('결정 실패');
    const gainA = a.game.decisions[0].afterImmediate.cash - a.game.decisions[0].before.cash;
    const gainB = b.game.decisions[0].afterImmediate.cash - b.game.decisions[0].before.cash;
    expect(gainB).toBeGreaterThan(gainA);
    expect(a.game.sim.dilution).toBeGreaterThanOrEqual(15);
  });
  it('G5 비용이 보유 현금보다 큰 대안은 거부된다', () => {
    const g = atEvent('e01-market-need', { cash: 100 });
    const r = submitDecision(g, 'more-features', '기능이 부족하다는 의견이 많아 개발을 늘리기로 했다.');
    expect(r.ok).toBe(false);
  });
  it('G6 수업용 모드: 결정 9번으로 끝난다', () => {
    const g = play({ capital: 20000, mode: 'class' }, cheapest);
    expect(g.phase).toBe('finished');
    expect(g.status).toBe('completed');
    expect(g.decisions.length).toBe(9);
    expect(g.history.length).toBe(37);
    expect(g.sim.month).toBe(36);
  });
  it('G7 전체 모드: 후보 이벤트 전부 결정하고 끝난다', () => {
    const g = play({ capital: 20000, mode: 'full' }, cheapest);
    expect(g.phase).toBe('finished');
    expect(g.decisions.length).toBe(g.status === 'completed' ? ([1, 2, 3] as Stage[]).reduce((n, st) => n + stageCandidates(st).length, 0) : g.decisions.length);
    if (g.status === 'completed') expect(g.sim.month).toBe(36);
  });
  it('G8 같은 입력·같은 선택이면 같은 결과', () => {
    expect(play({ mode: 'class' }, mostExpensive, 11)).toEqual(play({ mode: 'class' }, mostExpensive, 11));
  });
  it('G9 모든 업종·전략·모드에서 예외 없이 끝난다', () => {
    for (const b of BUSINESS)
      for (const mode of ['class', 'full'] as const)
        for (const choose of [firstAvailable, cheapest, mostExpensive]) {
          const g = play({ businessType: b, mode, members: 2, capital: 5000 }, choose);
          expect(g.phase, `${b}/${mode}`).toBe('finished');
          expect(['completed', 'bankrupt']).toContain(g.status);
        }
  });
  it('G10 결과 화면에서 계속하면 다음 이벤트·연차로 넘어간다', () => {
    let g = beginSimulation(newGame({ capital: 30000 }));
    const first = resolveEvent(g)!;
    const r = submitDecision(g, first.options.find((o) => o.available)!.id, '토론 끝에 이 대안이 가장 안전하다고 판단했다.');
    if (!r.ok) throw new Error(r.error);
    g = continueFromOutcome(r.game);
    expect(g.phase).toBe('event');
    expect(g.planIndex).toBe(1);
  });
});

describe('H. 점수·보고서·저장', () => {
  it('H1 점수는 0~100이고 파산은 감점된다', () => {
    const g = play({ capital: 20000 }, cheapest);
    const s = scoreGame(g);
    expect(s.total).toBeGreaterThanOrEqual(0);
    expect(s.total).toBeLessThanOrEqual(100);
    expect(scoreGame({ ...g, status: 'bankrupt' }).total).toBeLessThan(s.total);
  });
  it('H2 보고서 필수 항목이 만들어진다', () => {
    const g = play({ capital: 20000 }, cheapest);
    const r = generateReport(g);
    expect(r.headline).toContain('테스트컴퍼니');
    expect(r.summary.length).toBeGreaterThanOrEqual(3);
    expect(r.turningPoints.length).toBeGreaterThan(0);
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.discussion.total).toBe(g.decisions.length);
    expect(r.questions.length).toBeGreaterThan(0);
    expect(r.endNotes.join()).toContain('교육용 가정');
    expect(reportToMarkdown(g, r)).toContain('의사결정 기록');
  });
  it('H3 JSON 직렬화 왕복', () => {
    const g = play({ capital: 20000 }, cheapest);
    expect(JSON.parse(JSON.stringify(g))).toEqual(g);
  });
  it('H4 저장소: 저장·불러오기·초기화', async () => {
    const mem = new Map<string, string>();
    const store = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    const adapter = new LocalStorageAdapter('k', store);
    const g = beginSimulation(newGame());
    await adapter.save(g);
    expect(await adapter.load()).toEqual(g);
    await adapter.clear();
    expect(await adapter.load()).toBeNull();
  });
  it('H5 저장소: 버전이 다르거나 깨진 데이터는 불러오지 않는다', async () => {
    const mem = new Map<string, string>([['k', JSON.stringify({ version: 99 })]]);
    const store = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    const adapter = new LocalStorageAdapter('k', store);
    expect(await adapter.load()).toBeNull();
    expect(adapter.lastProblem).toBe('incompatible');
    mem.set('k', '{깨진 json');
    expect(await adapter.load()).toBeNull();
    expect(adapter.lastProblem).toBe('corrupt');
  });
  it('H6 금액 서식', () => {
    expect(formatMoney(10000)).toBe('1억원');
    expect(formatMoney(12500)).toBe('1억 2,500만원');
    expect(formatMoney(-300)).toBe('-300만원');
  });
});


import { withJosa, fillText, encodeSubmission, decodeSubmission, buildSubmission, submissionsToCsv } from '../src/engine';

describe('조사·제출 코드', () => {
  it('받침에 따라 조사를 고른다', () => {
    expect(withJosa('케어메이트', '이/가')).toBe('케어메이트가');
    expect(withJosa('모아케어', '은/는')).toBe('모아케어는');
    expect(withJosa('책', '이/가')).toBe('책이');
    expect(withJosa('서울', '으로/로')).toBe('서울로');
    expect(withJosa('집', '으로/로')).toBe('집으로');
    expect(withJosa('1,278만원', '으로/로')).toBe('1,278만원으로');
  });
  it('템플릿 토큰을 채운다', () => {
    expect(fillText('{company:이/가} {target:을/를} 찾는다', { company: '모아', target: '대학생', idea: '앱' })).toBe('모아가 대학생을 찾는다');
  });
  it('제출 코드는 인코딩·복원된다', () => {
    const g = newGame();
    const code = encodeSubmission(buildSubmission(g));
    const back = decodeSubmission(code);
    expect(back?.team).toBe(g.setup.companyName);
    expect(decodeSubmission('엉터리')).toBeNull();
    expect(submissionsToCsv([back!]).startsWith('﻿')).toBe(true);
  });
});

import { previewRunway, computeRunway, ADVISORS, adviceFor } from '../src/engine';
import { play as playGame, firstAvailable as pick } from './helpers';

describe('런웨이 미리보기·전문가 조언', () => {
  it('비용이 클수록 예상 런웨이가 짧아진다', () => {
    const g = newGame();
    const now = computeRunway(g.sim);
    const a = previewRunway(g.sim, 0);
    const b = previewRunway(g.sim, Math.round(g.sim.cash * 0.6));
    expect(a.cashAfter).toBeGreaterThan(b.cashAfter);
    if (now !== null) expect(b.months as number).toBeLessThan(a.months as number);
    expect(previewRunway(g.sim, g.sim.cash + 1).months).toBe(0);
  });
  it('전문가 4명 모두 같은 게임에 같은 조언을 낸다', () => {
    const g = playGame({}, pick);
    expect(ADVISORS).toHaveLength(4);
    for (const a of ADVISORS) {
      const x = adviceFor(g, a.id);
      expect(x.paragraphs.length).toBeGreaterThanOrEqual(3);
      expect(x.actions).toHaveLength(3);
      expect(JSON.stringify(adviceFor(g, a.id))).toBe(JSON.stringify(x));
    }
  });
});

import { aiAutomated, capacity as capacityOf, applyEffects as applyFx, BUSINESS_TYPES as BT } from '../src/engine';

describe('AI 자동화 비율', () => {
  it('업종별 상한이 다르고 소프트웨어가 가장 높고 오프라인이 가장 낮다', () => {
    const v = (k: keyof typeof BT) => BT[k].aiShare;
    expect(v('saas')).toBeGreaterThan(v('content'));
    expect(v('content')).toBeGreaterThan(v('platform'));
    expect(v('platform')).toBeGreaterThan(v('commerce'));
    expect(v('commerce')).toBeGreaterThan(v('offline'));
  });
  it('AI 도입은 처리 가능 고객 수를 업종 상한까지만 늘린다', () => {
    const base = baseSim({ businessType: 'saas', aiShare: 0.6, aiLevel: 0 });
    const full = applyFx(base, { aiLevel: 5 });
    expect(full.aiLevel).toBe(1);
    expect(aiAutomated(full)).toBeCloseTo(0.6);
    expect(capacityOf(full) / capacityOf(base)).toBeCloseTo(2.5, 1);
    const offline = applyFx(baseSim({ businessType: 'offline', aiShare: 0.15, aiLevel: 0 }), { aiLevel: 1 });
    expect(capacityOf(offline) / capacityOf(baseSim({ businessType: 'offline', aiShare: 0.15 }))).toBeLessThan(1.2);
  });
});

import { unitEconomics, acquisitionRate as acqRate, metricValue as metric, advanceMonth as advance } from '../src/engine';

describe('시장 규모·성장률·단위경제', () => {
  function atEvent(eventId: string, over: Partial<Game['sim']> = {}): Game {
    const g = beginSimulation(newGame());
    return { ...g, plan: [eventId], planIndex: 0, sim: { ...g.sim, ...over } };
  }
  it('고객이 시장(TAM)을 채울수록 신규 유입이 줄어든다', () => {
    const base = baseSim();
    const low = acqRate({ ...base, tam: 100000, customers: 10 });
    const high = acqRate({ ...base, tam: 100, customers: 90 });
    expect(high).toBeLessThan(low);
  });
  it('최근 매출 기록으로 성장률을 계산한다', () => {
    const s = baseSim({ revHist: [100, 120, 150] });
    expect(metric(s, 'growth6')).toBeCloseTo(0.5);
    expect(metric(baseSim({ revHist: [100] }), 'growth6')).toBe(0);
    const next = advance(baseSim({ revHist: [1, 2, 3, 4, 5, 6, 7] })).state;
    expect(next.revHist?.length).toBe(7);
  });
  it('단위경제: 마케팅비가 늘면 고객 확보 비용이 늘고 회수 기간이 길어진다', () => {
    const a = unitEconomics(baseSim({ marketingBudget: 100 }));
    const b = unitEconomics(baseSim({ marketingBudget: 800 }));
    expect(b.cac).toBeGreaterThan(a.cac);
    expect(a.ltv).toBeGreaterThan(0);
  });
  it('투자는 성장률·이탈률이 약하면 조건부(작은 금액)로 바뀐다', () => {
    const grow = atEvent('e02-runway', { customers: 200, quality: 60, reputation: 50, revHist: [100, 200] });
    const flat = atEvent('e02-runway', { customers: 200, quality: 60, reputation: 50, revHist: [200, 200] });
    const a = submitDecision(grow, 'seed', '성장률과 이탈률을 근거로 투자 유치를 시도하기로 했다.');
    const b = submitDecision(flat, 'seed', '성장률과 이탈률을 근거로 투자 유치를 시도하기로 했다.');
    if (!a.ok || !b.ok) throw new Error('결정 실패');
    expect(a.game.decisions[0].verdict).toBe('strong');
    expect(b.game.decisions[0].verdict).toBe('ok');
  });
});

import { EMERGENCY_EVENT_ID, fixedCostDelta, monthlyFixedCost as fixedCostOf } from '../src/engine';

describe('J. 일회성 비용·월 고정비 구분, 긴급 생존 카드', () => {
  function atEvent(eventId: string, over: Partial<Game['sim']> = {}): Game {
    const g = beginSimulation(newGame());
    return { ...g, plan: [eventId], planIndex: 0, sim: { ...g.sim, ...over } };
  }

  it('J1 채용 대안은 월 고정비가 늘고, 외주·절감 대안은 방향이 다르다', () => {
    const g = atEvent('e07-hiring', { cash: 30000, headcount: 3 });
    const ev = resolveEvent(g)!;
    const hire = ev.options.filter((o) => o.fixedDelta.max > 0);
    expect(hire.length).toBeGreaterThan(0);
    for (const o of hire) expect(o.fixedDelta.min).toBeGreaterThan(0);
    // 월 고정비 변동은 실제 결과 적용값과 일치한다
    const raw = getEvent('e07-hiring').options.find((o) => o.id === hire[0].id)!;
    const after = applyEffects(g.sim, raw.outcomes[0].effects);
    const d = fixedCostOf(after) - fixedCostOf(g.sim);
    expect(d).toBeGreaterThanOrEqual(fixedCostDelta(g, raw).min);
    expect(d).toBeLessThanOrEqual(fixedCostDelta(g, raw).max);
  });

  it('J2 예상 런웨이는 월 고정비 증가분만큼 짧아진다', () => {
    const s = baseSim({ cash: 6000 });
    const a = previewRunway(s, 0, 0).months!;
    const b = previewRunway(s, 0, 250).months!;
    expect(b).toBeLessThan(a);
    // 같은 금액이라도 한 번 나가는 비용보다 매달 나가는 비용이 훨씬 아프다
    const once = previewRunway(s, 300, 0).months!;
    const monthly = previewRunway(s, 0, 300).months!;
    expect(monthly).toBeLessThan(once);
  });

  function critical(): Game {
    const g = beginSimulation(newGame());
    const sim = { ...g.sim, cash: 300 };
    return { ...g, plan: ['e01-market-need', 'e02-pricing'], planIndex: 0, phase: 'outcome', sim };
  }

  it('J3 런웨이 1개월 미만이면 다음 이벤트 앞에 긴급 카드가 한 번 끼어든다', () => {
    const next = continueFromOutcome(critical());
    expect(next.plan[next.planIndex]).toBe(EMERGENCY_EVENT_ID);
    const ev = resolveEvent(next)!;
    expect(ev.emergency).toBe(true);
    expect(ev.options.length).toBeGreaterThanOrEqual(5);
    expect(ev.total).toBe(2); // 연차 이벤트 수에는 포함되지 않는다
  });

  it('J4 긴급 카드는 시간을 흘리지 않고, 쓴 뒤에는 다시 열리지 않는다', () => {
    const g = continueFromOutcome(critical());
    const r = submitDecision(g, 'distress-equity', '지분을 넘기더라도 지금은 살아남는 것이 우선이라고 팀이 합의했다.');
    if (!r.ok) throw new Error(r.error);
    expect(r.game.lastOutcome?.monthsElapsed).toBe(0);
    expect(r.game.sim.flags).toContain('emergency-used');
    expect(r.game.sim.cash).toBeGreaterThan(g.sim.cash);
    const after = continueFromOutcome({ ...r.game, sim: { ...r.game.sim, cash: 50 } });
    expect(after.plan[after.planIndex]).not.toBe(EMERGENCY_EVENT_ID);
  });

  it('J5 런웨이가 충분하면 긴급 카드는 열리지 않는다', () => {
    const g = { ...critical(), sim: { ...critical().sim, cash: 100000 } };
    const next = continueFromOutcome(g);
    expect(next.plan).not.toContain(EMERGENCY_EVENT_ID);
  });

  it('J6 보고서에 인사이트와 원칙이 들어 있다', () => {
    const g = play({ capital: 20000 }, cheapest);
    const r = generateReport(g);
    expect(r.insights.length).toBeGreaterThanOrEqual(5);
    expect(r.principles.length).toBe(5);
    expect(reportToMarkdown(g, r)).toContain('인사이트');
  });
});

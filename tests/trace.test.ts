import { describe, expect, it } from 'vitest';
import {
  LEGACY_NOTICE,
  beginDecision,
  beginSimulation,
  buildResultReport,
  cardForDecision,
  cashBridge,
  compareAlternative,
  createGame,
  continueFromOutcome,
  feedbackView,
  resolveEvent,
  resolvePeriod,
  submitDecision,
  summaryToMarkdown,
  type Game,
} from '../src/engine';
import { LocalStorageAdapter } from '../src/storage/local';
import { NOW, baseSetup, cheapest, firstAvailable, mostExpensive, play } from './helpers';

const R = '테스트용 토론 근거 문장입니다. 스무 자 이상.';
const choosers = { cheapest, firstAvailable, mostExpensive };

describe('선택 직접 효과와 이후 기간 분리', () => {
  for (const [name, ch] of Object.entries(choosers)) {
    it(`${name}: 모든 결정에서 현금 검산이 맞는다`, () => {
      const g = play({}, ch);
      expect(g.decisions.length).toBeGreaterThan(0);
      for (const d of g.decisions) {
        expect(d.trace).toBeDefined();
        const b = cashBridge(d.trace!);
        expect(b.matches).toBe(true);
        // 일회성 지출은 직접 효과에만 들어 있고 기간 운영에는 중복되지 않는다
        expect(d.trace!.direct.netCash).toBe(d.trace!.afterDirect.cash - d.trace!.before.cash);
        expect(d.trace!.period.netCash).toBe(d.trace!.afterPeriod.cash - d.trace!.afterDirect.cash);
      }
    });
  }

  it('beginDecision은 이후 기간을 계산하지 않고, resolvePeriod와 합치면 submitDecision과 같다', () => {
    const g0 = beginSimulation(createGame(baseSetup(), { now: NOW, seed: 7, id: 't' }));
    const ev = resolveEvent(g0)!;
    const opt = ev.options.find((o) => o.available)!.id;
    const a = beginDecision(g0, opt, R, '', NOW);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.game.phase).toBe('feedback');
    expect(a.game.sim.month).toBe(g0.sim.month); // 시간이 흐르지 않았다
    expect(a.game.decisions.length).toBe(g0.decisions.length);
    const fb = feedbackView(a.game)!;
    expect(fb.numbers.length).toBeGreaterThan(0);
    expect(JSON.stringify(fb)).not.toContain(a.game.pending!.draft.optionLabel + '__none');
    const b = resolvePeriod(a.game, NOW);
    const c = submitDecision(g0, opt, R, '', NOW);
    expect(b.ok && c.ok).toBe(true);
    if (b.ok && c.ok) expect(b.game).toEqual(c.game);
  });

  it('feedback 단계 저장·복원이 가능하다', () => {
    const store: Record<string, string> = {};
    const kv = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v), removeItem: (k: string) => void delete store[k] };
    const ad = new LocalStorageAdapter('k', kv);
    const g0 = beginSimulation(createGame(baseSetup(), { now: NOW, seed: 7, id: 't' }));
    const a = beginDecision(g0, resolveEvent(g0)!.options.find((o) => o.available)!.id, R, '', NOW);
    if (!a.ok) throw new Error(a.error);
    ad.saveSync(a.game);
    const back = ad.loadSync()!;
    expect(back.phase).toBe('feedback');
    const r = resolvePeriod(back, NOW);
    expect(r.ok).toBe(true);
  });
});

describe('옛 저장 기록 호환', () => {
  function stripTrace(g: Game): Game {
    const { bankruptcy: _b, ...rest } = g;
    void _b;
    return { ...rest, decisions: g.decisions.map(({ trace: _t, ...d }) => (void _t, d)) };
  }
  it('trace가 없는 기록도 열리고 직접 효과를 만들어 내지 않는다', () => {
    const g = stripTrace(play({}, mostExpensive));
    const r = buildResultReport(g);
    expect(r.details.legacyCount).toBe(g.decisions.length);
    for (const d of r.decisive) {
      expect(d.card.notices).toContain(LEGACY_NOTICE);
      expect(d.card.rows.every((x) => x.afterDirect === null)).toBe(true);
      expect(d.card.directLines).toHaveLength(0);
      expect(d.card.effects).toBeNull();
    }
    expect(r.alternative).toBeNull();
    expect(r.alternativeNote).toContain('저장돼 있지 않아');
    const alt = compareAlternative(g, 0, g.decisions[0].optionId);
    expect(alt.ok).toBe(false);
    expect(() => summaryToMarkdown(g, r)).not.toThrow();
  });
  it('이전 규칙으로 끝난 파산 기록(bankruptcy 없음)도 보고서가 열린다', () => {
    const g0 = play({ capital: 1000, members: 6, mode: 'full' }, firstAvailable);
    expect(g0.status).toBe('bankrupt');
    const { bankruptcy: _b, ...old } = g0;
    void _b;
    const r = buildResultReport(old as Game);
    expect(r.cause.title).toBe('파산 원인');
    expect(r.cause.legacyRule).toBe(true);
  });
});

describe('결과보고서 구조', () => {
  for (const [name, ch] of Object.entries(choosers)) {
    it(`${name}: 핵심 숫자 4개, 결정적 결정 2개 이하, 토론 질문 2개, 조사 오류 없음`, () => {
      const g = play({}, ch);
      const r = buildResultReport(g);
      expect(r.result.figures).toHaveLength(4);
      expect(r.decisive.length).toBeLessThanOrEqual(2);
      expect(new Set(r.decisive.map((d) => d.card.index)).size).toBe(r.decisive.length);
      expect(r.questions).toHaveLength(2);
      const text = JSON.stringify(r) + summaryToMarkdown(g, r);
      for (const bad of ['이(가)', '을(를)', '은(는)', '와(과)', '으로(로)', '논리적으로 타당']) expect(text).not.toContain(bad);
      expect(text).not.toMatch(/undefined|NaN/);
      expect(text).not.toMatch(/명로|원였|만원로/);
    });
  }
  it('현금 구성 검산이 최종 현금과 일치한다', () => {
    for (const ch of Object.values(choosers)) {
      const r = buildResultReport(play({}, ch));
      expect(r.cause.bridgeOk).toBe(true);
    }
  });
});

describe('선택 효과 분리(직후·시간 경과·시장 요인)', () => {
  it('세 부분의 합이 합계와 같고 합계는 기록된 선택 전→기간 종료 변화와 같다', () => {
    const g = play({}, mostExpensive);
    for (let i = 0; i < g.decisions.length; i++) {
      const d = g.decisions[i];
      const t = d.trace!;
      if (t.period.months === 0) continue;
      const m = t.period.market!;
      expect(m).toBeDefined();
      const card = cardForDecision(g, i);
      const cash = card.effects!.rows.find((x) => x.label === '현금')!;
      const n = (v: string) => Number(v.replace(/[^0-9−+-]/g, '').replace('−', '-').replace('+', '')) || 0;
      expect(n(cash.total)).toBe(t.afterPeriod.cash - t.before.cash);
      expect(m.withoutMarketCustomers).toBeGreaterThanOrEqual(0);
      // 시장 압력은 고객·현금을 늘리지 않는다
      expect(m.customers).toBeLessThanOrEqual(0);
    }
  });
  it('얻은 것·치른 대가에는 선택 직후 변화만 쓰고 시나리오 서술은 검증된 원인이 아니라고 표시한다', () => {
    const g = play({}, mostExpensive);
    const c = cardForDecision(g, 1);
    for (const x of [...c.gained, ...c.paid]) expect(x).not.toMatch(/^이후/);
    expect(c.periodLines.join(' ')).not.toContain(g.decisions[1].outcomeText);
  });
});

describe('파산 판정(월말 현금 0원 이하, 유예 없음)', () => {
  it('파산한 게임은 처음 0원 이하가 된 달에 끝났고 그 전 달은 모두 양수다', () => {
    const g = play({ capital: 1000 }, mostExpensive);
    expect(g.status).toBe('bankrupt');
    expect(g.bankruptcy).toBeDefined();
    const firstBad = g.history.find((h) => h.month > 0 && h.cash <= 0)!;
    expect(firstBad.month).toBe(g.bankruptcy!.month);
    expect(g.sim.month).toBe(g.bankruptcy!.month);
    expect(g.bankruptcy!.cash).toBeLessThanOrEqual(0);
    expect(g.bankruptcy!.cashBefore).toBeGreaterThan(0);
    expect(g.history.filter((h) => h.month > 0 && h.month < g.bankruptcy!.month).every((h) => h.cash > 0)).toBe(true);
    const r = buildResultReport(g);
    expect(r.cause.sentence).toContain('처음 0원 이하');
    expect(r.cause.rule.join(' ')).toContain('유예 없음');
    expect(r.cause.legacyRule).toBe(false);
  });
  it('살아남은 게임은 어느 달에도 월말 현금이 0원 이하가 아니다', () => {
    const g = play({}, cheapest);
    if (g.status !== 'bankrupt') expect(g.history.every((h) => h.month === 0 || h.cash > 0)).toBe(true);
  });
});

describe('다른 선택이었다면?', () => {
  it('같은 선택을 다시 계산하면 기록과 같고 원본은 바뀌지 않는다', () => {
    const g = play({}, firstAvailable);
    const snapshot = JSON.stringify(g);
    const i = g.decisions.findIndex((d) => d.trace && d.trace.period.months > 0);
    const r = compareAlternative(g, i, g.decisions[i].optionId);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.original.end.cash).toBe(g.decisions[i].trace!.afterPeriod.cash);
      expect(r.alternative.end.cash).toBe(r.original.end.cash);
    }
    expect(JSON.stringify(g)).toBe(snapshot);
  });
});

describe('진행 흐름', () => {
  it('continueFromOutcome 이후 다음 이벤트로 이어진다', () => {
    const g0 = beginSimulation(createGame(baseSetup(), { now: NOW, seed: 7, id: 't' }));
    const r = submitDecision(g0, resolveEvent(g0)!.options.find((o) => o.available)!.id, R, '', NOW);
    if (!r.ok) throw new Error(r.error);
    expect(['event', 'finished']).toContain(continueFromOutcome(r.game, NOW).phase);
  });
});

describe('조사 자동 조합', () => {
  it('받침에 맞는 조사가 붙는다(회귀)', () => {
    const g = play({}, mostExpensive);
    const sr = buildResultReport(g);
    const text = JSON.stringify(sr);
    expect(text).not.toMatch(/명로|원였|원을 |’로 /);
    expect(text).not.toMatch(/(?:만원|명)\)와 /);
  });
});

describe('연도별 고객 감소 설명', () => {
  it('고객이 줄어든 해에는 기록된 신규·이탈 수치로 이유를 붙인다', () => {
    for (const ch of Object.values(choosers)) {
      const g = play({}, ch);
      const r = buildResultReport(g);
      let prev = g.history[0].customers;
      for (const y of r.details.years) {
        if (y.customers < prev) expect(y.customerNote).toContain('줄었습니다');
        else expect(y.customerNote).toBeNull();
        prev = y.customers;
      }
    }
  });
});

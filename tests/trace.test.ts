import { describe, expect, it } from 'vitest';
import {
  LEGACY_NOTICE,
  beginDecision,
  beginSimulation,
  buildStudentReport,
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
    return { ...g, decisions: g.decisions.map(({ trace: _t, ...d }) => (void _t, d)) };
  }
  it('trace가 없는 기록도 열리고 직접 효과를 만들어 내지 않는다', () => {
    const g = stripTrace(play({}, mostExpensive));
    const sr = buildStudentReport(g);
    expect(sr.legacyCount).toBe(g.decisions.length);
    const all = [...sr.key, ...(sr.reconsider ? [sr.reconsider.card] : [])];
    for (const c of all) {
      expect(c.notices).toContain(LEGACY_NOTICE);
      expect(c.rows.every((r) => r.afterDirect === null)).toBe(true);
      expect(c.directLines).toHaveLength(0);
    }
    const card = cardForDecision(g, 0);
    expect(card.notices).toContain(LEGACY_NOTICE);
    const alt = compareAlternative(g, 0, g.decisions[0].optionId);
    expect(alt.ok).toBe(false);
    expect(() => summaryToMarkdown(g, sr)).not.toThrow();
  });
});

describe('학생용 요약 구조', () => {
  for (const [name, ch] of Object.entries(choosers)) {
    it(`${name}: 핵심 숫자 4개, 핵심 결정 3개 이하, 중복 없음, 토론 질문 2개`, () => {
      const g = play({}, ch);
      const sr = buildStudentReport(g);
      expect(sr.result.figures).toHaveLength(4);
      expect(sr.key.length).toBeLessThanOrEqual(3);
      const ids = [...sr.key.map((k) => k.index), ...(sr.reconsider ? [sr.reconsider.card.index] : [])];
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(sr.key.map((k) => k.kind)).size).toBe(sr.key.length);
      expect(sr.questions).toHaveLength(2);
      const text = JSON.stringify(sr) + summaryToMarkdown(g, sr);
      for (const bad of ['이(가)', '을(를)', '은(는)', '와(과)', '으로(로)', '논리적으로 타당']) expect(text).not.toContain(bad);
      expect(text).not.toMatch(/undefined|NaN/);
    });
  }
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
    const sr = buildStudentReport(g);
    const text = JSON.stringify(sr);
    expect(text).not.toMatch(/명로|원였|원을 |’로 /);
    expect(text).not.toMatch(/(?:만원|명)\)와 /);
  });
});

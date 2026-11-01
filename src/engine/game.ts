// 게임 진행(상태 전이) 함수. 모두 순수 함수이며 새 Game 객체를 반환한다.

import type {
  DecisionRecord,
  EventOption,
  Game,
  PublicOption,
  ResolvedEvent,
  SetupInput,
  Stage,
} from './types';
import { MIN_RATIONALE_LENGTH } from './constants';
import { EMERGENCY_EVENT_ID, SALARY_EVENT_ID, getEvent } from './events';
import { hashString } from './rng';
import { fillText, shortIdea, shortTarget } from './josa';
import { revenueStructure } from './structure';
import { formatMoney } from './format';
import {
  advanceMonth,
  applyEffects,
  scaleMoney,
  computeRunway,
  evalConds,
  evaluateOption,
  financialStatus,
  isRunwayCritical,
  isSalaryCut,
  normalSalaryProfit,
  projectedMonthlyProfit,
  utilization,
  monthlyFixedCost,
  monthRecord,
  monthsAllocation,
  pickOutcome,
  snapshot,
} from './rules';
import { planStageEvents } from './scheduler';
import { createInitialState } from './templates';

export interface CreateOptions {
  id?: string;
  now?: string;
  seed?: number;
}

export function normalizeSetup(setup: SetupInput): SetupInput {
  return {
    ...setup,
    companyName: setup.companyName.trim(),
    idea: setup.idea.trim(),
    targetCustomer: setup.targetCustomer.trim(),
    capital: Math.round(setup.capital),
  };
}

export function createGame(input: SetupInput, opts: CreateOptions = {}): Game {
  const setup = normalizeSetup(input);
  const now = opts.now ?? new Date().toISOString();
  const base = hashString(`${setup.companyName}|${now}`);
  const sim = { ...createInitialState(setup), pressure: setup.mode === 'class' ? 0.85 : 1 };
  return {
    version: 1,
    id: opts.id ?? `game-${base.toString(36)}`,
    createdAt: now,
    updatedAt: now,
    seed: opts.seed ?? base,
    setup,
    sim,
    stage: 1,
    plan: [],
    planIndex: 0,
    phase: 'intro',
    status: 'running',
    decisions: [],
    history: [monthRecord(sim)],
  };
}

/** 초기 상태 화면(intro)에서 "1년 차 시작"을 누를 때 */
export function beginSimulation(game: Game): Game {
  if (game.phase !== 'intro') return game;
  const plan = planStageEvents({ sim: game.sim, mode: game.setup.mode, seed: game.seed }, 1);
  return { ...game, stage: 1, plan, planIndex: 0, phase: 'event' };
}

const EXTRA_IDS: string[] = [EMERGENCY_EVENT_ID, SALARY_EVENT_ID];
const isExtra = (id: string) => EXTRA_IDS.includes(id);

function fillVars(game: Game) {
  const s = game.sim;
  const st = revenueStructure(s.businessType, s.customerType ?? 'b2c', game.setup.revenueModel);
  const profit = projectedMonthlyProfit(s);
  return {
    company: game.setup.companyName,
    target: shortTarget(game.setup.targetCustomer),
    targetFull: game.setup.targetCustomer.trim(),
    idea: shortIdea(game.setup.idea),
    util: String(Math.round(utilization(s) * 100)),
    profit: `${profit >= 0 ? '' : '−'}${formatMoney(Math.abs(profit))}`,
    loss: formatMoney(Math.abs(Math.min(0, profit))),
    cash: formatMoney(s.cash),
    runway: computeRunway(s) === null ? '—' : (computeRunway(s) as number).toFixed(1),
    trend: formatMoney(Math.abs(((s.cashHist ?? [])[(s.cashHist ?? []).length - 1] ?? s.cash) - ((s.cashHist ?? [])[0] ?? s.cash))),
    normalProfit: `${normalSalaryProfit(s) >= 0 ? '' : '−'}${formatMoney(Math.abs(normalSalaryProfit(s)))}`,
    months: String(s.salaryCut?.months ?? 0),
    burden: formatMoney(s.salaryCut?.burden ?? 0),
    user: st.user,
    payer: st.payer,
    supplier: st.supplier ?? st.user,
    billing: st.billing,
    promo: st.promo,
  };
}

function fill(text: string, game: Game): string {
  return fillText(text, fillVars(game));
}

/** 이벤트 서술이 근거로 삼은 현재 지표. 현황판과 같은 계산을 쓴다. */
function factsOf(game: Game): string[] {
  const s = game.sim;
  const profit = projectedMonthlyProfit(s);
  const h = s.cashHist ?? [];
  const trend = h.length >= 2 ? h[h.length - 1] - h[0] : 0;
  const fin = financialStatus(s);
  const label = { crunch: '현금 위기', deficit: '적자', surplus: '흑자' }[fin];
  const facts = [
    `재무 상태: ${label} · 월 이익 ${profit >= 0 ? '+' : '−'}${formatMoney(Math.abs(profit))} · 현금 ${formatMoney(s.cash)}`,
    `최근 현금 증감: ${trend >= 0 ? '+' : '−'}${formatMoney(Math.abs(trend))}(최근 ${Math.max(0, h.length - 1)}개월) · 인력 가동률 ${Math.round(utilization(s) * 100)}%`,
  ];
  if (isSalaryCut(s)) facts.push(`급여 삭감 ${s.salaryCut?.months ?? 0}개월째 · 정상 급여 가정 월 이익 ${normalSalaryProfit(s) >= 0 ? '+' : '−'}${formatMoney(Math.abs(normalSalaryProfit(s)))}`);
  return facts;
}

function visibleOptions(game: Game, options: EventOption[]): EventOption[] {
  const model = game.setup.revenueModel;
  return options.filter(
    (o) =>
      (!o.onlyFor || o.onlyFor.includes(game.sim.businessType)) &&
      (!o.onlyForModel || o.onlyForModel.includes(model)) &&
      (!o.notForModel || !o.notForModel.includes(model)) &&
      (!o.showWhen || evalConds(game.sim, o.showWhen)),
  );
}

/** 결정 뒤 매달 나가는 고정비(인건비+운영비+마케팅+이자)가 얼마나 바뀌는지. 결과 조건과 무관하게 가능한 범위만 알려 준다. */
export function fixedCostDelta(game: Game, option: EventOption): { min: number; max: number } {
  const base = monthlyFixedCost(game.sim);
  const ds = option.outcomes.map((o) => monthlyFixedCost(applyEffects(game.sim, o.effects)) - base);
  return { min: Math.min(...ds), max: Math.max(...ds) };
}

/** 지금 이벤트를 결정하면 다음 결정 시점까지 흐르는 개월 수. 긴급 카드·급여 복원 같은 추가 결정은 0. */
export function monthsUntilNextDecision(game: Game): number {
  const id = game.plan[game.planIndex];
  if (!id || isExtra(id)) return 0;
  const realPlan = game.plan.filter((p) => !isExtra(p));
  const realIndex = game.plan.slice(0, game.planIndex).filter((p) => !isExtra(p)).length;
  return monthsAllocation(realPlan.length)[realIndex] ?? 12;
}

/** 선택 전 UI에 전달할 대안. outcomes·effects는 포함하지 않는다. */
export function toPublicOption(game: Game, option: EventOption): PublicOption {
  const { available, reasons } = evaluateOption(game.sim, option);
  return {
    id: option.id,
    label: fill(option.label, game),
    description: fill(option.description, game),
    cost: scaleMoney(game.sim, option.cost ?? 0),
    fixedDelta: fixedCostDelta(game, option),
    minHeadcount: option.minHeadcount ?? null,
    available,
    reasons,
  };
}

export function resolveEvent(game: Game): ResolvedEvent | null {
  if (game.phase !== 'event') return null;
  const id = game.plan[game.planIndex];
  if (!id) return null;
  const ev = getEvent(id);
  const emergency = ev.id === EMERGENCY_EVENT_ID;
  const followup = isExtra(ev.id);
  const real = game.plan.filter((p) => !isExtra(p));
  const realIndex = game.plan.slice(0, game.planIndex).filter((p) => !isExtra(p)).length;
  const variant = ev.variants?.find((v) => evalConds(game.sim, v.when));
  const situation = variant?.situation ?? ev.situation;
  const prompts = variant?.discussionPrompts ?? ev.discussionPrompts;
  const ctxRaw = variant?.context ?? ev.contextByType?.[game.sim.businessType] ?? null;
  return {
    id: ev.id,
    emergency,
    followup,
    facts: factsOf(game),
    stage: followup ? game.stage : ev.stage,
    title: variant?.title ?? ev.title,
    reason: ev.reason,
    situation: fill(situation, game),
    context: ctxRaw ? fill(ctxRaw, game) : null,
    discussionPrompts: prompts.map((p) => fill(p, game)),
    options: visibleOptions(game, ev.options).map((o) => toPublicOption(game, o)),
    index: realIndex,
    total: real.length,
  };
}

export type DecisionResult = { ok: true; game: Game } | { ok: false; error: string };

export function submitDecision(
  game: Game,
  optionId: string,
  rationale: string,
  dissent = '',
  now = new Date().toISOString(),
): DecisionResult {
  if (game.phase !== 'event') return { ok: false, error: '지금은 결정할 수 있는 단계가 아닙니다.' };
  const ev = getEvent(game.plan[game.planIndex]);
  const option = visibleOptions(game, ev.options).find((o) => o.id === optionId);
  if (!option) return { ok: false, error: '선택할 수 없는 대안입니다.' };

  const reasonText = rationale.trim();
  if (reasonText.length < MIN_RATIONALE_LENGTH) {
    return { ok: false, error: `토론 근거를 ${MIN_RATIONALE_LENGTH}자 이상 적어 주세요.` };
  }
  const check = evaluateOption(game.sim, option);
  if (!check.available) return { ok: false, error: check.reasons.join(' / ') };

  const before = snapshot(game.sim);
  const cost = scaleMoney(game.sim, option.cost ?? 0);
  const outcome = pickOutcome(game.sim, option);

  const startCash = game.sim.cash;
  let sim = { ...game.sim, cash: game.sim.cash - cost };
  sim = applyEffects(sim, outcome.effects);
  // 급여 복원 결정을 한 번 물었다는 표시
  if (ev.id === SALARY_EVENT_ID && sim.salaryCut) sim = { ...sim, salaryCut: { ...sim.salaryCut, asks: sim.salaryCut.asks + 1 } };
  const afterImmediate = snapshot(sim);
  const inflow = sim.cash - (startCash - cost);
  const fixedBefore = monthlyFixedCost(game.sim);
  const fixedAfter = monthlyFixedCost(sim);
  const runwayBefore = computeRunway(game.sim);

  // 긴급 생존 카드는 시간을 흘리지 않고 즉시 적용하며, 연차의 개월 배분에는 들어가지 않는다.
  const isFollowup = isExtra(ev.id);
  const realPlan = game.plan.filter((p) => !isExtra(p));
  const realIndex = game.plan.slice(0, game.planIndex).filter((p) => !isExtra(p)).length;
  const months = isFollowup ? 0 : (monthsAllocation(realPlan.length)[realIndex] ?? 12);
  const detail = { revenue: 0, cogs: 0, payroll: 0, overhead: 0, marketing: 0, interest: 0 };
  let operating = 0;
  const history = [...game.history];
  const notes: string[] = [];
  let bankrupt = false;
  let elapsed = 0;
  for (let i = 0; i < months; i++) {
    const r = advanceMonth(sim);
    sim = r.state;
    operating += r.profit;
    for (const k of Object.keys(detail) as (keyof typeof detail)[]) detail[k] += r.parts[k];
    elapsed += 1;
    history.push(monthRecord(sim));
    for (const n of r.notes) if (!notes.includes(n)) notes.push(n);
    if (r.bankrupt) {
      bankrupt = true;
      break;
    }
  }

  const record: DecisionRecord = {
    eventId: ev.id,
    eventTitle: ev.variants?.find((v) => evalConds(game.sim, v.when))?.title ?? ev.title,
    optionId: option.id,
    optionLabel: fill(option.label, game),
    stage: isFollowup ? game.stage : ev.stage,
    month: before.month,
    rationale: reasonText,
    dissent: dissent.trim(),
    before,
    afterImmediate,
    afterPeriod: snapshot(sim),
    monthsElapsed: elapsed,
    outcomeText: fill(outcome.text, game),
    verdict: outcome.verdict,
    reason: ev.reason,
    cost,
    fixedBefore,
    fixedAfter,
    runwayBefore,
    runwayAfter: computeRunway(sim),
    notes,
    situation: fill(
      ev.variants?.find((v) => evalConds(game.sim, v.when))?.situation ?? ev.situation,
      game,
    ),
    optionsShown: visibleOptions(game, ev.options).map((o) => {
      const pub = toPublicOption(game, o);
      return { label: pub.label, cost: pub.cost, fixedMin: pub.fixedDelta.min, fixedMax: pub.fixedDelta.max, available: pub.available, reasons: pub.reasons };
    }),
    finStatusBefore: financialStatus(game.sim),
    cashFlow: {
      oneTime: cost === 0 ? 0 : -cost,
      inflow,
      operating,
      other: sim.cash - startCash - (-cost + inflow + operating),
      total: sim.cash - startCash,
      months: elapsed,
      detail,
    },
  };

  return {
    ok: true,
    game: {
      ...game,
      sim,
      history,
      decisions: [...game.decisions, record],
      lastOutcome: record,
      phase: 'outcome',
      status: bankrupt ? 'bankrupt' : 'running',
      updatedAt: now,
    },
  };
}

/** 다음 이벤트·연차로 넘어간다(긴급 카드 삽입 전) */
function continueRaw(game: Game, now: string): Game {
  if (game.phase !== 'outcome') return game;
  if (game.status === 'bankrupt') return { ...game, phase: 'finished', updatedAt: now };

  if (game.planIndex + 1 < game.plan.length) {
    return { ...game, planIndex: game.planIndex + 1, phase: 'event', updatedAt: now };
  }
  if (game.stage === 3) {
    return { ...game, phase: 'finished', status: 'completed', updatedAt: now };
  }
  const nextStage = (game.stage + 1) as Stage;
  const plan = planStageEvents({ sim: game.sim, mode: game.setup.mode, seed: game.seed }, nextStage);
  return { ...game, stage: nextStage, plan, planIndex: 0, phase: 'event', updatedAt: now };
}

/** 런웨이가 1개월 미만이면 다음 이벤트 앞에 긴급 생존 카드를 끼워 넣는다(게임당 한 번). */
function withEmergency(game: Game): Game {
  if (game.phase !== 'event' || game.status !== 'running') return game;
  if (isExtra(game.plan[game.planIndex])) return game;
  if (game.sim.flags.includes('emergency-used')) return game;
  if (!isRunwayCritical(game.sim)) return game;
  const plan = [...game.plan.slice(0, game.planIndex), EMERGENCY_EVENT_ID, ...game.plan.slice(game.planIndex)];
  return { ...game, plan };
}

/**
 * 급여 삭감이 6개월 이상 이어지면 다음 이벤트 앞에 급여 복원 결정을 끼워 넣는다(최대 두 번: 6개월, 12개월 이상).
 * 이 결정은 시간을 흘리지 않고, 연차 이벤트 수(9개/19개)와 개월 배분에는 포함되지 않는다.
 */
export const SALARY_ASK_EVERY_MONTHS = 6;
export const SALARY_ASK_MAX = 2;
function withSalaryAsk(game: Game): Game {
  if (game.phase !== 'event' || game.status !== 'running') return game;
  if (isExtra(game.plan[game.planIndex])) return game;
  const cut = game.sim.salaryCut;
  if (!cut || !isSalaryCut(game.sim)) return game;
  if (cut.asks >= SALARY_ASK_MAX || cut.months < SALARY_ASK_EVERY_MONTHS * (cut.asks + 1)) return game;
  const plan = [...game.plan.slice(0, game.planIndex), SALARY_EVENT_ID, ...game.plan.slice(game.planIndex)];
  return { ...game, plan };
}

/** 결과 화면에서 "계속"을 눌렀을 때 */
export function continueFromOutcome(game: Game, now = new Date().toISOString()): Game {
  if (game.phase !== 'outcome') return game;
  return withSalaryAsk(withEmergency(continueRaw(game, now)));
}

/** 테스트·밸런스 점검용 자동 진행 */
export type Chooser = (event: ResolvedEvent, game: Game) => string;

export function autoPlay(setup: SetupInput, choose: Chooser, opts: CreateOptions = {}): Game {
  let g = beginSimulation(createGame(setup, opts));
  let guard = 0;
  while (g.phase === 'event') {
    if (guard++ > 60) throw new Error('자동 진행이 끝나지 않습니다.');
    const ev = resolveEvent(g);
    if (!ev) throw new Error('이벤트를 찾을 수 없습니다.');
    const r = submitDecision(g, choose(ev, g), '자동 시뮬레이션에서 사용하는 토론 근거 문장입니다.', '', g.updatedAt);
    if (!r.ok) throw new Error(r.error);
    g = continueFromOutcome(r.game, g.updatedAt);
  }
  return g;
}

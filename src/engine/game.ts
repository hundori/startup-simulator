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
import { getEvent } from './events';
import { hashString } from './rng';
import {
  advanceMonth,
  applyEffects,
  scaleMoney,
  evaluateOption,
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

function fill(text: string, game: Game): string {
  return text.split('{company}').join(game.setup.companyName);
}

function visibleOptions(game: Game, options: EventOption[]): EventOption[] {
  return options.filter((o) => !o.onlyFor || o.onlyFor.includes(game.sim.businessType));
}

/** 선택 전 UI에 전달할 대안. outcomes·effects는 포함하지 않는다. */
export function toPublicOption(game: Game, option: EventOption): PublicOption {
  const { available, reasons } = evaluateOption(game.sim, option);
  return {
    id: option.id,
    label: option.label,
    description: option.description,
    cost: scaleMoney(game.sim, option.cost ?? 0),
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
  return {
    id: ev.id,
    stage: ev.stage,
    title: ev.title,
    reason: ev.reason,
    situation: fill(ev.situation, game),
    context: ev.contextByType?.[game.sim.businessType] ?? null,
    discussionPrompts: ev.discussionPrompts,
    options: visibleOptions(game, ev.options).map((o) => toPublicOption(game, o)),
    index: game.planIndex,
    total: game.plan.length,
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

  let sim = { ...game.sim, cash: game.sim.cash - cost };
  sim = applyEffects(sim, outcome.effects);
  const afterImmediate = snapshot(sim);

  const months = monthsAllocation(game.plan.length)[game.planIndex] ?? 12;
  const history = [...game.history];
  const notes: string[] = [];
  let bankrupt = false;
  let elapsed = 0;
  for (let i = 0; i < months; i++) {
    const r = advanceMonth(sim);
    sim = r.state;
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
    eventTitle: ev.title,
    optionId: option.id,
    optionLabel: option.label,
    stage: ev.stage,
    month: before.month,
    rationale: reasonText,
    dissent: dissent.trim(),
    before,
    afterImmediate,
    afterPeriod: snapshot(sim),
    monthsElapsed: elapsed,
    outcomeText: outcome.text,
    verdict: outcome.verdict,
    reason: ev.reason,
    cost,
    notes,
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

/** 결과 화면에서 "계속"을 눌렀을 때 */
export function continueFromOutcome(game: Game, now = new Date().toISOString()): Game {
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

/** 테스트·밸런스 점검용 자동 진행 */
export type Chooser = (event: ResolvedEvent, game: Game) => string;

export function autoPlay(setup: SetupInput, choose: Chooser, opts: CreateOptions = {}): Game {
  let g = beginSimulation(createGame(setup, opts));
  let guard = 0;
  while (g.phase === 'event') {
    if (guard++ > 40) throw new Error('자동 진행이 끝나지 않습니다.');
    const ev = resolveEvent(g);
    if (!ev) throw new Error('이벤트를 찾을 수 없습니다.');
    const r = submitDecision(g, choose(ev, g), '자동 시뮬레이션에서 사용하는 토론 근거 문장입니다.', '', g.updatedAt);
    if (!r.ok) throw new Error(r.error);
    g = continueFromOutcome(r.game, g.updatedAt);
  }
  return g;
}

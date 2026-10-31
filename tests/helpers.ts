import {
  autoPlay,
  createGame,
  createInitialState,
  type BusinessType,
  type Chooser,
  type Game,
  type SetupInput,
  type SimState,
} from '../src/engine';

export const BUSINESS: BusinessType[] = ['saas', 'commerce', 'offline', 'content', 'platform'];

export function baseSetup(over: Partial<SetupInput> = {}): SetupInput {
  return {
    companyName: '테스트컴퍼니',
    idea: '대학생을 위한 가상의 사업 아이디어입니다.',
    businessType: 'saas',
    customerType: 'b2c',
    targetCustomer: '대학생',
    revenueModel: 'subscription',
    capital: 10000,
    members: 3,
    mode: 'class',
    ...over,
  };
}

export function baseSim(over: Partial<SimState> = {}): SimState {
  return { ...createInitialState(baseSetup()), ...over };
}

export const NOW = '2026-01-01T00:00:00.000Z';

export function newGame(over: Partial<SetupInput> = {}, seed = 7): Game {
  return createGame(baseSetup(over), { now: NOW, seed, id: 'test' });
}

export const firstAvailable: Chooser = (ev) => (ev.options.find((o) => o.available) ?? ev.options[0]).id;
export const cheapest: Chooser = (ev) =>
  [...ev.options].filter((o) => o.available).sort((a, b) => a.cost - b.cost)[0].id;
export const mostExpensive: Chooser = (ev) =>
  [...ev.options].filter((o) => o.available).sort((a, b) => b.cost - a.cost)[0].id;

export function play(over: Partial<SetupInput>, choose: Chooser, seed = 7): Game {
  return autoPlay(baseSetup(over), choose, { now: NOW, seed, id: 'test' });
}

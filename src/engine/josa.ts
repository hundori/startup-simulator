// 한국어 조사 자동 선택. 받침 유무(숫자·영문 포함)로 은/는, 이/가, 을/를, 과/와, (으)로 등을 고른다.

// 종성 인덱스: 0=받침 없음, 8=ㄹ
const DIGIT_JONG: Record<string, number> = { '0': 21, '1': 8, '2': 0, '3': 16, '4': 0, '5': 0, '6': 1, '7': 8, '8': 8, '9': 0 };
const LATIN_JONG: Record<string, number> = { l: 8, m: 16, n: 4, r: 8 };

function lastJong(word: string): number {
  const trimmed = word.replace(/[\s)\]}>"'”’」』.,!?…·\-~]+$/u, '');
  const ch = trimmed.slice(-1);
  if (!ch) return 0;
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28;
  if (ch in DIGIT_JONG) return DIGIT_JONG[ch];
  const lower = ch.toLowerCase();
  if (lower in LATIN_JONG) return LATIN_JONG[lower];
  return 0;
}

export type JosaPair = '은/는' | '이/가' | '을/를' | '과/와' | '으로/로' | '이라/라' | '이에요/예요' | '이야/야' | '이란/란';

/** 조사만 돌려준다. 예: josa('모아케어', '이/가') → '가' */
export function josa(word: string, pair: JosaPair): string {
  const [withJong, noJong] = pair.split('/');
  const jong = lastJong(word);
  if (pair === '으로/로') return jong === 0 || jong === 8 ? noJong : withJong;
  return jong === 0 ? noJong : withJong;
}

/** 단어 뒤에 조사를 붙여 돌려준다. 예: withJosa('1,278만원', '으로/로') → '1,278만원으로' */
export function withJosa(word: string, pair: JosaPair): string {
  return `${word}${josa(word, pair)}`;
}

export interface TextVars {
  company: string;
  target: string;
  idea: string;
}

const VALID_PAIRS = new Set(['은/는', '이/가', '을/를', '과/와', '으로/로', '이라/라', '이에요/예요', '이야/야', '이란/란']);

/** "{company}", "{target:이/가}" 같은 자리표시자를 채운다. 조사를 지정하면 받침에 맞춰 붙인다. */
export function fillText(text: string, vars: TextVars): string {
  return text.replace(/\{(company|target|idea)(?::([^}]+))?\}/g, (_m, key: keyof TextVars, pair?: string) => {
    const value = vars[key];
    if (pair && VALID_PAIRS.has(pair)) return withJosa(value, pair as JosaPair);
    return value;
  });
}

/** 아이디어는 길 수 있으므로 지문에는 첫 문장만 짧게 쓴다. */
export function shortIdea(idea: string, max = 36): string {
  const first = idea.trim().split(/[.\n!?]/)[0].trim() || idea.trim();
  return first.length > max ? `${first.slice(0, max - 1).trim()}…` : first;
}

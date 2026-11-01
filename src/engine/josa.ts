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
  [extra: string]: string;
}

const VALID_PAIRS = new Set(['은/는', '이/가', '을/를', '과/와', '으로/로', '이라/라', '이에요/예요', '이야/야', '이란/란']);
const PARTICLE_PAIR: Record<string, JosaPair> = {
  이: '이/가', 가: '이/가', 은: '은/는', 는: '은/는', 을: '을/를', 를: '을/를', 와: '과/와', 과: '과/와', 으로: '으로/로', 로: '으로/로',
};

/**
 * "{company}", "{target:이/가}" 같은 자리표시자를 채운다. 조사를 지정하면 받침에 맞춰 붙인다.
 * 지정하지 않았더라도 자리표시자 바로 뒤에 조사(이·가·은·는·을·를·와·과·로·으로)가 붙어 있으면
 * 값의 받침에 맞게 고쳐 쓴다(예: "{company}이 쓰는" → "네일핏 AI가 쓰는").
 */
export function fillText(text: string, vars: TextVars): string {
  const keys = Object.keys(vars).join('|');
  const fixed = text.replace(new RegExp(`\\{(${keys})\\}(으로|이|가|은|는|을|를|와|과|로)(?=[\\s,.)"'?!]|$)`, 'g'), (_m, key: string, p: string) =>
    withJosa(vars[key], PARTICLE_PAIR[p]),
  );
  return fixed.replace(new RegExp(`\\{(${keys})(?::([^}]+))?\\}`, 'g'), (_m, key: string, pair?: string) => {
    const value = vars[key];
    if (pair && VALID_PAIRS.has(pair)) return withJosa(value, pair as JosaPair);
    return value;
  });
}

/** 긴 대상 고객 문구에서 반복해 쓸 요약 명칭을 만든다(첫 구절만, 16자 이내). */
export function shortTarget(target: string, max = 16): string {
  const t = target.trim().replace(/\s+/g, ' ');
  const first = t.split(/[,，(（·/]| 중 | 및 /)[0].trim() || t;
  return first.length > max ? `${first.slice(0, max - 1).trim()}…` : first;
}

/** 아이디어는 길 수 있으므로 지문에는 첫 문장만 짧게 쓴다. */
export function shortIdea(idea: string, max = 36): string {
  const first = idea.trim().split(/[.\n!?]/)[0].trim() || idea.trim();
  return first.length > max ? `${first.slice(0, max - 1).trim()}…` : first;
}

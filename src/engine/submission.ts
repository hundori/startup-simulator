import type { Game } from './types';
import { scoreGame } from './scoring';

/** 조가 교수자에게 내는 요약. 제출 코드(문자열)로 인코딩된다. */
export interface Submission {
  v: 1;
  team: string;
  idea: string;
  business: string;
  members: number;
  capital: number;
  mode: string;
  status: string;
  done: number;
  total: number;
  score: number;
  grade: string;
  cash: number;
  revenue: number;
  customers: number;
  decisions: { t: string; o: string; r: string; d: string; v: string }[];
  at: string;
}

export function buildSubmission(game: Game): Submission {
  const sc = scoreGame(game);
  const last = game.decisions[game.decisions.length - 1];
  const snap = last?.afterPeriod;
  return {
    v: 1,
    team: game.setup.companyName,
    idea: game.setup.idea.slice(0, 120),
    business: game.setup.businessType,
    members: game.setup.members,
    capital: game.setup.capital,
    mode: game.setup.mode,
    status: game.status,
    done: game.decisions.length,
    total: game.plan.length,
    score: sc.total,
    grade: sc.grade,
    cash: Math.round(game.sim.cash),
    revenue: snap ? Math.round((snap as unknown as Record<string, number>).revenue ?? 0) : 0,
    customers: Math.round(game.sim.customers),
    decisions: game.decisions.map((d) => ({ t: d.eventTitle, o: d.optionLabel, r: d.rationale, d: d.dissent, v: d.verdict })),
    at: new Date().toISOString(),
  };
}

function toB64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}
function fromB64(s: string): string {
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSubmission(sub: Submission): string {
  return 'SS1.' + toB64(JSON.stringify(sub));
}

export function decodeSubmission(code: string): Submission | null {
  try {
    const c = code.trim();
    if (!c.startsWith('SS1.')) return null;
    const o = JSON.parse(fromB64(c.slice(4)));
    if (o?.v !== 1 || typeof o.team !== 'string' || !Array.isArray(o.decisions)) return null;
    return o as Submission;
  } catch {
    return null;
  }
}

export function submissionsToCsv(subs: Submission[]): string {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ['조', '아이디어', '진행', '점수', '등급', '상태', '현금(만원)', '고객', '이벤트', '선택', '토론 근거', '반대 의견'];
  const rows = [head.map(q).join(',')];
  for (const s of subs) {
    if (s.decisions.length === 0) rows.push([s.team, s.idea, `${s.done}/${s.total}`, s.score, s.grade, s.status, s.cash, s.customers, '', '', '', ''].map(q).join(','));
    for (const d of s.decisions)
      rows.push([s.team, s.idea, `${s.done}/${s.total}`, s.score, s.grade, s.status, s.cash, s.customers, d.t, d.o, d.r, d.d].map(q).join(','));
  }
  return '﻿' + rows.join('\n');
}

'use client';

import { useState } from 'react';
import type { Game } from '@/engine';
import { ADVISORS, ADVISOR_DISCLAIMER, adviceFor } from '@/engine';
import type { AdvisorId } from '@/engine';

/** 단순한 캐리커처 스타일 일러스트. 실제 사진이 아니라 특징만 살린 만화 아이콘이다. */
function Avatar({ id }: { id: AdvisorId }) {
  const skin = '#f2c9a5';
  return (
    <svg viewBox="0 0 120 120" className="h-24 w-24" role="img" aria-hidden="true">
      <rect width="120" height="120" rx="20" fill={{ jobs: '#e8edf6', musk: '#e4eef7', zuckerberg: '#e9f0e6', bezos: '#f6ece0' }[id]} />
      {/* 몸통 */}
      {id === 'jobs' && <path d="M18 120c4-24 22-34 42-34s38 10 42 34z" fill="#111" />}
      {id === 'musk' && <path d="M18 120c4-24 22-34 42-34s38 10 42 34z" fill="#2b2f36" />}
      {id === 'zuckerberg' && <path d="M18 120c4-24 22-34 42-34s38 10 42 34z" fill="#9aa1a9" />}
      {id === 'bezos' && <path d="M18 120c4-24 22-34 42-34s38 10 42 34z" fill="#34506e" />}
      <rect x="52" y="76" width="16" height="14" fill={skin} />
      {/* 얼굴 */}
      <ellipse cx="60" cy="54" rx={id === 'zuckerberg' ? 27 : 25} ry={id === 'bezos' ? 29 : 28} fill={skin} />
      {/* 머리카락 */}
      {id === 'jobs' && <path d="M35 46c2-16 14-22 25-22s23 6 25 22c-6-8-14-10-25-10s-19 2-25 10z" fill="#8a8a8a" />}
      {id === 'musk' && <path d="M34 48c0-18 12-26 26-26s26 8 26 26c-4-8-12-12-26-12s-22 4-26 12z" fill="#3a2a22" />}
      {id === 'zuckerberg' && (
        <g fill="#a9743f">
          <circle cx="38" cy="40" r="9" /><circle cx="50" cy="32" r="10" /><circle cx="64" cy="31" r="10" /><circle cx="77" cy="37" r="10" /><circle cx="83" cy="48" r="7" />
        </g>
      )}
      {id === 'bezos' && <path d="M36 44c1-6 5-8 8-8M84 44c-1-6-5-8-8-8" stroke="#b58a62" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {/* 안경 */}
      {id === 'jobs' && (
        <g fill="none" stroke="#222" strokeWidth="2.5">
          <circle cx="49" cy="54" r="8" /><circle cx="71" cy="54" r="8" /><path d="M57 54h6" />
        </g>
      )}
      {/* 눈·입 */}
      {id !== 'jobs' && (
        <g fill="#222">
          <circle cx="50" cy="54" r="2.6" /><circle cx="70" cy="54" r="2.6" />
        </g>
      )}
      {id === 'jobs' && (
        <g fill="#222">
          <circle cx="49" cy="54" r="2" /><circle cx="71" cy="54" r="2" />
        </g>
      )}
      <path d={id === 'bezos' ? 'M46 68q14 14 28 0' : id === 'musk' ? 'M49 69q11 7 22 0' : 'M50 70q10 5 20 0'} stroke="#222" strokeWidth="2.5" fill={id === 'bezos' ? '#fff' : 'none'} strokeLinecap="round" />
      {id === 'jobs' && <path d="M46 72q14 6 28 0" stroke="#7a7a7a" strokeWidth="3" fill="none" opacity=".5" />}
    </svg>
  );
}

export default function AdvisorPicker({ game }: { game: Game }) {
  const [id, setId] = useState<AdvisorId | null>(null);
  const advice = id ? adviceFor(game, id) : null;
  const who = ADVISORS.find((a) => a.id === id);

  return (
    <section aria-labelledby="adv-h" className="border-t-[3px] border-ink bg-surface p-5 print:hidden">
      <h2 id="adv-h" className="text-lg font-semibold">전문가의 관점으로 결과 보기</h2>
      <p className="mt-1 text-sm text-muted">한 명을 고르면 그 경영 스타일의 관점으로 우리 회사의 결과를 해석해 줍니다.</p>
      <div role="radiogroup" aria-label="전문가 선택" className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {ADVISORS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={id === a.id}
            onClick={() => setId(a.id)}
            className={`flex min-h-11 flex-col items-center rounded-md border p-3 text-center transition-colors ${
              id === a.id ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-accent/50'
            }`}
          >
            <Avatar id={a.id} />
            <span className="mt-2 font-semibold">{a.name}</span>
            <span className="mt-1 text-xs text-muted">{a.tagline}</span>
          </button>
        ))}
      </div>

      {advice && who ? (
        <article className="mt-5 border-l-[3px] border-brass pl-4" aria-live="polite">
          <p className="text-xs font-bold text-brass">{who.name} 스타일의 관점</p>
          <h3 className="mt-1 text-xl font-bold">{advice.headline}</h3>
          <div className="mt-3 space-y-3 leading-relaxed">
            {advice.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <h4 className="mt-4 text-sm font-bold">조에서 바로 해볼 일</h4>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
            {advice.actions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted">{ADVISOR_DISCLAIMER}</p>
        </article>
      ) : null}
    </section>
  );
}

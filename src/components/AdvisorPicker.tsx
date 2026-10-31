'use client';

import { useState } from 'react';
import type { Game } from '@/engine';
import { ADVISORS, ADVISOR_DISCLAIMER, adviceFor } from '@/engine';
import type { AdvisorId } from '@/engine';
import { ADVISOR_PHOTOS } from './advisorPhotos';

function Avatar({ id, name }: { id: AdvisorId; name: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={ADVISOR_PHOTOS[id]} alt={`${name} 사진`} className="h-24 w-24 rounded-md object-cover" />;
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
            <Avatar id={a.id} name={a.name} />
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

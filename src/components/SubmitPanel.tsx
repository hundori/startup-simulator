'use client';

import { useState } from 'react';
import type { Game } from '@/engine';
import { buildSubmission, encodeSubmission } from '@/engine';
import { Button, Callout } from './ui';

export default function SubmitPanel({ game }: { game: Game }) {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const make = async () => {
    const c = encodeSubmission(buildSubmission(game));
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section aria-labelledby="sub-h" className="border-t-[3px] border-ink bg-surface p-5 print:hidden">
      <h2 id="sub-h" className="text-lg font-semibold">교수님께 제출하기</h2>
      <p className="mt-1 text-sm text-muted">제출 코드를 만들어 교수님께 보내세요(메신저·과제 게시판). 점수와 모든 토론 근거가 담깁니다.</p>
      <div className="mt-3">
        <Button onClick={make}>제출 코드 만들기</Button>
      </div>
      {code ? (
        <div className="mt-3 space-y-2">
          {copied ? <Callout tone="info">클립보드에 복사했습니다.</Callout> : null}
          <textarea readOnly value={code} onFocus={(e) => e.currentTarget.select()} className="num block min-h-24 w-full rounded-md border border-line p-2 text-xs" aria-label="제출 코드" />
        </div>
      ) : null}
    </section>
  );
}

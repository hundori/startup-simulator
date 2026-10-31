'use client';

import { useEffect, useRef } from 'react';
import type { DecisionRecord } from '@/engine';
import { monthToLabel } from '@/engine';
import { VERDICT_LABEL } from './ui';

export default function HistoryPanel({
  decisions,
  onClose,
}: {
  decisions: DecisionRecord[];
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/40 sm:items-stretch sm:justify-end print:hidden">
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        className="flex max-h-[85dvh] w-full flex-col rounded-t-lg bg-surface shadow-xl sm:max-h-none sm:max-w-md sm:rounded-none"
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id="history-title" className="font-semibold">
            결정 기록 <span className="num text-muted">({decisions.length})</span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md px-3 text-sm font-semibold text-muted hover:bg-paper hover:text-ink"
          >
            닫기
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {decisions.length === 0 ? (
            <p className="text-sm text-muted">아직 내린 결정이 없습니다. 첫 이벤트에서 결정을 내리면 여기에 쌓입니다.</p>
          ) : (
            <ol className="space-y-5">
              {decisions.map((d, i) => (
                <li key={`${d.eventId}-${i}`} className="border-l-2 border-line pl-3">
                  <p className="text-xs text-muted">
                    {i + 1}번째 · {monthToLabel(d.month).replace(/ 시점$/, '')} 시점 · {VERDICT_LABEL[d.verdict]}
                  </p>
                  <p className="font-semibold">{d.eventTitle}</p>
                  <p className="text-sm">선택: {d.optionLabel}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted">근거: {d.rationale}</p>
                  {d.dissent ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted">반대 의견: {d.dissent}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}

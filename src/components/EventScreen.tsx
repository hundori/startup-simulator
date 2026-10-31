'use client';

import { useState } from 'react';
import type { Game, ResolvedEvent } from '@/engine';
import { MIN_RATIONALE_LENGTH, formatMoney, reasonLabel, shortIdea } from '@/engine';
import Choice from './Choice';
import { Badge, Button, Callout, STAGE_LABEL } from './ui';

interface Draft {
  optionId: string | null;
  rationale: string;
  dissent: string;
}

const EMPTY: Draft = { optionId: null, rationale: '', dissent: '' };

function draftKey(gameId: string, eventId: string) {
  return `startup-simulator:draft:${gameId}:${eventId}`;
}

function loadDraft(key: string): Draft {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<Draft>;
    return {
      optionId: typeof p.optionId === 'string' ? p.optionId : null,
      rationale: typeof p.rationale === 'string' ? p.rationale : '',
      dissent: typeof p.dissent === 'string' ? p.dissent : '',
    };
  } catch {
    return EMPTY;
  }
}

export function clearDraft(gameId: string, eventId: string) {
  try {
    window.localStorage.removeItem(draftKey(gameId, eventId));
  } catch {
    /* 저장소를 쓸 수 없어도 진행에는 문제 없다 */
  }
}

/** 부모에서 key={game.id + event.id}로 마운트해 이벤트마다 새 초안으로 시작한다. */
export default function EventScreen({
  game,
  event,
  onSubmit,
}: {
  game: Game;
  event: ResolvedEvent;
  onSubmit: (optionId: string, rationale: string, dissent: string) => string | null;
}) {
  const key = draftKey(game.id, event.id);
  const [draft, setDraft] = useState<Draft>(() => {
    const d = loadDraft(key);
    // 저장된 선택이 지금은 고를 수 없는 대안이면 버린다.
    const ok = event.options.some((o) => o.id === d.optionId && o.available);
    return ok ? d : { ...d, optionId: null };
  });
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<Draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* 무시 */
      }
      return next;
    });
  };

  const len = draft.rationale.trim().length;
  const enough = len >= MIN_RATIONALE_LENGTH;
  const canSubmit = draft.optionId !== null && enough;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.optionId) return;
    setError(onSubmit(draft.optionId, draft.rationale, draft.dissent));
  };

  const helper = draft.optionId === null ? '대안을 먼저 고르세요.' : !enough ? `근거를 ${MIN_RATIONALE_LENGTH - len}자 더 적어 주세요.` : '결정할 준비가 됐습니다.';

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <header>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{STAGE_LABEL[event.stage]}</span>
          <span className="num">
            · 이벤트 {event.index + 1} / {event.total}
          </span>
          <Badge tone="accent">{reasonLabel(event.reason)}</Badge>
        </p>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{event.title}</h1>
        <div className="mt-4 border-l-[3px] border-brass pl-4">
          <p className="leading-relaxed">{event.situation}</p>
          {event.context ? <p className="mt-2 text-sm text-muted">{event.context}</p> : null}
          <p className="mt-3 text-xs text-muted">우리 아이디어: {shortIdea(game.setup.idea, 60)} · 대상: {game.setup.targetCustomer}</p>
        </div>
      </header>

      <section aria-labelledby="discuss-h">
        <h2 id="discuss-h" className="mb-2 text-sm font-semibold">
          조 토론 질문
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {event.discussionPrompts.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <fieldset>
        <legend className="mb-1 text-lg font-semibold">우리의 결정</legend>
        <p className="mb-3 text-sm text-muted">각 대안의 결과는 결정한 뒤에 공개됩니다. 비용은 즉시 현금에서 빠집니다.</p>
        <div className="space-y-2">
          {event.options.map((o, idx) => (
            <Choice
              key={o.id}
              name="option"
              checked={draft.optionId === o.id}
              disabled={!o.available}
              onChange={() => update({ optionId: o.id })}
              title={`${String.fromCharCode(65 + idx)}. ${o.label}`}
            >
              <span className="block text-sm text-muted">{o.description}</span>
              <span className="num mt-1 block text-sm">
                {o.cost > 0 ? `비용 ${formatMoney(o.cost)}` : '추가 비용 없음'}
                {o.minHeadcount ? ` · 최소 ${o.minHeadcount}명 필요` : ''}
              </span>
              {!o.available && o.reasons.length > 0 ? (
                <span className="mt-1 block text-sm font-semibold text-loss">선택 불가: {o.reasons.join(' / ')}</span>
              ) : null}
            </Choice>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="rationale" className="text-sm font-semibold">
          토론 근거 <span className="font-normal text-muted">(필수, {MIN_RATIONALE_LENGTH}자 이상)</span>
        </label>
        <textarea
          id="rationale"
          value={draft.rationale}
          onChange={(e) => update({ rationale: e.target.value })}
          aria-describedby="rationale-help"
          className="mt-1 block min-h-28 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base focus-visible:border-accent"
          placeholder="왜 이 대안을 골랐는지, 어떤 수치와 가정을 근거로 삼았는지 적어 주세요."
        />
        <p id="rationale-help" className="num mt-1 text-xs text-muted">
          {len}자 · {helper}
        </p>
      </div>

      <div>
        <label htmlFor="dissent" className="text-sm font-semibold">
          반대 의견 <span className="font-normal text-muted">(선택)</span>
        </label>
        <textarea
          id="dissent"
          value={draft.dissent}
          onChange={(e) => update({ dissent: e.target.value })}
          className="mt-1 block min-h-20 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base focus-visible:border-accent"
          placeholder="조원 중 다른 의견이 있었다면 남겨 두세요."
        />
      </div>

      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}

      <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
        이 결정으로 확정
      </Button>
    </form>
  );
}

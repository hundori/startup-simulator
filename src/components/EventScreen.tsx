'use client';

import { useEffect, useState } from 'react';
import type { Game, ResolvedEvent } from '@/engine';
import { MIN_RATIONALE_LENGTH, computeRunway, explainEvent, formatFixedDelta, formatMoney, monthToLabel, reasonLabel, shortIdea, shortTarget } from '@/engine';
import Assumptions from './Assumptions';
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

function EmergencyPopup({ runway, cash, onClose }: { runway: number | null; cash: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4 print:hidden">
      <div role="alertdialog" aria-modal="true" aria-labelledby="emg-title" className="w-full max-w-md rounded-lg border-2 border-loss bg-surface p-6 shadow-2xl">
        <p className="text-xs font-bold tracking-wide text-loss">긴급 생존 카드</p>
        <h2 id="emg-title" className="mt-1 text-xl font-bold leading-snug">런웨이가 1개월도 남지 않았습니다</h2>
        <p className="num mt-3 text-sm">
          현금 {formatMoney(cash)} · 지금 속도로는 <strong className="text-loss">{runway === null ? '—' : runway.toFixed(1)}개월</strong> 뒤 바닥납니다.
        </p>
        <p className="mt-2 text-sm text-muted">
          정상적인 성장 전략을 논의할 시간이 아닙니다. 다음 화면에서 무급여 전환, 지분 헐값 매각 같은 긴급 생존 선택지를 두고 팀이 결정하세요. 이 카드는 한 번만 열리고, 결정해도 시간은 흐르지 않습니다.
        </p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-loss px-4 text-sm font-semibold text-white"
        >
          긴급 선택지 보기
        </button>
      </div>
    </div>
  );
}

/** 부모에서 key={game.id + event.id}로 마운트해 이벤트마다 새 초안으로 시작한다. */
export default function EventScreen({
  game,
  event,
  onSubmit,
  onPreview,
}: {
  game: Game;
  event: ResolvedEvent;
  onSubmit: (optionId: string, rationale: string, dissent: string) => string | null;
  onPreview?: (p: { cost: number; fixedDelta: number } | null) => void;
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

  const selected = event.options.find((o) => o.id === draft.optionId);
  const selectedCost = selected ? selected.cost : null;
  // 결과가 갈릴 때는 월 고정비가 가장 크게 늘어나는 쪽(가장 불리한 쪽)으로 미리 보여 준다.
  const selectedFixed = selected ? selected.fixedDelta.max : 0;
  useEffect(() => {
    onPreview?.(selectedCost === null ? null : { cost: selectedCost, fixedDelta: selectedFixed });
    return () => onPreview?.(null);
  }, [selectedCost, selectedFixed, onPreview]);
  const [ack, setAck] = useState(!event.emergency);

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
      {!ack ? <EmergencyPopup runway={computeRunway(game.sim)} cash={game.sim.cash} onClose={() => setAck(true)} /> : null}
      <header>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{STAGE_LABEL[event.stage]}</span>
          {event.followup ? (
            <Badge tone={event.emergency ? 'danger' : 'warn'}>
              {event.emergency ? '긴급 카드' : '급여 복원 결정'} · 연차 이벤트 수에 포함되지 않음
            </Badge>
          ) : (
            <span className="num">
              · 이벤트 {event.index + 1} / {event.total}
            </span>
          )}
          <span className="num">· {monthToLabel(game.sim.month).replace(/ 시점$/, '')} 시점</span>
          <Badge tone="accent">{reasonLabel(event.reason)}</Badge>
        </p>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{event.title}</h1>
        <div className="mt-4 border-l-[3px] border-brass pl-4">
          <p className="leading-relaxed">{event.situation}</p>
          {event.context ? <p className="mt-2 text-sm text-muted">{event.context}</p> : null}
          <ul className="num mt-3 space-y-0.5 rounded-sm bg-paper px-3 py-2 text-xs text-muted" aria-label="이 서술의 근거 지표">
            {event.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted" title={game.setup.targetCustomer}>우리 아이디어: {shortIdea(game.setup.idea, 60)} · 대상: {shortTarget(game.setup.targetCustomer)}</p>
        </div>
      </header>

      <Assumptions basis={explainEvent(game, event)} />

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
        <p className="mb-3 text-sm text-muted">
          각 대안의 결과는 결정한 뒤에 공개됩니다. <strong>일회성 비용</strong>은 지금 한 번 현금에서 빠지고, <strong>월 고정비 변동</strong>은 앞으로 매달 반복됩니다.
        </p>
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
              <span className="num mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>일회성 비용 {o.cost > 0 ? formatMoney(o.cost) : '없음'}</span>
                <span className={o.fixedDelta.max > 0 ? 'font-semibold text-loss' : o.fixedDelta.min < 0 ? 'font-semibold text-gain' : ''}>
                  월 고정비 {formatFixedDelta(o.fixedDelta)}
                  {o.fixedDelta.max !== 0 || o.fixedDelta.min !== 0 ? ' /월' : ''}
                </span>
                {o.minHeadcount ? <span>최소 {o.minHeadcount}명 필요</span> : null}
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
          토론 근거 <span className="font-normal text-muted">(필수, {MIN_RATIONALE_LENGTH}자 이상 · 글자 수만 확인하며 내용의 타당성은 평가하지 않습니다)</span>
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

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!canSubmit} aria-describedby="submit-why" className="w-full sm:w-auto">
          이 결정으로 확정
        </Button>
        <p id="submit-why" className={`text-sm ${canSubmit ? 'text-muted' : 'font-semibold text-loss'}`}>
          {canSubmit ? helper : `확정할 수 없는 이유: ${helper}`}
        </p>
      </div>
    </form>
  );
}

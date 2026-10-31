'use client';

import { useCallback, useState } from 'react';
import type { Game, SetupInput } from '@/engine';
import {
  DISCLAIMER_SHORT,
  beginSimulation,
  continueFromOutcome,
  createGame,
  resolveEvent,
  submitDecision,
} from '@/engine';
import { LocalStorageAdapter } from '@/storage/local';
import ConfirmDialog from './ConfirmDialog';
import EventScreen, { clearDraft } from './EventScreen';
import FinalReport from './FinalReport';
import HistoryPanel from './HistoryPanel';
import IntroScreen from './IntroScreen';
import PhaseBar from './PhaseBar';
import OutcomeScreen from './OutcomeScreen';
import SetupScreen from './SetupScreen';
import StatusPanel from './StatusPanel';
import { Callout } from './ui';

const storage = new LocalStorageAdapter();

interface Init {
  game: Game | null;
  notice: string | null;
}

function init(): Init {
  const game = storage.loadSync();
  if (game) return { game, notice: null };
  if (storage.lastProblem === 'incompatible') {
    return { game: null, notice: '이전 버전에서 저장된 게임은 불러올 수 없어 새로 시작합니다.' };
  }
  if (storage.lastProblem === 'corrupt') {
    return { game: null, notice: '저장된 데이터가 손상되어 불러오지 못했습니다. 새 게임을 시작해 주세요.' };
  }
  return { game: null, notice: null };
}

export default function GameApp() {
  const [boot] = useState<Init>(init);
  const [game, setGame] = useState<Game | null>(boot.game);
  const [notice, setNotice] = useState<string | null>(boot.notice);
  const [saveError, setSaveError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const commit = useCallback((next: Game) => {
    setGame(next);
    try {
      storage.saveSync(next);
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, []);

  const reset = () => {
    if (game) {
      const ev = game.phase === 'event' ? game.plan[game.planIndex] : null;
      if (ev) clearDraft(game.id, ev);
    }
    try {
      storage.clearSync();
    } catch {
      /* 무시 */
    }
    setGame(null);
    setNotice(null);
    setShowHistory(false);
    setConfirmReset(false);
    window.scrollTo({ top: 0 });
  };

  const start = (setup: SetupInput) => commit(createGame(setup));

  const event = game && game.phase === 'event' ? resolveEvent(game) : null;

  const onSubmit = (optionId: string, rationale: string, dissent: string): string | null => {
    if (!game) return '게임 상태를 찾을 수 없습니다.';
    const res = submitDecision(game, optionId, rationale, dissent);
    if (!res.ok) return res.error;
    clearDraft(game.id, game.plan[game.planIndex]);
    commit(res.game);
    window.scrollTo({ top: 0 });
    return null;
  };

  let body: React.ReactNode;
  if (!game) {
    body = <SetupScreen onStart={start} notice={notice} />;
  } else if (game.phase === 'intro') {
    body = <IntroScreen game={game} onBegin={() => commit(beginSimulation(game))} />;
  } else if (game.phase === 'event' && event) {
    body = <EventScreen key={`${game.id}:${event.id}`} game={game} event={event} onSubmit={onSubmit} />;
  } else if (game.phase === 'outcome') {
    body = (
      <OutcomeScreen
        game={game}
        onContinue={() => {
          commit(continueFromOutcome(game));
          window.scrollTo({ top: 0 });
        }}
      />
    );
  } else if (game.phase === 'finished') {
    body = <FinalReport game={game} onRestart={() => setConfirmReset(true)} />;
  } else {
    body = (
      <Callout tone="danger" role="alert" title="진행 상태를 복원하지 못했습니다">
        저장된 게임이 현재 이벤트와 맞지 않습니다. 새 게임을 시작해 주세요.
      </Callout>
    );
  }

  const inGame = game !== null && game.phase !== 'finished';

  return (
    <div className="min-h-dvh">
      <header className="bg-ink text-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="whitespace-nowrap font-serif text-lg font-bold tracking-tight">
            Startup Simulator
            <span className="ml-3 hidden font-sans text-xs font-normal text-white/60 sm:inline">창업 경영 시뮬레이션</span>
          </p>
          <div className="flex items-center">
            {game ? (
              <>
                <span className="mr-3 hidden text-xs text-white/60 sm:inline" role="status">
                  {saveError ? '저장 실패 (브라우저 저장소 확인)' : '자동 저장됨'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowHistory(true)}
                  className="min-h-11 whitespace-nowrap px-3 text-sm font-semibold text-white/85 hover:text-white"
                >
                  결정 기록
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="min-h-11 whitespace-nowrap px-3 text-sm font-semibold text-white/85 hover:text-white"
                >
                  처음부터
                </button>
              </>
            ) : null}
          </div>
        </div>
        {game ? (
          <div className="mx-auto max-w-6xl px-4 pb-0 sm:px-6">
            <PhaseBar game={game} />
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {saveError ? (
          <div className="mb-6">
            <Callout tone="warn" role="alert">
              브라우저에 저장하지 못했습니다. 시크릿 모드이거나 저장 공간이 가득 찼을 수 있습니다. 새로고침하면 진행 상황이 사라질 수 있습니다.
            </Callout>
          </div>
        ) : null}
        {inGame && game ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
            <div className="order-2 min-w-0 lg:order-1">{body}</div>
            <div className="order-1 lg:order-2">
              <div className="lg:sticky lg:top-6">
                <StatusPanel game={game} />
              </div>
            </div>
          </div>
        ) : (
          body
        )}
      </main>

      <footer className="mx-auto max-w-6xl border-t border-line px-4 py-6 text-xs text-muted sm:px-6">{DISCLAIMER_SHORT}</footer>

      {showHistory && game ? <HistoryPanel decisions={game.decisions} onClose={() => setShowHistory(false)} /> : null}
      {confirmReset ? (
        <ConfirmDialog
          title="처음부터 다시 시작할까요?"
          message="저장된 진행 상황과 결정 기록이 모두 지워지고 되돌릴 수 없습니다."
          confirmLabel="모두 지우고 다시 시작"
          onConfirm={reset}
          onCancel={() => setConfirmReset(false)}
        />
      ) : null}
    </div>
  );
}

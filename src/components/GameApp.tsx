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
import OutcomeScreen from './OutcomeScreen';
import SetupScreen from './SetupScreen';
import StatusPanel from './StatusPanel';
import { Button, Callout } from './ui';

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

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
          <p className="whitespace-nowrap font-bold">Startup Simulator</p>
          <div className="flex items-center">
            {game ? (
              <>
                <span className="mr-2 hidden text-xs text-muted sm:inline" role="status">
                  {saveError ? '저장 실패 (브라우저 저장소 확인)' : '자동 저장됨'}
                </span>
                <Button variant="ghost" onClick={() => setShowHistory(true)}>
                  결정 기록
                </Button>
                <Button variant="ghost" onClick={() => setConfirmReset(true)}>
                  처음부터
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {saveError ? (
          <Callout tone="warn" role="alert">
            브라우저에 저장하지 못했습니다. 시크릿 모드이거나 저장 공간이 가득 찼을 수 있습니다. 새로고침하면 진행 상황이 사라질 수 있습니다.
          </Callout>
        ) : null}
        {game && game.phase !== 'finished' ? <StatusPanel game={game} /> : null}
        {body}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted">{DISCLAIMER_SHORT}</footer>

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

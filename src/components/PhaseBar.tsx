import type { Game, Stage } from '@/engine';

const PHASES: { stage: Stage; name: string; goal: string }[] = [
  { stage: 1, name: '1년 차 생존', goal: '현금이 바닥나기 전에 시장이 돈을 내는지 확인' },
  { stage: 2, name: '2년 차 성장', goal: '고객과 조직을 함께 키우기' },
  { stage: 3, name: '3년 차 확장', goal: '성장과 수익성의 균형 찾기' },
];

/** 프로젝트 로드맵처럼 3개 연차를 화살표 단계로 보여 준다. */
export default function PhaseBar({ game }: { game: Game }) {
  const done = game.phase === 'finished';
  return (
    <nav aria-label="진행 단계" className="print:hidden">
      <ol className="flex">
        {PHASES.map((p, i) => {
          const state = done || p.stage < game.stage ? 'done' : p.stage === game.stage ? 'current' : 'todo';
          const base =
            state === 'done'
              ? 'bg-white/15 text-white'
              : state === 'current'
                ? 'bg-white text-ink'
                : 'bg-white/5 text-white/50';
          return (
            <li
              key={p.stage}
              aria-current={state === 'current' ? 'step' : undefined}
              className={`relative min-w-0 flex-1 ${i > 0 ? '-ml-2 sm:-ml-3' : ''}`}
              style={{ zIndex: PHASES.length - i }}
            >
              <div
                className={`flex h-12 items-center ${i === 0 ? 'pl-4' : 'pl-7 sm:pl-9'} pr-4 ${base}`}
                style={{
                  clipPath:
                    i === PHASES.length - 1
                      ? i === 0
                        ? undefined
                        : 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)'
                      : i === 0
                        ? 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)'
                        : 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)',
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold leading-tight">{p.name}</span>
                  <span className="hidden truncate text-xs leading-tight opacity-75 md:block">{p.goal}</span>
                </span>
              </div>
              {state === 'current' ? <span className="absolute inset-x-0 bottom-0 h-[3px] bg-brass" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

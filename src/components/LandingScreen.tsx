const FEATURES: [string, string, string][] = [
  ['CORE', '시나리오 엔진', '업종·고객·자본에 맞는 이벤트만 등장합니다. 같은 선택은 언제나 같은 결과를 냅니다.'],
  ['CORE', '6개 실시간 지표', '현금·고객·매출·평판·월 소진액·팀이 결정마다 바뀝니다.'],
  ['NEW', '숨겨진 결과', '선택 전에는 결과가 보이지 않습니다. 토론이 먼저입니다.'],
  ['EDU', '토론 근거 기록', '모든 결정에 조 토론 근거를 남기고 학습 리포트로 복기합니다.'],
  ['EDU', '교수자 취합', '조별 제출 코드를 모아 점수·진행·근거를 한 화면에서 봅니다.'],
  ['DATA', 'CB Insights 실패 원인', '스타트업이 실패한 이유를 이벤트마다 연결했습니다.'],
];
const STEPS: [string, string, string][] = [
  ['01', '회사를 설명하세요', '아이디어·업종·고객·자본을 입력하면 우리 조의 가상 회사가 만들어집니다.'],
  ['02', '진짜처럼 결정하세요', '생존·성장·확장 3년, 이벤트마다 대안을 고르고 근거를 남깁니다.'],
  ['03', '리포트를 받으세요', '3년 추이와 의사결정 복기, 실패 원인별 학습 포인트를 확인합니다.'],
];
const CHIPS = ['SaaS·앱', '커머스', '오프라인 매장', '콘텐츠', '플랫폼', 'B2C', 'B2B', '구독', '광고', '수수료', '파산 체험', '인력 부족'];

type Kpi = { k: string; v: string; color: string; icon: string; pos: string; rot: number; delay: number };
const KPIS: Kpi[] = [
  { k: '현금', v: '1억원', color: '#34b765', icon: '$', pos: 'left-[6%] top-[22%]', rot: -2, delay: 0 },
  { k: '월 소진액', v: '1,200만/월', color: '#e5484d', icon: '▲', pos: 'left-[41%] top-[0%]', rot: 1.5, delay: 0.8 },
  { k: '고객', v: '0', color: '#4f7cf0', icon: '◎', pos: 'right-[4%] top-[18%]', rot: 2, delay: 1.4 },
  { k: '매출', v: '0원', color: '#a15cf0', icon: '↗', pos: 'left-[1%] bottom-[4%]', rot: -1.5, delay: 0.4 },
  { k: '팀', v: '3명', color: '#2bb3d6', icon: '‹›', pos: 'left-[36%] bottom-[-4%]', rot: 1, delay: 1.1 },
  { k: '평판', v: '50', color: '#e8a33d', icon: '★', pos: 'right-[8%] bottom-[2%]', rot: -2, delay: 1.8 },
];

function Card({ c }: { c: Kpi }) {
  return (
    <div
      className="lp-float w-40 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
      style={{ transform: `rotate(${c.rot}deg)`, animationDelay: `${c.delay}s` }}
    >
      <p className="flex items-center gap-2 text-sm text-neutral-500">
        <span className="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold" style={{ background: c.color + '1f', color: c.color }}>{c.icon}</span>
        {c.k}
      </p>
      <p className="num mt-1 text-center text-xl font-extrabold" style={{ color: c.color }}>{c.v}</p>
    </div>
  );
}

export default function LandingScreen({ onStart, onTeacher, hasSaved }: { onStart: () => void; onTeacher?: () => void; hasSaved?: boolean }) {
  const cta = hasSaved ? '새 회사 만들기' : '무료로 시작하기';
  return (
    <div className="bg-white text-neutral-950">
      <style>{`
        @keyframes lp-float{0%,100%{translate:0 0}50%{translate:0 -10px}}
        .lp-float{animation:lp-float 5s ease-in-out infinite}
        @keyframes lp-dash{to{stroke-dashoffset:-24}}
        .lp-line{stroke-dasharray:4 8;animation:lp-dash 2.5s linear infinite}
        @keyframes lp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        .lp-core{animation:lp-pulse 4s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.lp-float,.lp-line,.lp-core{animation:none}}
      `}</style>

      <nav className="sticky top-0 z-10 border-b border-black/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="flex items-center gap-2 font-bold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-neutral-950 text-sm font-black text-white">S</span>
            Startup Simulator
          </p>
          <div className="flex items-center gap-1 text-sm">
            <a href="#how" className="hidden px-3 py-2 text-neutral-600 hover:text-black sm:inline">진행 방식</a>
            <a href="#edu" className="hidden px-3 py-2 text-neutral-600 hover:text-black sm:inline">교수자·학생</a>
            {onTeacher ? <button type="button" onClick={onTeacher} className="min-h-11 px-3 text-neutral-600 hover:text-black">교수자 취합</button> : null}
            <button type="button" onClick={onStart} className="ml-1 min-h-10 rounded-full bg-neutral-950 px-5 font-semibold text-white hover:bg-neutral-800">시작하기</button>
          </div>
        </div>
      </nav>

      <section className="overflow-hidden px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="mx-auto inline-block rounded-full border border-black/10 px-3 py-1 text-xs font-semibold tracking-widest text-neutral-500">창업 수업용 경영 샌드박스</p>
        <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-black leading-[1.1] tracking-[-0.04em] sm:text-7xl">
          우리 조의 아이디어,
          <br />
          <span className="text-neutral-400">여기서 먼저 만들어 보세요.</span>
        </h1>
        <p className="mt-8 text-xl font-medium text-neutral-600">망해도 공짜. 그리고 진짜 사업은 그다음에.</p>
        <p className="mx-auto mt-3 max-w-xl text-neutral-400">사업을 설명하면 시나리오가 만들어지고, 3년 동안 결정의 결과를 직접 겪습니다. 같은 선택을 한 수많은 창업가의 실패 원인에서 배웁니다.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onStart} className="min-h-14 rounded-2xl bg-neutral-950 px-9 text-lg font-semibold text-white hover:bg-neutral-800">{cta} →</button>
          <a href="#how" className="inline-flex min-h-14 items-center gap-2 rounded-2xl border border-black/10 bg-white px-8 text-lg font-semibold hover:bg-neutral-50">▷ 진행 방식</a>
        </div>

        {/* 떠다니는 KPI 카드 (넓은 화면) */}
        <div className="relative mx-auto mt-16 hidden h-[34rem] max-w-5xl lg:block" aria-hidden>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[[18, 38], [50, 14], [88, 34], [14, 90], [47, 96], [90, 88]].map(([x, y], i) => (
              <line key={i} className="lp-line" x1="50" y1="52" x2={x} y2={y} stroke="#00000030" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <div className="lp-core absolute left-1/2 top-[52%] grid h-36 w-36 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[2rem] bg-gradient-to-br from-neutral-700 to-neutral-400 shadow-[0_30px_60px_rgba(0,0,0,0.18)]">
            <span className="grid h-20 w-20 place-items-center rounded-2xl bg-white text-3xl font-black">S</span>
          </div>
          {KPIS.map((c) => (
            <div key={c.k} className={`absolute ${c.pos}`}><Card c={c} /></div>
          ))}
        </div>
        {/* 작은 화면 */}
        <div className="mx-auto mt-12 grid max-w-md grid-cols-2 gap-3 lg:hidden" aria-hidden>
          {KPIS.map((c) => (
            <div key={c.k} className="flex justify-center"><Card c={c} /></div>
          ))}
        </div>
        <p className="mt-6 text-xs text-neutral-400">예시 지표 · 교육용 가정값</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-black tracking-[-0.03em] sm:text-5xl">조언이 아닙니다.<br /><span className="text-neutral-400">직접 겪는 경영.</span></h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([tag, t, d]) => (
            <article key={t} className="rounded-3xl border border-black/10 bg-white p-7 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold tracking-widest text-neutral-500">{tag}</span>
              <h3 className="mt-4 text-xl font-bold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="bg-neutral-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black tracking-[-0.03em] sm:text-5xl">세 단계.<br /><span className="text-neutral-400">내 아이디어, 진짜 답.</span></h2>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map(([n, t, d]) => (
              <li key={n} className="rounded-3xl bg-white p-7 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
                <p className="num text-5xl font-black text-neutral-200">{n}</p>
                <h3 className="mt-3 text-xl font-bold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-black tracking-[-0.03em] sm:text-5xl">5개 업종.<br /><span className="text-neutral-400">내 시나리오.</span></h2>
        <ul className="mt-10 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <li key={c} className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-neutral-700">{c}</li>
          ))}
        </ul>
      </section>

      <section id="edu" className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-2">
        {[
          ['FOR EDUCATORS', '수업 운영', ['조별 진행 현황 한눈에', '결정마다 토론 근거 확인', '수업용 6개 / 전체 15개 이벤트', '제출 코드 취합 · CSV'], '교수자 취합 열기'],
          ['FOR FOUNDERS', '실전 연습', ['내 아이디어로 시나리오 생성', '선택 전 결과 비공개', '파산·인력 부족까지 체험', '3년 학습 리포트'], '샌드박스 시작'],
        ].map(([tag, t, items, link]) => (
          <article key={t as string} className="rounded-3xl border border-black/10 p-8">
            <p className="text-xs font-bold tracking-widest text-neutral-400">{tag as string}</p>
            <h3 className="mt-2 text-3xl font-black tracking-tight">{t as string}</h3>
            <ul className="mt-6 space-y-2 text-neutral-600">
              {(items as string[]).map((i) => (<li key={i} className="flex gap-2"><span className="text-neutral-950">✓</span>{i}</li>))}
            </ul>
            <button type="button" onClick={t === '수업 운영' && onTeacher ? onTeacher : onStart} className="mt-8 min-h-11 font-semibold underline underline-offset-4">{link as string} →</button>
          </article>
        ))}
      </section>

      <section className="bg-neutral-950 px-4 py-24 text-center text-white sm:px-6">
        <h2 className="text-3xl font-black tracking-[-0.03em] sm:text-5xl">아이디어를 시험할 준비 되셨나요?</h2>
        <p className="mt-3 text-white/55">무료 · 설치 없음 · 로그인 없음</p>
        <button type="button" onClick={onStart} className="mt-8 min-h-14 rounded-2xl bg-white px-10 text-lg font-semibold text-black hover:bg-neutral-200">{cta} →</button>
      </section>

      <footer className="border-t border-black/5 px-4 py-8 text-xs text-neutral-400 sm:px-6">
        <div className="mx-auto max-w-6xl">Startup Simulator · 교육용 가정 기반 시뮬레이션이며 실제 사업 성과를 예측하지 않습니다.</div>
      </footer>
    </div>
  );
}

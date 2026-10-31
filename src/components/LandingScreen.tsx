const FEATURES: [string, string, string][] = [
  ['CORE', '시나리오 엔진', '업종·고객·자본에 맞는 이벤트만 등장합니다. 같은 선택은 언제나 같은 결과를 냅니다.'],
  ['CORE', '6개 실시간 지표', '매출·현금·고객·품질·사기·평판이 결정마다 바뀝니다.'],
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
const GOLD = '#e0b84f';

export default function LandingScreen({ onStart, onTeacher, hasSaved }: { onStart: () => void; onTeacher?: () => void; hasSaved?: boolean }) {
  const cta = hasSaved ? '새 회사 만들기' : '무료로 시작하기';
  return (
    <div className="bg-[#050505] text-white">
      <nav className="sticky top-0 z-10 border-b border-white/10 bg-[#050505]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="flex items-center gap-2 font-bold">
            <span className="grid h-7 w-7 place-items-center rounded-md text-sm font-black text-black" style={{ background: GOLD }}>S</span>
            Startup Simulator
          </p>
          <div className="flex items-center gap-1 text-sm">
            <a href="#how" className="hidden px-3 py-2 text-white/70 hover:text-white sm:inline">진행 방식</a>
            <a href="#edu" className="hidden px-3 py-2 text-white/70 hover:text-white sm:inline">교수자·학생</a>
            {onTeacher ? <button type="button" onClick={onTeacher} className="min-h-11 px-3 text-white/70 hover:text-white">교수자 취합</button> : null}
            <button type="button" onClick={onStart} className="ml-1 min-h-10 rounded-md px-4 font-bold text-black" style={{ background: GOLD }}>시작하기</button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[48rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl" style={{ background: GOLD }} />
        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <p className="inline-block rounded-full border border-white/15 px-3 py-1 text-xs font-bold tracking-widest" style={{ color: GOLD }}>창업 수업용 경영 샌드박스</p>
            <h1 className="mt-5 text-4xl font-black leading-[1.15] tracking-tight sm:text-6xl">
              우리 조의 아이디어,
              <br />
              <span style={{ color: GOLD }}>현실에서 하기 전에</span> 여기서.
            </h1>
            <p className="mt-5 text-xl text-white/80">망해도 공짜. 그리고 배운 건 남습니다.</p>
            <p className="mt-3 max-w-lg text-white/55">사업을 설명하면 시나리오가 만들어지고, 3년 동안 결정의 결과를 직접 겪습니다.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={onStart} className="min-h-12 rounded-md px-7 font-bold text-black" style={{ background: GOLD }}>{cta}</button>
              <a href="#how" className="inline-flex min-h-12 items-center rounded-md border border-white/20 px-7 font-semibold hover:bg-white/5">진행 방식</a>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="mb-3 flex items-center gap-2 text-xs text-white/45"><span className="h-2 w-2 rounded-full bg-emerald-400" /> LIVE · 예시 대시보드</p>
            <dl className="grid grid-cols-3 gap-2">
              {[['현금', '1억원'], ['고객', '0명'], ['월 매출', '0원'], ['평판', '50'], ['월 고정비', '1,200만'], ['팀', '3명']].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/10 bg-black/40 p-3">
                  <dt className="text-xs text-white/45">{k}</dt>
                  <dd className="num mt-1 text-lg font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-white/35">교육용 가정값</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">조언이 아닙니다. <span style={{ color: GOLD }}>직접 겪는 경영.</span></h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([tag, t, d]) => (
            <article key={t} className="rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/25">
              <span className="rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-widest" style={{ color: GOLD, borderColor: GOLD + '66' }}>{tag}</span>
              <h3 className="mt-3 text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">세 단계. 내 아이디어. <span style={{ color: GOLD }}>진짜 답.</span></h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map(([n, t, d]) => (
            <li key={n} className="rounded-xl border border-white/10 p-6">
              <p className="num text-4xl font-black" style={{ color: GOLD }}>{n}</p>
              <h3 className="mt-3 text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">5개 업종. <span style={{ color: GOLD }}>내 시나리오.</span></h2>
        <ul className="mt-8 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <li key={c} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80">{c}</li>
          ))}
        </ul>
      </section>

      <section id="edu" className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:px-6 md:grid-cols-2">
        {[
          ['FOR EDUCATORS', '수업 운영', ['조별 진행 현황 한눈에', '결정마다 토론 근거 확인', '수업용 6개 / 전체 15개 이벤트', '제출 코드 취합 · CSV'], '교수자 취합 열기'],
          ['FOR FOUNDERS', '실전 연습', ['내 아이디어로 시나리오 생성', '선택 전 결과 비공개', '파산·인력 부족까지 체험', '3년 학습 리포트'], '샌드박스 시작'],
        ].map(([tag, t, items, link]) => (
          <article key={t as string} className="rounded-xl border border-white/10 bg-white/[0.03] p-7">
            <p className="text-xs font-bold tracking-widest" style={{ color: GOLD }}>{tag as string}</p>
            <h3 className="mt-2 text-2xl font-black">{t as string}</h3>
            <ul className="mt-5 space-y-2 text-sm text-white/65">
              {(items as string[]).map((i) => (<li key={i} className="flex gap-2"><span style={{ color: GOLD }}>✓</span>{i}</li>))}
            </ul>
            <button type="button" onClick={t === '수업 운영' && onTeacher ? onTeacher : onStart} className="mt-6 min-h-11 text-sm font-bold underline underline-offset-4" style={{ color: GOLD }}>{link as string} →</button>
          </article>
        ))}
      </section>

      <section className="px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-black tracking-tight sm:text-5xl">아이디어를 시험할 준비 되셨나요?</h2>
        <p className="mt-3 text-white/55">무료 · 설치 없음 · 로그인 없음</p>
        <button type="button" onClick={onStart} className="mt-8 min-h-12 rounded-md px-9 font-bold text-black" style={{ background: GOLD }}>{cta}</button>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-xs text-white/40 sm:px-6">
        <div className="mx-auto max-w-6xl">Startup Simulator · 교육용 가정 기반 시뮬레이션이며 실제 사업 성과를 예측하지 않습니다.</div>
      </footer>
    </div>
  );
}

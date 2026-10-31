const FEATURES: [string, string, string][] = [
  ['핵심', '규칙 기반 시나리오 엔진', '업종·고객·자본에 맞는 이벤트만 나옵니다. 같은 선택은 항상 같은 결과가 나옵니다.'],
  ['핵심', '6개 핵심 지표', '매출·현금·고객·품질·사기·평판을 매 결정 뒤에 확인합니다.'],
  ['신규', '숨겨진 결과', '선택하기 전에는 결과가 보이지 않습니다. 근거를 먼저 토론합니다.'],
  ['수업', '토론 근거 기록', '모든 결정에 조 토론 근거를 남기고, 마지막에 학습 리포트로 돌아봅니다.'],
  ['수업', '교수자 취합', '조별 제출 코드를 모아 진행 현황과 토론 근거를 한 화면에서 봅니다.'],
  ['근거', 'CB Insights 실패 원인', '시장 수요 부재·자금 고갈 등 스타트업 실패 원인을 이벤트에 연결했습니다.'],
];
const STEPS: [string, string, string][] = [
  ['01', '회사를 세웁니다', '아이디어·업종·고객·자본을 입력하면 우리 조의 가상 회사가 만들어집니다.'],
  ['02', '3년간 결정합니다', '생존·성장·확장 단계의 이벤트마다 대안을 고르고 토론 근거를 남깁니다.'],
  ['03', '리포트를 받습니다', '3년 추이와 의사결정 복기, 실패 원인별 학습 포인트를 확인합니다.'],
];
const CHIPS = ['SaaS·앱', '커머스', '오프라인 매장', '콘텐츠', '플랫폼', 'B2C', 'B2B', '구독', '광고', '수수료'];

export default function LandingScreen({ onStart, onTeacher, hasSaved }: { onStart: () => void; onTeacher?: () => void; hasSaved?: boolean }) {
  return (
    <div>
      <section className="bg-ink px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8b45a]">창업 수업용 경영 시뮬레이터</p>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight sm:text-5xl">
              우리 조의 아이디어,
              <br />
              현실에서 하기 전에 여기서 먼저.
            </h1>
            <p className="mt-4 text-lg text-white/80">망해도 괜찮은 3년. 그리고 배운 것만 남깁니다.</p>
            <p className="mt-3 max-w-xl text-white/65">
              아이디어를 입력하면 업종과 자본에 맞는 경영 이벤트가 이어집니다. 결정하고, 토론하고, 결과를 확인하세요.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={onStart} className="min-h-12 rounded-md bg-[#d8b45a] px-6 font-bold text-ink hover:bg-[#e4c371]">
                {hasSaved ? '새 회사 만들기' : '무료로 시작하기'}
              </button>
              {onTeacher ? (
                <button type="button" onClick={onTeacher} className="min-h-12 px-4 font-semibold text-white/80 underline hover:text-white">
                  교수자 취합 화면
                </button>
              ) : null}
              <a href="#how" className="inline-flex min-h-12 items-center rounded-md border border-white/40 px-6 font-semibold hover:bg-white/10">
                진행 방식 보기
              </a>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-white/15 bg-white/15 text-sm">
            {[
              ['현금', '1억원'],
              ['고객', '0명'],
              ['월 매출', '0원'],
              ['평판', '50'],
              ['월 고정비', '1,200만원'],
              ['팀', '3명'],
            ].map(([k, v]) => (
              <div key={k} className="bg-[#0f2547] p-4">
                <dt className="text-white/55">{k}</dt>
                <dd className="num mt-1 font-serif text-2xl font-bold">{v}</dd>
              </div>
            ))}
            <p className="col-span-2 bg-[#0f2547] px-4 py-2 text-xs text-white/45">예시 시작 화면 · 교육용 가정값</p>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">조언이 아니라, 직접 겪는 경영.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([tag, t, d]) => (
            <article key={t} className="border-t-[3px] border-ink bg-surface p-5">
              <span className="text-xs font-bold text-brass">{tag}</span>
              <h3 className="mt-1 text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="bg-surface px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-serif text-2xl font-bold sm:text-3xl">세 단계. 우리 아이디어. 진짜 답.</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map(([n, t, d]) => (
              <li key={n} className="border border-line p-5">
                <p className="num font-serif text-3xl font-bold text-brass">{n}</p>
                <h3 className="mt-2 text-lg font-bold">{t}</h3>
                <p className="mt-2 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">5개 업종, 우리 시나리오.</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <li key={c} className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold">
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-14 sm:px-6 md:grid-cols-2">
        {[
          ['교수자용', '수업 운영', ['조별 진행 현황 한눈에', '결정마다 토론 근거 확인', '수업용 6개 / 전체 15개 이벤트', '제출 코드로 취합 (CSV)']],
          ['학생·창업팀용', '실전 연습', ['내 아이디어로 시나리오 생성', '선택 전 결과 비공개', '파산·인력 부족까지 체험', '3년 학습 리포트']],
        ].map(([tag, t, items]) => (
          <article key={t as string} className="border border-line bg-surface p-6">
            <p className="text-xs font-bold text-brass">{tag as string}</p>
            <h3 className="mt-1 font-serif text-xl font-bold">{t as string}</h3>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-muted">
              {(items as string[]).map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="bg-ink px-4 py-14 text-center text-white sm:px-6">
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">아이디어를 시험해 볼 준비가 됐나요?</h2>
        <p className="mt-2 text-white/65">무료 · 설치 없음 · 로그인 없음 · 브라우저에 자동 저장</p>
        <button type="button" onClick={onStart} className="mt-6 min-h-12 rounded-md bg-[#d8b45a] px-8 font-bold text-ink hover:bg-[#e4c371]">
          {hasSaved ? '새 회사 만들기' : '무료로 시작하기'}
        </button>
        <p className="mt-8 text-xs text-white/40">교육용 가정 기반 시뮬레이션입니다. 실제 사업 성과를 예측하지 않습니다.</p>
      </section>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

const HOW: [string, string, string, boolean][] = [
  ['01', 'Describe Your Business', "Pick your business type, stage, and industry. Then tell us what you're building in your own words. The more context, the better the scenario.", false],
  ['02', 'AI Builds Your Scenario', 'Our AI analyzes your context and generates a realistic business scenario with decisions tailored to your situation. Not generic advice — scenarios built from your specific business, stage, and industry.', false],
  ['03', 'Make Real Decisions', 'Each round presents a decision that founders like you actually face. Hiring, pricing, fundraising, pivoting, marketing — the hard calls that make or break a business.', true],
  ['04', 'Get Your Strategic Report', 'After your run, you get a full report: KPI analysis, decision breakdown, what other founders did differently, and concrete next steps. Take it with you when you go build the real thing.', false],
];

type Kpi = { k: string; v: string; color: string; icon: string; pos: string; rot: number; delay: number };
const KPIS: Kpi[] = [
  { k: 'Cash', v: '$100K', color: '#34b765', icon: '$', pos: 'left-[6%] top-[22%]', rot: -2, delay: 0 },
  { k: 'Burn Rate', v: '$12K/mo', color: '#e5484d', icon: '▲', pos: 'left-[41%] top-[0%]', rot: 1.5, delay: 0.8 },
  { k: 'Customers', v: '0', color: '#4f7cf0', icon: '◎', pos: 'right-[4%] top-[18%]', rot: 2, delay: 1.4 },
  { k: 'Revenue', v: '$0', color: '#a15cf0', icon: '↗', pos: 'left-[1%] bottom-[4%]', rot: -1.5, delay: 0.4 },
  { k: 'Team', v: '3', color: '#2bb3d6', icon: '‹›', pos: 'left-[36%] bottom-[-4%]', rot: 1, delay: 1.1 },
  { k: 'Brand', v: '50', color: '#e8a33d', icon: '★', pos: 'right-[8%] bottom-[2%]', rot: -2, delay: 1.8 },
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

export default function LandingScreen({ onStart, hasSaved }: { onStart: () => void; hasSaved?: boolean }) {
  const cta = hasSaved ? 'New Company' : 'Get Started';
  const [how, setHow] = useState(false);
  useEffect(() => {
    if (!how) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setHow(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [how]);
  return (
    <div className="lp bg-white text-neutral-950">
      <style>{`
        .lp h1,.lp h2{font-family:var(--font-sans)}
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
            <button type="button" onClick={onStart} className="ml-1 min-h-10 rounded-full bg-neutral-950 px-5 font-semibold text-white hover:bg-neutral-800">Get Started</button>
          </div>
        </div>
      </nav>

      <section className="overflow-hidden px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="mx-auto inline-block rounded-full border border-black/10 px-3 py-1 text-xs font-semibold tracking-widest text-neutral-500">Startup Sandbox for Class</p>
        <h1 className="font-sans mx-auto mt-6 max-w-4xl text-5xl font-black leading-[1.1] tracking-[-0.04em] sm:text-7xl">
          Your startup idea?
          <br />
          <span className="text-neutral-400">Build it here first.</span>
        </h1>
        <p className="mt-8 text-xl font-medium text-neutral-600">Fail fast, fail free. Then go build the real thing.</p>
        <p className="mx-auto mt-3 max-w-xl text-neutral-400">Describe your business. AI builds your scenario. Make real decisions. Learn from thousands of founders who faced the same choices.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onStart} className="min-h-14 rounded-2xl bg-neutral-950 px-9 text-lg font-semibold text-white hover:bg-neutral-800">{cta} →</button>
          <button type="button" onClick={() => setHow(true)} className="inline-flex min-h-14 items-center gap-2 rounded-2xl border border-black/10 bg-white px-8 text-lg font-semibold hover:bg-neutral-50">▷ How It Works</button>
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
        <p className="mt-6 text-xs text-neutral-400">Sample metrics · educational assumptions</p>
      </section>

      <section className="bg-neutral-950 px-4 py-24 text-center text-white sm:px-6">
        <h2 className="font-sans text-3xl font-black tracking-[-0.03em] sm:text-5xl">Ready to test your idea?</h2>
        <p className="mt-3 text-white/55">Free to start. No download. No login.</p>
        <button type="button" onClick={onStart} className="mt-8 min-h-14 rounded-2xl bg-white px-10 text-lg font-semibold text-black hover:bg-neutral-200">{cta} →</button>
      </section>

      <footer className="border-t border-black/5 px-4 py-8 text-xs text-neutral-400 sm:px-6">
        <div className="mx-auto max-w-6xl">Startup Simulator · An educational simulation based on stated assumptions. It does not predict real business results.</div>
      </footer>

      {how ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8" onClick={() => setHow(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="how-h" onClick={(e) => e.stopPropagation()} className="relative my-4 w-full max-w-3xl rounded-3xl bg-white p-6 text-left shadow-2xl sm:p-10">
            <button type="button" onClick={() => setHow(false)} aria-label="Close" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full text-2xl text-neutral-500 hover:bg-neutral-100">×</button>
            <h2 id="how-h" className="font-sans text-3xl font-black tracking-[-0.03em] sm:text-4xl">4 Steps to Test Your Idea</h2>
            <p className="mt-2 text-neutral-500">From idea to strategic report in under 15 minutes.</p>
            <ol className="mt-8 space-y-6">
              {HOW.map(([n, t, d, extra]) => (
                <li key={n} className="flex gap-5">
                  <p className="num text-3xl font-black text-neutral-200">{n}</p>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold">{t}</h3>
                    <p className="mt-1 leading-relaxed text-neutral-600">{d}</p>
                    {n === '01' ? (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {['Startup', 'Local Business', 'Creator', 'E-commerce', 'Agency', 'Franchise'].map((c) => (
                          <li key={c} className="rounded-full border border-black/10 px-3 py-1 text-sm">{c}</li>
                        ))}
                      </ul>
                    ) : null}
                    {extra ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl bg-neutral-50 p-3 text-sm"><p className="text-xs font-bold text-neutral-400">Example</p>“Should I hire a senior dev at $150K or outsource to an agency?”</div>
                        <div className="rounded-xl bg-neutral-50 p-3 text-sm"><p className="text-xs font-bold text-neutral-400">Community data</p>“312 founders faced this. 58% hired in-house.”</div>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => { setHow(false); onStart(); }} className="mt-8 min-h-12 rounded-2xl bg-neutral-950 px-8 font-semibold text-white hover:bg-neutral-800">Get Started →</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

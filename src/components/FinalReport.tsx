'use client';

import type { Game } from '@/engine';
import SubmitPanel from './SubmitPanel';
import AdvisorPicker from './AdvisorPicker';
import { DISCLAIMER_LONG, generateReport, monthToLabel, reportToMarkdown } from '@/engine';
import TrendCharts from './TrendCharts';
import { Badge, Button, Callout, VERDICT_LABEL } from './ui';

const PART_LABEL = {
  finance: '재무',
  growth: '성장',
  quality: '제품 품질',
  team: '팀',
  reputation: '평판',
} as const;

export default function FinalReport({ game, onRestart }: { game: Game; onRestart: () => void }) {
  const report = generateReport(game);
  const bankrupt = game.status === 'bankrupt';

  const download = () => {
    const blob = new Blob([reportToMarkdown(game, report)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.setup.companyName}-학습보고서.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className="max-w-4xl space-y-8">
      <header>
        <p className="text-sm text-muted">최종 학습 보고서</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{report.headline}</h1>
      </header>

      {bankrupt ? (
        <Callout tone="danger" title="파산으로 끝난 게임입니다">
          종합 점수에는 파산 감점이 적용됐습니다. 어느 결정에서 현금 흐름이 꺾였는지 아래 전환점과 추이를 함께 보세요.
        </Callout>
      ) : null}

      <section aria-labelledby="score-h">
        <h2 id="score-h" className="mb-2 text-lg font-semibold">점수</h2>
        <div className="flex items-end gap-4">
          <p className="num text-5xl font-bold leading-none">{report.score.total}</p>
          <p className="pb-1 text-muted">/ 100 · 등급 <strong className="text-ink">{report.score.grade}</strong></p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
          {(Object.keys(PART_LABEL) as (keyof typeof PART_LABEL)[]).map((k) => (
            <div key={k}>
              <dt className="text-xs text-muted">{PART_LABEL[k]}</dt>
              <dd className="num font-semibold">{report.score.parts[k]}</dd>
              <div className="mt-1 h-1.5 rounded bg-line" aria-hidden="true">
                <div className="h-full rounded bg-accent" style={{ width: `${report.score.parts[k]}%` }} />
              </div>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="sum-h">
        <h2 id="sum-h" className="mb-2 text-lg font-semibold">결과 요약</h2>
        <ul className="list-disc space-y-1 pl-5">
          {report.summary.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="trend-h">
        <h2 id="trend-h" className="mb-2 text-lg font-semibold">3년 성과 추이</h2>
        <TrendCharts history={game.history} />
      </section>

      {report.turningPoints.length > 0 ? (
        <section aria-labelledby="tp-h">
          <h2 id="tp-h" className="mb-2 text-lg font-semibold">전환점이 된 결정</h2>
          <ul className="space-y-3">
            {report.turningPoints.map((t) => (
              <li key={t.kind} className="rounded-md border border-line bg-surface p-4">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge tone={t.kind === 'best' ? 'good' : 'warn'}>{t.kind === 'best' ? '가장 좋았던 결정' : '가장 아쉬웠던 결정'}</Badge>
                  <span className="text-muted">{monthToLabel(t.decision.month).replace(/ 시점$/, '')} 시점 · {VERDICT_LABEL[t.decision.verdict]}</span>
                </p>
                <p className="mt-1 font-semibold">{t.decision.eventTitle}</p>
                <p className="text-sm">선택: {t.decision.optionLabel}</p>
                <p className="mt-1 text-sm text-muted">{t.decision.outcomeText}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted">우리의 근거: {t.decision.rationale}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.reasons.length > 0 ? (
        <section aria-labelledby="cb-h">
          <h2 id="cb-h" className="mb-1 text-lg font-semibold">CB Insights 실패 요인으로 본 우리의 대응</h2>
          <p className="mb-2 text-sm text-muted">CB Insights가 정리한 스타트업 실패 사유 분류에 우리의 결정을 대응시킨 것입니다.</p>
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {report.reasons.map((r) => (
              <li key={r.reason} className="px-4 py-3">
                <p className="font-semibold">{r.label}</p>
                <p className="num text-sm text-muted">좋음 {r.strong} · 보통 {r.ok} · 아쉬움 {r.weak} — {r.titles.join(', ')}</p>
                <p className="mt-1 text-sm">{r.comment}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="disc-h">
        <h2 id="disc-h" className="mb-2 text-lg font-semibold">토론 기록</h2>
        <p className="text-sm">
          결정 {report.discussion.total}건 · 평균 근거 길이 <span className="num">{report.discussion.avgLength}</span>자 · 반대 의견 기록{' '}
          <span className="num">{report.discussion.withDissent}</span>건 — {report.discussion.shortLabel}
        </p>
      </section>

      <AdvisorPicker game={game} />

      <SubmitPanel game={game} />

      <section aria-labelledby="q-h">
        <h2 id="q-h" className="mb-2 text-lg font-semibold">수업에서 이어서 토론할 질문</h2>
        <ol className="list-decimal space-y-1 pl-5">
          {report.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </section>

      {report.endNotes.length > 0 ? (
        <Callout tone="info" title="해석할 때 유의할 점">
          <ul className="list-disc pl-5">
            {report.endNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Callout>
      ) : null}

      <p className="text-xs text-muted">{DISCLAIMER_LONG}</p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={download}>보고서 내려받기 (.md)</Button>
        <Button variant="secondary" onClick={() => window.print()}>인쇄 / PDF 저장</Button>
        <Button variant="danger" onClick={onRestart}>새 게임 시작</Button>
      </div>
    </article>
  );
}

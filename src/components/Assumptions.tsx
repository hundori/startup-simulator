import type { Basis } from '@/engine';

/** 접이식 "가정과 계산 근거" 안내. 각 단계 화면에서 공통으로 사용한다. */
export default function Assumptions({ basis }: { basis: Basis }) {
  return (
    <details className="group rounded-md border border-line bg-surface text-sm">
      <summary className="cursor-pointer select-none px-4 py-3 font-semibold marker:text-muted">
        📐 {basis.title} <span className="font-normal text-muted">(눌러서 보기)</span>
      </summary>
      <div className="border-t border-line px-4 py-3">
        <p className="mb-3 text-xs leading-relaxed text-muted">{basis.note}</p>
        <dl className="divide-y divide-line">
          {basis.rows.map((r) => (
            <div key={r.label} className="py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <dt className="font-medium">{r.label}</dt>
                <dd className="num font-semibold">{r.value}</dd>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{r.how}</p>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}

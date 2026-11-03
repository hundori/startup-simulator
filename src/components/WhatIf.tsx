'use client';

import { useState } from 'react';
import type { Game } from '@/engine';
import { alternativesFor, canCompare, compareAlternative, formatMoney } from '@/engine';

const money = (v: number) => formatMoney(v).replace('-', '−');
const sg = (v: number) => (v === 0 ? '0만원' : `${v > 0 ? '+' : '−'}${formatMoney(Math.abs(v))}`);

/** "다른 선택이었다면?" — 같은 선택 직전 상태에서 이후 기간만 다시 계산한다. 원래 기록은 바뀌지 않는다. */
export default function WhatIf({ game, index }: { game: Game; index: number }) {
  const d = game.decisions[index];
  const [alt, setAlt] = useState('');
  if (!d) return null;
  if (!canCompare(d)) {
    return (
      <details className="rounded-md border border-line bg-surface text-sm">
        <summary className="cursor-pointer px-4 py-3 font-semibold">다른 선택이었다면?</summary>
        <p className="border-t border-line px-4 py-3 text-muted">
          {d.trace ? '이 결정은 시간이 흐르지 않는 추가 결정이라 이후 기간을 비교할 수 없습니다.' : '이전 기록에는 선택 직전 상태가 저장돼 있지 않아 같은 조건으로 다시 계산할 수 없습니다. 임의의 결과는 만들지 않습니다.'}
        </p>
      </details>
    );
  }
  const options = alternativesFor(game, d).filter((o) => !o.isOriginal);
  const res = alt ? compareAlternative(game, index, alt) : null;
  return (
    <details className="rounded-md border border-line bg-surface text-sm">
      <summary className="cursor-pointer px-4 py-3 font-semibold">다른 선택이었다면? <span className="font-normal text-muted">(눌러서 보기)</span></summary>
      <div className="space-y-3 border-t border-line px-4 py-3">
        <p className="text-xs leading-relaxed text-muted">
          같은 선택 직전 상태에서 시작해, 이후 {d.trace!.period.months}개월을 같은 계산 규칙으로 다시 돌린 결과입니다. 시뮬레이션에 난수가 없어 외부 조건은 같습니다. 이 화면은 저장된 기록을 바꾸지 않습니다.
        </p>
        <label className="block">
          <span className="text-xs font-semibold text-muted">비교할 대안</span>
          <select className="mt-1 block min-h-11 w-full rounded-md border border-line bg-surface px-2" value={alt} onChange={(e) => setAlt(e.target.value)}>
            <option value="">대안을 고르세요</option>
            {options.map((o) => (
              <option key={o.id} value={o.id} disabled={!o.available}>
                {o.label}{o.available ? '' : ' (그 시점에는 고를 수 없음)'}
              </option>
            ))}
          </select>
        </label>
        {res && !res.ok ? <p role="alert" className="text-loss">{res.error}</p> : null}
        {res && res.ok ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[24rem]">
              <caption className="sr-only">실제 선택과 다른 선택의 비교</caption>
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="py-1 pr-2 font-semibold">항목</th>
                  <th scope="col" className="px-2 py-1 text-right font-semibold">실제 선택</th>
                  <th scope="col" className="py-1 pl-2 text-right font-semibold">다른 선택</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr><th scope="row" className="py-1.5 pr-2 text-left font-normal">선택</th><td className="px-2 py-1.5 text-right">{res.original.label}</td><td className="py-1.5 pl-2 text-right">{res.alternative.label}</td></tr>
                <tr><th scope="row" className="py-1.5 pr-2 text-left font-normal">일회성 지출</th><td className="num px-2 py-1.5 text-right">{money(res.original.oneTimeCost)}</td><td className="num py-1.5 pl-2 text-right">{money(res.alternative.oneTimeCost)}</td></tr>
                <tr><th scope="row" className="py-1.5 pr-2 text-left font-normal">월 고정비 변화(매달)</th><td className="num px-2 py-1.5 text-right">{sg(res.original.fixedDelta)}</td><td className="num py-1.5 pl-2 text-right">{sg(res.alternative.fixedDelta)}</td></tr>
                <tr><th scope="row" className="py-1.5 pr-2 text-left font-normal">기간 종료 현금</th><td className="num px-2 py-1.5 text-right">{money(res.original.end.cash)}</td><td className="num py-1.5 pl-2 text-right">{money(res.alternative.end.cash)}</td></tr>
                <tr><th scope="row" className="py-1.5 pr-2 text-left font-normal">기간 종료 월 이익</th><td className="num px-2 py-1.5 text-right">{sg(res.original.end.monthlyProfit)}</td><td className="num py-1.5 pl-2 text-right">{sg(res.alternative.end.monthlyProfit)}</td></tr>
                <tr><th scope="row" className="py-1.5 pr-2 text-left font-normal">기간 종료 고객 수</th><td className="num px-2 py-1.5 text-right">{Math.round(res.original.end.customers).toLocaleString('ko-KR')}명</td><td className="num py-1.5 pl-2 text-right">{Math.round(res.alternative.end.customers).toLocaleString('ko-KR')}명</td></tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">이 한 번의 선택만 바꾼 경우입니다. 이후 기간에는 새로운 결정이 없다고 보고 계산했습니다.</p>
          </div>
        ) : null}
      </div>
    </details>
  );
}

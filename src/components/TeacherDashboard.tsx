'use client';

import { Fragment, useState } from 'react';
import type { Submission } from '@/engine';
import { BUSINESS_TYPES, decodeSubmission, formatMoney, submissionsToCsv } from '@/engine';
import { Button, Callout } from './ui';

const KEY = 'startup-simulator:teacher:v1';

function load(): Submission[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Submission[]) : [];
  } catch {
    return [];
  }
}

export default function TeacherDashboard({ onBack }: { onBack: () => void }) {
  const [subs, setSubs] = useState<Submission[]>(load);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const save = (next: Submission[]) => {
    setSubs(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* 저장 실패해도 화면은 유지 */
    }
  };

  const add = () => {
    const lines = text.split(/\s+/).filter(Boolean);
    let ok = 0;
    let bad = 0;
    const map = new Map(subs.map((s) => [s.team, s]));
    for (const l of lines) {
      const s = decodeSubmission(l);
      if (!s) {
        bad++;
        continue;
      }
      const prev = map.get(s.team);
      if (!prev || prev.at <= s.at) map.set(s.team, s);
      ok++;
    }
    save([...map.values()].sort((a, b) => b.score - a.score));
    setText('');
    setMsg(`${ok}건 추가${bad ? `, ${bad}건은 올바른 코드가 아닙니다` : ''}. 같은 조 이름은 최신 제출로 바뀝니다.`);
  };

  const csv = async () => {
    const data = submissionsToCsv(subs);
    try {
      await navigator.clipboard.writeText(data);
      setMsg('CSV를 복사했습니다. 엑셀·구글시트에 붙여넣으세요.');
    } catch {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }));
      a.download = '조별-제출.csv';
      a.click();
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">교수자 취합</h1>
          <p className="mt-2 text-muted">조별 제출 코드를 붙여넣으면 진행 현황·점수·토론 근거를 한 화면에서 봅니다.</p>
        </div>
        <Button variant="secondary" onClick={onBack}>처음으로</Button>
      </header>

      <section className="border-t-[3px] border-ink bg-surface p-5">
        <label htmlFor="codes" className="text-sm font-semibold">제출 코드 붙여넣기 (여러 조는 줄바꿈으로 구분)</label>
        <textarea id="codes" value={text} onChange={(e) => setText(e.target.value)} className="num mt-2 block min-h-28 w-full rounded-md border border-line p-2 text-xs" placeholder="SS1.…" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={add} disabled={!text.trim()}>취합에 추가</Button>
          <Button variant="secondary" onClick={csv} disabled={subs.length === 0}>CSV 복사</Button>
          <Button variant="danger" onClick={() => { save([]); setMsg('목록을 비웠습니다.'); }} disabled={subs.length === 0}>목록 비우기</Button>
        </div>
        {msg ? <div className="mt-3"><Callout tone="info">{msg}</Callout></div> : null}
        <p className="mt-3 text-xs text-muted">이 목록은 지금 쓰는 브라우저에만 저장됩니다. 서버 취합(조 코드 자동 수집)은 다음 버전에서 Supabase로 연결할 수 있습니다.</p>
      </section>

      {subs.length === 0 ? (
        <p className="text-muted">아직 취합된 조가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border border-line bg-surface text-sm">
            <thead className="bg-accent-soft text-left">
              <tr>
                <th className="p-3">조</th><th className="p-3">업종</th><th className="p-3">진행</th><th className="p-3">점수</th><th className="p-3">상태</th><th className="p-3">현금</th><th className="p-3">고객</th><th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {subs.map((s) => (
                <Fragment key={s.team}>
                  <tr>
                    <td className="p-3 font-semibold">{s.team}</td>
                    <td className="p-3">{BUSINESS_TYPES[s.business as keyof typeof BUSINESS_TYPES]?.label ?? s.business}</td>
                    <td className="num p-3">{s.done}/{s.total}</td>
                    <td className="num p-3 font-bold">{s.score} ({s.grade})</td>
                    <td className="p-3">{s.status === 'bankrupt' ? '파산' : s.status === 'finished' ? '완료' : '진행 중'}</td>
                    <td className="num p-3">{formatMoney(s.cash)}</td>
                    <td className="num p-3">{s.customers.toLocaleString('ko-KR')}</td>
                    <td className="p-3"><button type="button" className="min-h-11 font-semibold text-accent underline" onClick={() => setOpen(open === s.team ? null : s.team)}>{open === s.team ? '접기' : '근거 보기'}</button></td>
                  </tr>
                  {open === s.team ? (
                    <tr>
                      <td colSpan={8} className="bg-paper p-4">
                        <p className="mb-2 text-muted">{s.idea}</p>
                        <ol className="space-y-3">
                          {s.decisions.map((d, i) => (
                            <li key={i}>
                              <p className="font-semibold">{d.t} → {d.o}</p>
                              <p className="mt-1">{d.r}</p>
                              {d.d ? <p className="mt-1 text-muted">반대 의견: {d.d}</p> : null}
                            </li>
                          ))}
                        </ol>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { BusinessType, CustomerType, GameMode, RevenueModel, SetupInput } from '@/engine';
import {
  BUSINESS_TYPES,
  CUSTOMER_TYPES,
  DISCLAIMER_LONG,
  REVENUE_MODELS,
  comboNote,
  formatMoney,
  validateSetup,
} from '@/engine';
import Choice from './Choice';
import { Button, Callout } from './ui';

const PRESETS = [3000, 5000, 10000, 20000, 30000];

const INPUT =
  'mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted/70 focus-visible:border-accent';

export default function SetupScreen({
  onStart,
  notice,
}: {
  onStart: (setup: SetupInput) => void;
  notice?: string | null;
}) {
  const [form, setForm] = useState<SetupInput>({
    companyName: '',
    idea: '',
    businessType: 'saas',
    customerType: 'b2c',
    targetCustomer: '',
    revenueModel: 'subscription',
    capital: 10000,
    members: 3,
    mode: 'class',
  });
  const [capitalText, setCapitalText] = useState('10000');
  const [errors, setErrors] = useState<string[]>([]);

  const set = <K extends keyof SetupInput>(key: K, value: SetupInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const note = comboNote(form);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateSetup(form);
    setErrors(errs);
    if (errs.length === 0) onStart(form);
  };

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold leading-tight">우리 조의 회사를 세워 보세요</h1>
        <p className="mt-3 text-muted">
          가상의 회사를 만들어 3년 동안 경영 이벤트를 겪습니다. 선택마다 결과가 바뀌고, 모든 결정에는 조 토론 근거를 남깁니다.
        </p>
      </header>

      {notice ? <Callout tone="warn">{notice}</Callout> : null}

      <section className="space-y-5">
        <h2 className="text-lg font-semibold">1. 회사와 아이디어</h2>
        <div>
          <label htmlFor="companyName" className="text-sm font-semibold">
            기업명
          </label>
          <input
            id="companyName"
            className={INPUT}
            value={form.companyName}
            maxLength={30}
            placeholder="예) 모아케어"
            onChange={(e) => set('companyName', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="idea" className="text-sm font-semibold">
            사업 아이디어 <span className="font-normal text-muted">(10자 이상, 기존에 구상한 아이디어를 활용하세요)</span>
          </label>
          <textarea
            id="idea"
            className={`${INPUT} min-h-24`}
            value={form.idea}
            maxLength={300}
            placeholder="예) 자취하는 대학생이 남는 식재료를 이웃과 나누고 소분 레시피를 받는 앱"
            onChange={(e) => set('idea', e.target.value)}
          />
          <p className="num mt-1 text-right text-xs text-muted">{form.idea.length} / 300</p>
        </div>
      </section>

      <fieldset className="space-y-2">
        <legend className="text-lg font-semibold">2. 업종</legend>
        <p className="text-sm text-muted">업종에 따라 단가, 원가, 고정비, 1인당 처리 고객 수가 달라집니다.</p>
        <div className="mt-3 space-y-2">
          {(Object.keys(BUSINESS_TYPES) as BusinessType[]).map((k) => (
            <Choice
              key={k}
              name="businessType"
              checked={form.businessType === k}
              onChange={() => set('businessType', k)}
              title={BUSINESS_TYPES[k].label}
            >
              <span className="block text-sm text-muted">
                {BUSINESS_TYPES[k].description} · {BUSINESS_TYPES[k].examples}
              </span>
            </Choice>
          ))}
        </div>
      </fieldset>

      <section className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="text-lg font-semibold">3. 대상 고객과 수익모델</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(Object.keys(CUSTOMER_TYPES) as CustomerType[]).map((k) => (
              <Choice
                key={k}
                name="customerType"
                checked={form.customerType === k}
                onChange={() => set('customerType', k)}
                title={CUSTOMER_TYPES[k].label}
              >
                <span className="block text-sm text-muted">{CUSTOMER_TYPES[k].description}</span>
              </Choice>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="targetCustomer" className="text-sm font-semibold">
            대상 고객 설명
          </label>
          <input
            id="targetCustomer"
            className={INPUT}
            value={form.targetCustomer}
            placeholder="예) 서울 소재 대학교에 다니는 자취생"
            onChange={(e) => set('targetCustomer', e.target.value)}
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">수익모델</legend>
          <div className="mt-2 space-y-2">
            {(Object.keys(REVENUE_MODELS) as RevenueModel[]).map((k) => (
              <Choice
                key={k}
                name="revenueModel"
                checked={form.revenueModel === k}
                onChange={() => set('revenueModel', k)}
                title={REVENUE_MODELS[k].label}
              >
                <span className="block text-sm text-muted">{REVENUE_MODELS[k].description}</span>
              </Choice>
            ))}
          </div>
        </fieldset>
        {note ? <Callout tone="info">{note}</Callout> : null}
      </section>

      <section className="space-y-5">
        <h2 className="text-lg font-semibold">4. 자본과 팀</h2>
        <div>
          <label htmlFor="capital" className="text-sm font-semibold">
            초기 자본 (만원)
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={form.capital === p}
                onClick={() => {
                  set('capital', p);
                  setCapitalText(String(p));
                }}
                className={`min-h-11 rounded-md border px-3 text-sm font-semibold ${
                  form.capital === p ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-accent/50'
                }`}
              >
                {formatMoney(p)}
              </button>
            ))}
          </div>
          <input
            id="capital"
            inputMode="numeric"
            className={`${INPUT} num`}
            value={capitalText}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, '');
              setCapitalText(digits);
              set('capital', digits === '' ? 0 : Number(digits));
            }}
          />
          <p className="num mt-1 text-xs text-muted">= {formatMoney(form.capital)} (1,000만원 ~ 10억원)</p>
        </div>
        <div>
          <label htmlFor="members" className="text-sm font-semibold">
            창업 멤버 수
          </label>
          <select
            id="members"
            className={INPUT}
            value={form.members}
            onChange={(e) => set('members', Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}명
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">멤버 수는 월 인건비와 처리할 수 있는 고객 수에 영향을 줍니다.</p>
        </div>
      </section>

      <fieldset className="space-y-2">
        <legend className="text-lg font-semibold">5. 진행 방식</legend>
        <div className="mt-3 space-y-2">
          {(
            [
              ['class', '수업용 · 연차당 2개, 총 6개 이벤트', '연차마다 5개 후보 중 우리 회사 상황에 맞는 2개가 나옵니다.'],
              ['full', '전체 · 연차당 5개, 총 15개 이벤트', '후보 이벤트를 모두 진행합니다. 시간이 더 걸립니다.'],
            ] as [GameMode, string, string][]
          ).map(([k, title, desc]) => (
            <Choice key={k} name="mode" checked={form.mode === k} onChange={() => set('mode', k)} title={title}>
              <span className="block text-sm text-muted">{desc}</span>
            </Choice>
          ))}
        </div>
        <p className="text-xs text-muted">시작한 뒤에는 바꿀 수 없습니다.</p>
      </fieldset>

      <Callout tone="info" title="교육용 가정 안내">
        {DISCLAIMER_LONG}
      </Callout>

      {errors.length > 0 ? (
        <Callout tone="danger" role="alert" title="입력을 확인해 주세요">
          <ul className="list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Callout>
      ) : null}

      <Button type="submit" className="w-full sm:w-auto">
        회사 설립하기
      </Button>
    </form>
  );
}

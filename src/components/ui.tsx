import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Stage, Verdict } from '@/engine';

export const STAGE_LABEL: Record<Stage, string> = {
  1: '1년 차 · 생존',
  2: '2년 차 · 성장',
  3: '3년 차 · 확장',
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  strong: '좋은 대응',
  ok: '보통의 대응',
  weak: '아쉬운 대응',
};

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-strong disabled:bg-line disabled:text-muted disabled:hover:bg-line',
  secondary:
    'border border-line bg-surface text-ink hover:bg-paper disabled:text-muted disabled:hover:bg-surface',
  ghost: 'text-muted hover:bg-line/50 hover:text-ink',
  danger: 'border border-loss/40 bg-surface text-loss hover:bg-loss-soft',
};

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed print:hidden ${VARIANT[variant]} ${className}`}
      {...props}
    />
  );
}

const TONE = {
  info: 'border-accent/30 bg-accent-soft text-ink',
  warn: 'border-warn/40 bg-warn-soft text-ink',
  danger: 'border-loss/40 bg-loss-soft text-ink',
  good: 'border-gain/40 bg-gain-soft text-ink',
} as const;

export function Callout({
  tone = 'info',
  title,
  children,
  role,
}: {
  tone?: keyof typeof TONE;
  title?: string;
  children: ReactNode;
  role?: 'status' | 'alert';
}) {
  return (
    <div role={role} className={`rounded-md border px-4 py-3 text-sm leading-relaxed ${TONE[tone]}`}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'warn' | 'danger' | 'good' | 'accent';
  children: ReactNode;
}) {
  const t = {
    neutral: 'bg-line/60 text-ink',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-loss-soft text-loss',
    good: 'bg-gain-soft text-gain',
    accent: 'bg-accent-soft text-accent-strong',
  }[tone];
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${t}`}>
      {children}
    </span>
  );
}

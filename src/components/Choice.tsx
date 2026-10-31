import type { ReactNode } from 'react';

/** 라디오 선택 행. 카드 대신 줄 단위 선택지로 보여 준다. */
export default function Choice({
  name,
  checked,
  disabled = false,
  onChange,
  title,
  children,
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  title: string;
  children?: ReactNode;
}) {
  return (
    <label
      className={`flex gap-3 rounded-md border p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
        disabled
          ? 'cursor-not-allowed border-line bg-paper text-muted'
          : checked
            ? 'cursor-pointer border-accent bg-accent-soft'
            : 'cursor-pointer border-line bg-surface hover:border-accent/50'
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-1.5 h-4 w-4 shrink-0 accent-accent"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{title}</span>
        {children}
      </span>
    </label>
  );
}

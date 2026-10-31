// 표시용 서식. 금액은 만원 단위 정수를 받는다.

export function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(Math.round(value));
  const eok = Math.floor(abs / 10000);
  const man = abs % 10000;
  if (eok > 0 && man > 0) return `${sign}${eok}억 ${man.toLocaleString('ko-KR')}만원`;
  if (eok > 0) return `${sign}${eok}억원`;
  return `${sign}${man.toLocaleString('ko-KR')}만원`;
}

export function formatSignedMoney(value: number): string {
  if (value === 0) return '변화 없음';
  return `${value > 0 ? '+' : ''}${formatMoney(value)}`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('ko-KR');
}

export function formatSigned(value: number, digits = 0): string {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return '변화 없음';
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('ko-KR')}`;
}

export function monthToLabel(month: number): string {
  const year = Math.min(3, Math.floor(Math.max(0, month - 1) / 12) + 1);
  const m = month === 0 ? 0 : ((month - 1) % 12) + 1;
  return month === 0 ? '창업 시점' : `${year}년 차 ${m}개월`;
}

/** 월 고정비 변동 표기: +250만원 / 변동 없음 / +200~250만원 */
export function formatFixedDelta(d: { min: number; max: number }): string {
  if (d.min === 0 && d.max === 0) return '변동 없음';
  if (d.min === d.max) return formatSignedMoney(d.max);
  const f = (v: number) => (v >= 0 ? `+${formatMoney(v)}` : `−${formatMoney(-v)}`);
  return `${f(d.min)} ~ ${f(d.max)}`;
}

import type { Cond, CondMetric } from '../types';

// 이벤트 데이터를 짧게 쓰기 위한 조건 빌더
export const gte = (metric: CondMetric, value: number): Cond => ({ metric, op: '>=', value });
export const lte = (metric: CondMetric, value: number): Cond => ({ metric, op: '<=', value });
export const gt = (metric: CondMetric, value: number): Cond => ({ metric, op: '>', value });
export const lt = (metric: CondMetric, value: number): Cond => ({ metric, op: '<', value });

// 재무 상태 판정(financialStatus)을 조건으로 쓰기 위한 묶음. 이벤트 서술·대안 노출·수업용 선정 점수가 같은 판정을 쓴다.
export const CRUNCH: Cond[] = [lte('finStatus', 0)];
export const DEFICIT: Cond[] = [gte('finStatus', 1), lte('finStatus', 1)];
export const SURPLUS: Cond[] = [gte('finStatus', 2)];
export const NOT_SURPLUS: Cond[] = [lte('finStatus', 1)];

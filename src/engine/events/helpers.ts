import type { Cond, CondMetric } from '../types';

// 이벤트 데이터를 짧게 쓰기 위한 조건 빌더
export const gte = (metric: CondMetric, value: number): Cond => ({ metric, op: '>=', value });
export const lte = (metric: CondMetric, value: number): Cond => ({ metric, op: '<=', value });
export const gt = (metric: CondMetric, value: number): Cond => ({ metric, op: '>', value });
export const lt = (metric: CondMetric, value: number): Cond => ({ metric, op: '<', value });

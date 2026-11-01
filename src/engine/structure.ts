// 누가 이용하고, 누가 공급하고, 누가 무엇에 대해 돈을 내는가. 가격·수익모델 이벤트와 화면 설명이 같은 정의를 쓴다.

import type { BusinessType, CustomerType, RevenueModel } from './types';

export interface RevenueStructure {
  user: string; // 서비스를 이용하는 쪽
  supplier: string | null; // 공급·입점하는 쪽(없으면 null)
  payer: string; // 실제로 돈을 내는 쪽
  billing: string; // 무엇에 대해 어떻게 내는가
  formula: string; // 매출을 설명하는 식
  promo: string; // 경쟁사가 내세우는 가격 공세의 형태
  limit: string; // 이 모델이 계산에 반영하지 못하는 것
}

export function revenueStructure(
  businessType: BusinessType,
  customerType: CustomerType,
  revenueModel: RevenueModel,
): RevenueStructure {
  const b2b = customerType === 'b2b';
  const userWord = b2b ? '기업 고객' : '이용자(소비자)';
  switch (revenueModel) {
    case 'commission':
      return {
        user: userWord,
        supplier: businessType === 'platform' ? '공급자(입점·등록 사업자)' : '판매·공급 파트너',
        payer: businessType === 'platform' ? '공급자(거래가 성사될 때 수수료를 냄)' : '거래 파트너(거래 성사 시 수수료를 냄)',
        billing: '거래 성사 건당 거래액 × 수수료율',
        formula: '이용자 1명의 월 수수료 매출 = 월 거래(예약) 건수 × 평균 거래액 × 수수료율',
        promo: '수수료 면제 프로모션',
        limit:
          '시뮬레이터는 위 식을 "고객 1명당 월 매출" 하나의 값으로 합쳐 계산합니다. 공급자 수, 거래 건수, 평균 거래액, 수수료율, 취소·환불·분쟁 비용은 따로 계산하지 않습니다.',
      };
    case 'ads':
      return {
        user: `${userWord}(무료 이용)`,
        supplier: null,
        payer: '광고주',
        billing: '노출·클릭 기준 광고 단가',
        formula: '이용자 1명의 월 광고 매출 = 월 노출 수 × 광고 단가',
        promo: '광고 크레딧 지급',
        limit: '광고주 수·노출 수·단가를 따로 계산하지 않고 고객당 월 매출 하나로 다룹니다.',
      };
    case 'sales':
      return {
        user: b2b ? '기업 고객' : '구매 고객',
        supplier: null,
        payer: b2b ? '구매 기업' : '구매 고객',
        billing: '구매 건당 판매가',
        formula: '고객 1명의 월 매출 = 월 구매 건수 × 평균 판매가',
        promo: '할인 쿠폰',
        limit: '재구매율·평균 판매가를 따로 계산하지 않고 고객당 월 매출 하나로 다룹니다.',
      };
    case 'service':
      return {
        user: b2b ? '의뢰 기업' : '의뢰 고객',
        supplier: null,
        payer: b2b ? '의뢰 기업' : '의뢰 고객',
        billing: '프로젝트·용역별 대금',
        formula: '고객 1명의 월 매출 = 월 진행 프로젝트 수 × 평균 용역비',
        promo: '무상 시범 진행',
        limit: '프로젝트 수·용역비를 따로 계산하지 않고 고객당 월 매출 하나로 다룹니다.',
      };
    default:
      return {
        user: b2b ? '구독 기업' : '구독 고객',
        supplier: null,
        payer: b2b ? '구독 기업' : '구독 고객',
        billing: '월 구독료(요금제별)',
        formula: '고객 1명의 월 매출 = 월 구독료',
        promo: '무료 체험',
        limit: '요금제별 가입 비율을 따로 계산하지 않고 고객당 월 매출 하나로 다룹니다.',
      };
  }
}

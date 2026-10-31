import type { Game } from './types';
import { generateReport } from './report';
import { computeRunway, projectedMonthlyProfit } from './rules';
import { formatMoney } from './format';

export type AdvisorId = 'jobs' | 'musk' | 'zuckerberg' | 'bezos';

export interface Advisor {
  id: AdvisorId;
  name: string;
  tagline: string;
}

export const ADVISORS: Advisor[] = [
  { id: 'jobs', name: '스티브 잡스', tagline: '집중과 단순함, 제품 완성도' },
  { id: 'musk', name: '일론 머스크', tagline: '첫 원리로 비용을 깎고 속도를 낸다' },
  { id: 'zuckerberg', name: '마크 주커버그', tagline: '빠르게 내놓고 지표로 고친다' },
  { id: 'bezos', name: '제프 베이조스', tagline: '고객 집착과 장기 현금 흐름' },
];

export const ADVISOR_DISCLAIMER =
  '공개된 경영 철학을 바탕으로 만든 교육용 관점 정리입니다. 본인의 실제 발언이나 평가가 아닙니다.';

export interface Advice {
  headline: string;
  paragraphs: string[];
  actions: string[];
}

function runwayText(game: Game): string {
  const r = computeRunway(game.sim);
  if (game.sim.cash <= 0) return '현금이 바닥난 상태';
  if (r === null) return '흑자 구조';
  return `런웨이 약 ${r.toFixed(1)}개월`;
}

/** 결과 데이터(점수·지표·결정 이력)로 고르는 규칙 기반 조언. 같은 게임이면 항상 같은 글이 나온다. */
export function adviceFor(game: Game, id: AdvisorId): Advice {
  const { sim, decisions } = game;
  const report = generateReport(game);
  const sc = report.score;
  const bankrupt = sc.bankrupt;
  const weak = decisions.filter((d) => d.verdict === 'weak').length;
  const strong = decisions.filter((d) => d.verdict === 'strong').length;
  const profit = projectedMonthlyProfit(sim);
  const runway = runwayText(game);
  const cash = formatMoney(sim.cash);
  const company = game.setup.companyName;
  const dissent = decisions.filter((d) => d.dissent.trim().length > 0).length;

  if (id === 'jobs') {
    const lowQ = sim.quality < 55;
    return {
      headline: bankrupt ? '제품이 사랑받기 전에 회사가 먼저 멈췄습니다' : lowQ ? '아직 "이거다" 싶은 제품이 아닙니다' : '제품의 기본기는 쌓였습니다',
      paragraphs: [
        `${company}의 최종 점수는 ${sc.total}점(${sc.grade})이고 제품 품질은 ${Math.round(sim.quality)}점입니다. 집중과 단순함을 중시하는 관점에서 가장 먼저 보는 것은 "무엇을 하지 않기로 했는가"입니다.`,
        weak >= 2
          ? `아쉬운 결정이 ${weak}건 있었습니다. 선택지가 늘어날수록 한 가지를 깊게 파지 못합니다. 고객이 가장 아끼는 기능 하나를 정하고 나머지는 과감히 접는 편이 낫습니다.`
          : `아쉬운 결정은 ${weak}건으로 많지 않았습니다. 다만 ${strong}건의 좋은 결정이 서로 같은 방향이었는지, 흩어진 개선이었는지 되짚어 보세요.`,
        lowQ
          ? '품질이 낮은 상태에서 마케팅과 채용으로 규모를 키우면 이탈만 빨라집니다. 고객 열 명이 진심으로 좋아하는 상태를 먼저 만드세요.'
          : '품질이 받쳐 주고 있으니, 기능을 더하기보다 사용 경험에서 거슬리는 단계를 하나씩 빼 보세요.',
      ],
      actions: ['핵심 기능 한 가지를 정하고 나머지 세 가지를 접는 안을 조별로 만들어 보기', '고객이 처음 쓰는 5분 동안 막히는 지점을 직접 관찰하기', '"하지 않을 일" 목록을 만들고 이유를 한 줄씩 적기'],
    };
  }

  if (id === 'musk') {
    const burning = profit < 0;
    return {
      headline: bankrupt ? '비용 구조를 바꾸기 전에 시간이 끝났습니다' : burning ? '속도는 냈지만 매달 돈이 새고 있습니다' : '비용을 눌러 수익 구조를 만들었습니다',
      paragraphs: [
        `${company}의 현금은 ${cash}, 상태는 ${runway}입니다. 첫 원리로 보는 관점은 "이 비용이 물리적·구조적으로 꼭 필요한가"를 처음부터 다시 묻습니다. 관행이라서 쓰는 돈은 가장 먼저 의심합니다.`,
        burning
          ? `월 손익은 ${formatMoney(profit)}입니다. 인건비·마케팅·고정비를 각각 절반으로 줄여도 사업이 돌아가는지 계산해 보세요. 못 돌아간다면 모델이 문제입니다.`
          : `월 손익은 흑자입니다. 이제는 안정에 머무르기보다 지금 속도의 두 배를 낼 수 있는 병목 하나를 찾아 집중 투자할 차례입니다.`,
        dissent === 0
          ? '반대 의견을 남긴 결정이 하나도 없었습니다. 빠른 결정일수록 "틀렸다면 어디가 틀렸을까"를 먼저 한 번 적어야 합니다.'
          : `반대 의견을 ${dissent}건 남겼습니다. 속도를 내되 가정을 의심하는 습관이 있는 팀입니다.`,
      ],
      actions: ['월 고정비 항목을 하나씩 "정말 필요한가"로 다시 검증하기', '3개월 안에 달성할 도전적인 수치 목표 하나를 정하고 매주 확인하기', '가장 느린 단계(병목)를 찾아 한 달 안에 반으로 줄일 방법 토론하기'],
    };
  }

  if (id === 'zuckerberg') {
    return {
      headline: bankrupt ? '충분히 빨리 배우지 못했습니다' : sim.customers > 0 ? '내놓고 고치는 사이클을 더 빠르게 돌릴 수 있습니다' : '아직 사용자가 없습니다. 먼저 내놓으세요',
      paragraphs: [
        `${company}의 종료 시점 고객은 ${Math.round(sim.customers).toLocaleString('ko-KR')}명, 평판은 ${Math.round(sim.reputation)}점입니다. 빠르게 내놓고 지표로 고치는 관점에서는 완벽한 계획보다 실제 사용 데이터를 먼저 봅니다.`,
        weak > strong
          ? `아쉬운 결정(${weak}건)이 좋은 결정(${strong}건)보다 많았습니다. 큰 결정을 오래 토론하기보다 작게 시험하고 결과를 보고 되돌릴 수 있게 설계했는지 확인해 보세요.`
          : `좋은 결정(${strong}건)이 아쉬운 결정(${weak}건)보다 많았습니다. 잘 된 결정에서 어떤 지표가 먼저 움직였는지 정리하면 다음에 재사용할 수 있습니다.`,
        '성장은 사용자가 사용자를 데려오는 구조가 있을 때 빨라집니다. 지금 우리 서비스에 추천·공유가 일어날 이유가 있는지 점검해 보세요.',
      ],
      actions: ['매주 볼 핵심 지표 3개를 정하고 팀 전체가 같은 숫자를 보게 하기', '다음 결정을 "2주 안에 시험하고 되돌릴 수 있는 형태"로 쪼개 보기', '기존 고객이 지인에게 권할 이유를 한 문장으로 만들기'],
    };
  }

  const longTerm = sim.reputation >= 55 && sim.quality >= 55;
  return {
    headline: bankrupt ? '고객보다 현금이 먼저 떨어졌습니다' : longTerm ? '고객 신뢰라는 장기 자산을 쌓았습니다' : '고객이 계속 남을 이유를 더 만들어야 합니다',
    paragraphs: [
      `${company}의 상태는 ${runway}, 평판 ${Math.round(sim.reputation)}점입니다. 고객에 집착하고 길게 보는 관점에서는 이번 분기 수익보다 고객이 5년 뒤에도 남아 있을 이유를 먼저 봅니다.`,
      bankrupt
        ? '아무리 좋은 장기 전략도 현금이 끊기면 실행할 수 없습니다. 되돌릴 수 있는 결정은 빠르게, 되돌릴 수 없는 결정(대규모 채용, 큰 투자)은 신중하게 나누어 다루세요.'
        : `현금 ${cash}을 어디에 쓰면 고객 경험이 가장 좋아지는지 기준으로 지출을 줄 세워 보세요. 고객에게 보이지 않는 비용은 아끼고 보이는 가치에는 아끼지 않는 편입니다.`,
      weak >= 2 ? `아쉬운 결정 ${weak}건의 공통점이 "고객이 아니라 우리 사정에서 출발했는가"인지 확인해 보세요.` : '결정 대부분이 고객 관점에서 출발했는지, 근거 기록에서 고객이 몇 번 등장하는지 세어 보세요.',
    ],
    actions: ['고객이 가장 불편해하는 점 한 가지를 정해 이번 분기에 없애기', '큰 결정마다 "되돌릴 수 있는가"를 먼저 분류해 근거에 적기', '고객 이탈 이유 5가지를 직접 인터뷰로 모아 우선순위 정하기'],
  };
}

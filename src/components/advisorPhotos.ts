import jobs from '@/assets/advisors/jobs.png';
import musk from '@/assets/advisors/musk.png';
import zuckerberg from '@/assets/advisors/zuckerberg.png';
import bezos from '@/assets/advisors/bezos.png';
import type { AdvisorId } from '@/engine';

// Next 빌드는 {src} 객체를, 단일 파일 번들(esbuild dataurl)은 문자열을 돌려준다.
const url = (m: unknown): string => (typeof m === 'string' ? m : (m as { src: string }).src);

/** 전문가 사진. 사진을 바꾸려면 src/assets/advisors/ 의 파일만 교체하면 된다. */
export const ADVISOR_PHOTOS: Record<AdvisorId, string> = {
  jobs: url(jobs),
  musk: url(musk),
  zuckerberg: url(zuckerberg),
  bezos: url(bezos),
};

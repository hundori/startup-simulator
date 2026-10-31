'use client';

import dynamic from 'next/dynamic';

// 저장된 게임은 브라우저에만 있으므로 서버 렌더링 없이 클라이언트에서만 그린다.
const GameApp = dynamic(() => import('./GameApp'), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-dvh place-items-center bg-paper text-sm text-muted" role="status">
      불러오는 중…
    </div>
  ),
});

export default function GameAppLoader() {
  return <GameApp />;
}
